"""Download every asset referenced by the Picrew maker manifest, and emit a
normalised maker.json for the clone app."""
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from urllib.request import Request, urlopen

CDN = "https://cdn.picrew.me"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")

SRC = sys.argv[1]          # maker.json (raw from devalue)
OUT_DIR = sys.argv[2]      # e.g. app/public/assets

data = json.load(open(SRC, encoding="utf-8"))
cf, img, info = data["cf"], data["img"], data["info"]

urls = set()
for layers in img["lst"].values():
    for cols in layers.values():
        for o in cols.values():
            urls.add(o["url"])
for p in cf["pList"]:
    urls.add(p["thumbUrl"])
    for it in p["items"]:
        urls.add(it["thumbUrl"])
urls.add(info["icon_url"])
urls = sorted(urls)

os.makedirs(OUT_DIR, exist_ok=True)
done, failed = [], []


def local_path(url):
    # /app/image_maker/2744981/2854280/i_xxx.png -> <out>/2854280/i_xxx.png
    parts = url.strip("/").split("/")
    return os.path.join(OUT_DIR, *parts[3:])


def grab(url):
    dst = local_path(url)
    if os.path.exists(dst) and os.path.getsize(dst) > 0:
        done.append(url)
        return
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    for attempt in range(4):
        try:
            req = Request(CDN + url, headers={
                "User-Agent": UA,
                "Accept": "image/avif,image/webp,image/png,*/*",
                "Referer": "https://picrew.me/",
            })
            with urlopen(req, timeout=30) as r:
                blob = r.read()
            if len(blob) < 40:
                raise ValueError("suspiciously small")
            with open(dst, "wb") as f:
                f.write(blob)
            done.append(url)
            return
        except Exception as e:
            if attempt == 3:
                failed.append((url, str(e)))
            else:
                time.sleep(0.6 * (attempt + 1))


t0 = time.time()
with ThreadPoolExecutor(max_workers=12) as ex:
    list(ex.map(grab, urls))

print(f"downloaded {len(done)}/{len(urls)} in {time.time()-t0:.1f}s, failed {len(failed)}")
for u, e in failed[:15]:
    print("  FAIL", u, e)

# ---- emit normalised manifest for the app -------------------------------
def rel(url):
    return "/assets/" + "/".join(url.strip("/").split("/")[3:])


layer_z = {int(k): v for k, v in cf["lyrList"].items()}
palettes = {k: v for k, v in cf["cpList"].items()}

parts = []
for p in cf["pList"]:
    lyr = p["lyrs"][0]
    parts.append({
        "id": p["pId"],
        "name": p["pNm"],
        "layerId": lyr,
        "z": layer_z[lyr],
        "removable": bool(p["isRmv"]),
        "colors": [{"id": c["cId"], "hex": c["cd"]} for c in palettes.get(p["cpId"], [])],
        "defaultItemId": p["defItmId"],
        "thumb": rel(p["thumbUrl"]),
        "items": [{"id": it["itmId"], "thumb": rel(it["thumbUrl"])} for it in p["items"]],
    })
parts.sort(key=lambda x: x["z"])

images = {}
for itm, layers in img["lst"].items():
    for lid, cols in layers.items():
        for cid, o in cols.items():
            images.setdefault(str(itm), {}).setdefault(str(lid), {})[str(cid)] = rel(o["url"])

manifest = {
    "title": info["title"],
    "creator": info["creator_name"],
    "sourceId": info["id"],
    "canvas": {"w": cf["w"], "h": cf["h"]},
    "icon": rel(info["icon_url"]),
    "tags": [t["tag_name"] for t in info["tags"]],
    "parts": parts,
    "images": images,
    "defaults": cf["zeroConf"],
}
mf = os.path.join(os.path.dirname(OUT_DIR.rstrip("/\\")), "maker-manifest.json")
json.dump(manifest, open(mf, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("manifest ->", mf, os.path.getsize(mf), "bytes;", len(parts), "parts")
