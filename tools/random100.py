"""Simulate 'Random' x100 against the local manifest and build a contact sheet.
This validates that layer ordering + item/colour resolution reproduce the
original renderer."""
import json
import os
import random
import sys

from PIL import Image

ROOT = sys.argv[1]                       # app/public
MF = json.load(open(os.path.join(ROOT, "maker-manifest.json"), encoding="utf-8"))
OUT = sys.argv[2]
os.makedirs(OUT, exist_ok=True)

W, H = MF["canvas"]["w"], MF["canvas"]["h"]
parts = MF["parts"]                      # already sorted by z ascending
images = MF["images"]

random.seed(20260809)
cache = {}


def load(rel):
    if rel not in cache:
        cache[rel] = Image.open(os.path.join(ROOT, rel.lstrip("/"))).convert("RGBA")
    return cache[rel]


def roll():
    """Mirror Picrew's Random: pick an item (or none if removable) + a colour."""
    sel = {}
    for p in parts:
        choices = [it["id"] for it in p["items"]]
        if p["removable"]:
            choices = choices + [None]
        itm = random.choice(choices)
        col = random.choice(p["colors"])["id"] if p["colors"] else None
        sel[p["id"]] = (itm, col)
    return sel


def render(sel):
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for p in parts:                      # ascending z = painter's algorithm
        itm, col = sel[p["id"]]
        if itm is None:
            continue
        byl = images.get(str(itm), {}).get(str(p["layerId"]))
        if not byl:
            continue
        url = byl.get(str(col)) or next(iter(byl.values()))
        canvas.alpha_composite(load(url))
    return canvas


N = 100
COLS, THUMB = 10, 135
sheet = Image.new("RGBA", (COLS * THUMB, (N // COLS) * (THUMB * H // W)), (250, 250, 252, 255))
miss = 0
for i in range(N):
    sel = roll()
    im = render(sel)
    if im.getbbox() is None:
        miss += 1
    if i < 8:
        im.save(os.path.join(OUT, f"random_{i:02d}.png"))
    t = im.resize((THUMB, THUMB * H // W), Image.LANCZOS)
    sheet.alpha_composite(t, ((i % COLS) * THUMB, (i // COLS) * (THUMB * H // W)))

sheet.convert("RGB").save(os.path.join(OUT, "random100_contact_sheet.jpg"), quality=88)
print(f"rendered {N} randoms, empty={miss}, unique layer images touched={len(cache)}")
print("sheet ->", os.path.join(OUT, "random100_contact_sheet.jpg"))
