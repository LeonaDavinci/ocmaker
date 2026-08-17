"""Mirror one or more Picrew makers.

For every maker id:
  1. read the cached devalue state (fetch it if missing)
  2. download every referenced PNG/JPG into  raw-assets/<id>/...      (pristine copy)
  3. transcode each file to WebP into        public/makers/<id>/...   (what the app serves)
  4. emit the normalised manifest            public/makers/<id>.json

Usage:  python tools/build_maker.py 626197 2758034 ...
"""
import io
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from threading import Lock
from urllib.request import Request, urlopen

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from probe_makers import fetch_state  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
# Pristine PNG cache. Defaults next to the repo; override with OCMAKER_RAW
# (e.g. when the system drive is low on space).
RAW = os.environ.get("OCMAKER_RAW", os.path.join(ROOT, "raw-assets"))
WEB = os.path.join(ROOT, "public", "makers")
CDN = "https://cdn.picrew.me"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
WEBP_Q = 86
WORKERS = 16

lock = Lock()
stats = {"got": 0, "cached": 0, "fail": 0, "bytes_png": 0, "bytes_webp": 0}


def tail(url: str) -> str:
    """/app/image_maker/<mid>/<partId>/<file>.png -> <partId>/<file>.png"""
    return "/".join(url.strip("/").split("/")[3:])


def transfer(args):
    mid, url = args
    rel = tail(url)
    raw_path = os.path.join(RAW, mid, rel)
    web_path = os.path.join(WEB, mid, os.path.splitext(rel)[0] + ".webp")

    if os.path.exists(web_path) and os.path.getsize(web_path) > 0:
        with lock:
            stats["cached"] += 1
        return

    blob = None
    if os.path.exists(raw_path) and os.path.getsize(raw_path) > 40:
        blob = open(raw_path, "rb").read()
    else:
        for attempt in range(4):
            try:
                req = Request(CDN + url, headers={
                    "User-Agent": UA,
                    "Accept": "image/avif,image/webp,image/png,*/*",
                    "Referer": "https://picrew.me/",
                })
                with urlopen(req, timeout=40) as r:
                    blob = r.read()
                if len(blob) < 40:
                    raise ValueError("suspiciously small")
                os.makedirs(os.path.dirname(raw_path), exist_ok=True)
                with open(raw_path, "wb") as f:
                    f.write(blob)
                break
            except Exception:
                blob = None
                if attempt < 3:
                    time.sleep(0.5 * (attempt + 1))

    if not blob:
        with lock:
            stats["fail"] += 1
        return

    try:
        im = Image.open(io.BytesIO(blob))
        im = im.convert("RGBA") if im.mode in ("RGBA", "LA", "P") else im.convert("RGB")
        buf = io.BytesIO()
        im.save(buf, "WEBP", quality=WEBP_Q, method=4)
        os.makedirs(os.path.dirname(web_path), exist_ok=True)
        with open(web_path, "wb") as f:
            f.write(buf.getvalue())
        with lock:
            stats["got"] += 1
            stats["bytes_png"] += len(blob)
            stats["bytes_webp"] += buf.tell()
    except Exception:
        with lock:
            stats["fail"] += 1


def build_manifest(mid: str, d: dict) -> dict:
    cf, img, info = d["cf"], d["img"], d["info"]
    palettes = cf.get("cpList") or {}
    layer_z = {str(k): v for k, v in (cf.get("lyrList") or {}).items()}

    def web(url):
        return f"/makers/{mid}/" + os.path.splitext(tail(url))[0] + ".webp"

    parts = []
    for order, p in enumerate(cf["pList"]):
        layers = [{"id": int(l), "z": layer_z.get(str(l), 0)} for l in p["lyrs"]]
        layers.sort(key=lambda x: x["z"])
        pal = palettes.get(str(p.get("cpId"))) or palettes.get(p.get("cpId")) or []
        parts.append({
            "id": p["pId"],
            "name": (p["pNm"] or f"Part {order + 1}").strip(),
            "order": order,
            "layers": layers,
            "z": layers[0]["z"] if layers else 0,
            "removable": bool(p.get("isRmv")),
            "colors": [{"id": c["cId"], "hex": c["cd"]} for c in pal],
            "defaultItemId": p.get("defItmId"),
            "thumb": web(p["thumbUrl"]) if p.get("thumbUrl") else None,
            "rules": p.get("rules") or [],
            "items": [
                {"id": it["itmId"], "thumb": web(it["thumbUrl"]) if it.get("thumbUrl") else None}
                for it in p["items"]
            ],
        })

    images = {}
    for itm, layers in img["lst"].items():
        for lid, cols in layers.items():
            for cid, o in cols.items():
                images.setdefault(str(itm), {}).setdefault(str(lid), {})[str(cid)] = web(o["url"])

    return {
        "id": int(info["id"]) if str(info["id"]).isdigit() else info["id"],
        "title": info["title"],
        "creator": info.get("creator_name") or "unknown",
        "canvas": {"w": cf["w"], "h": cf["h"]},
        "icon": web(info["icon_url"]),
        "tags": [t["tag_name"] for t in (info.get("tags") or [])],
        "ruleGroups": [
            {"id": int(k), "parts": v.get("list") or []}
            for k, v in (cf.get("ruleList") or {}).items()
        ],
        "parts": parts,
        "images": images,
        "defaults": cf.get("zeroConf") or {},
    }


def run(mid: str):
    d = fetch_state(mid)
    urls = set()
    for layers in d["img"]["lst"].values():
        for cols in layers.values():
            for o in cols.values():
                urls.add(o["url"])
    for p in d["cf"]["pList"]:
        if p.get("thumbUrl"):
            urls.add(p["thumbUrl"])
        for it in p["items"]:
            if it.get("thumbUrl"):
                urls.add(it["thumbUrl"])
    if d["info"].get("icon_url"):
        urls.add(d["info"]["icon_url"])

    before = dict(stats)
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        list(ex.map(transfer, [(mid, u) for u in sorted(urls)]))

    manifest = build_manifest(mid, d)
    os.makedirs(WEB, exist_ok=True)
    mf = os.path.join(WEB, f"{mid}.json")
    json.dump(manifest, open(mf, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

    got = stats["got"] - before["got"]
    cached = stats["cached"] - before["cached"]
    fail = stats["fail"] - before["fail"]
    mb = (stats["bytes_webp"] - before["bytes_webp"]) / 1e6
    print(f'{mid:<9} {manifest["title"][:36]:<38} files={len(urls):<6} new={got:<6} '
          f'cached={cached:<6} fail={fail:<4} webp={mb:6.1f}MB  manifest={os.path.getsize(mf)/1024:.0f}kB '
          f'({time.time()-t0:.0f}s)')
    return manifest


if __name__ == "__main__":
    for m in sys.argv[1:]:
        run(m)
    if stats["bytes_png"]:
        print(f'\nTOTAL png {stats["bytes_png"]/1e6:.0f}MB -> webp {stats["bytes_webp"]/1e6:.0f}MB '
              f'({stats["bytes_webp"]/stats["bytes_png"]*100:.0f}%), failures {stats["fail"]}')
