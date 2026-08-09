"""HEAD-sample CDN assets for each cached maker to estimate mirror size."""
import json
import os
import random
import sys
from concurrent.futures import ThreadPoolExecutor
from urllib.request import Request, urlopen

CDN = "https://cdn.picrew.me"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
CACHE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".cache", "makers"))
SAMPLE = 14


def head(url):
    try:
        req = Request(CDN + url, method="HEAD", headers={"User-Agent": UA, "Referer": "https://picrew.me/"})
        with urlopen(req, timeout=25) as r:
            return int(r.headers.get("Content-Length") or 0)
    except Exception:
        return 0


def urls_of(d):
    layer, thumb = [], []
    for layers in d["img"]["lst"].values():
        for cols in layers.values():
            for o in cols.values():
                layer.append(o["url"])
    for p in d["cf"]["pList"]:
        thumb.append(p["thumbUrl"])
        for it in p["items"]:
            thumb.append(it["thumbUrl"])
    return layer, thumb


rows = []
grand = 0
for mid in sys.argv[1:]:
    path = os.path.join(CACHE, f"{mid}.json")
    if not os.path.exists(path):
        continue
    d = json.load(open(path, encoding="utf-8"))
    layer, thumb = urls_of(d)
    random.seed(7)
    ls = random.sample(layer, min(SAMPLE, len(layer)))
    ts = random.sample(thumb, min(SAMPLE, len(thumb)))
    with ThreadPoolExecutor(max_workers=14) as ex:
        lsz = [s for s in ex.map(head, ls) if s]
        tsz = [s for s in ex.map(head, ts) if s]
    la = sum(lsz) / max(1, len(lsz))
    ta = sum(tsz) / max(1, len(tsz))
    total = la * len(layer) + ta * len(thumb)
    grand += total
    rows.append((mid, d["info"]["title"][:34], len(layer), len(thumb), la / 1024, ta / 1024, total / 1e6))

rows.sort(key=lambda r: -r[6])
print(f'{"id":<10}{"layers":>7}{"thumbs":>7}{"L kB":>8}{"T kB":>7}{"est MB":>9}  title')
for r in rows:
    print(f"{r[0]:<10}{r[2]:>7}{r[3]:>7}{r[4]:>8.1f}{r[5]:>7.1f}{r[6]:>9.1f}  {r[1]}")
print(f"\nGRAND TOTAL ≈ {grand/1e6:.0f} MB")
