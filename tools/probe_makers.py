"""Probe a list of Picrew maker ids: fetch the page, parse the devalue state,
and report size / part counts so we can decide what is worth mirroring.

Usage:  python tools/probe_makers.py 626197 2758034 ...
"""
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from urllib.request import Request, urlopen

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from devalue_parse import unflatten, strip_undef  # noqa: E402
import re

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".cache", "makers")
CACHE = os.path.abspath(CACHE)
os.makedirs(CACHE, exist_ok=True)


def _fetch_html(url: str, attempts: int = 6) -> str:
    """GET a URL, retrying on transient read errors (e.g. IncompleteRead)."""
    last = None
    for i in range(attempts):
        try:
            req = Request(url, headers={
                "User-Agent": UA,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            })
            with urlopen(req, timeout=45) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(1.0 + i)
    raise last or RuntimeError("fetch failed")


def fetch_state(mid: str):
    """Return the parsed picrew-image-maker-data blob for a maker id."""
    raw_path = os.path.join(CACHE, f"{mid}.json")
    if os.path.exists(raw_path) and os.path.getsize(raw_path) > 1000:
        try:
            return json.load(open(raw_path, encoding="utf-8"))
        except Exception:  # noqa: BLE001
            pass  # corrupt cache — fall through to re-fetch

    url = f"https://picrew.me/en/image_maker/{mid}/"
    html = _fetch_html(url)

    m = re.search(r'<script[^>]*type="application/json\+devalue"[^>]*>(.*?)</script>', html, re.S)
    if not m:
        raise RuntimeError("no devalue blob (page may be gated or removed)")
    state = strip_undef(unflatten(json.loads(m.group(1))))
    data = state.get("@inox-tools/request-nanostores", {}).get("picrew-image-maker-data")
    if not data:
        raise RuntimeError("no picrew-image-maker-data in state")
    json.dump(data, open(raw_path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    return data


def summarise(mid: str):
    try:
        d = fetch_state(mid)
    except Exception as e:  # noqa: BLE001
        return {"id": mid, "error": str(e)}

    cf, img, info = d["cf"], d["img"], d["info"]
    urls = set()
    for layers in img["lst"].values():
        for cols in layers.values():
            for o in cols.values():
                urls.add(o["url"])
    thumbs = set()
    for p in cf["pList"]:
        thumbs.add(p["thumbUrl"])
        for it in p["items"]:
            thumbs.add(it["thumbUrl"])

    return {
        "id": mid,
        "title": info["title"],
        "creator": info["creator_name"],
        "canvas": f'{cf["w"]}x{cf["h"]}',
        "parts": len(cf["pList"]),
        "items": sum(len(p["items"]) for p in cf["pList"]),
        "layers": len(urls),
        "thumbs": len(thumbs),
        "total_files": len(urls) + len(thumbs) + 1,
        "tags": [t["tag_name"] for t in info["tags"]][:6],
    }


if __name__ == "__main__":
    ids = sys.argv[1:]
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=6) as ex:
        rows = list(ex.map(summarise, ids))
    print(f"probed {len(rows)} makers in {time.time()-t0:.1f}s\n")
    ok = [r for r in rows if "error" not in r]
    bad = [r for r in rows if "error" in r]
    ok.sort(key=lambda r: -r["total_files"])
    print(f'{"id":<10}{"files":>7}{"parts":>7}{"items":>7}  {"canvas":<10}title')
    for r in ok:
        print(f'{r["id"]:<10}{r["total_files"]:>7}{r["parts"]:>7}{r["items"]:>7}  {r["canvas"]:<10}{r["title"][:44]}')
    print(f"\ntotal files across all: {sum(r['total_files'] for r in ok)}")
    for r in bad:
        print("FAIL", r["id"], r["error"])
    json.dump(rows, open(os.path.join(CACHE, "_probe.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
