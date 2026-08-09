"""Merge curated metadata with every mirrored manifest into public/makers/catalogue.json."""
import json
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
WEB = os.path.join(ROOT, "public", "makers")

# id -> curated presentation metadata. `rank` mirrors the observed search traffic
# ordering; `franchise` / `category` drive the home-page filters.
CURATED = [
    ("626197",  "character-maker",  "Character Maker",        "Original",            "General",   9700,
     "The most-visited maker on the site — a deep, versatile anime-style face and outfit kit."),
    ("2758034", "pony-maker",       "Pony Maker",             "My Little Pony",      "Animation", 6900,
     "Full pony builder: body, mane, horn, wings, cutie-mark accessories and crystal coats."),
    ("254030",  "warrior-cats",     "Cat Creator",            "Warrior Cats",        "Books",     5300,
     "Warrior-cat clan generator with pelts, markings, scars, flora and expression layers."),
    ("1257436", "sonic-maker",      "Sonic Maker",            "Sonic the Hedgehog",  "Games",     4800,
     "Build a hedgehog, echidna or fox: quills, muzzle, gloves, shoes and full colour control."),
    ("125168",  "fursona-maker",    "Fursona Maker",          "Furry",               "Furry",     4600,
     "Clean fursona portrait kit — snouts, ears, fluff, markings and a large palette set."),
    ("2047846", "murder-drones",    "Murder Drones OC Maker", "Murder Drones",       "Animation", 4000,
     "Worker and disassembly drone builder with visor expressions, plating and outerwear."),
    ("2243753", "gorilla-tag-pfp",  "Gorilla Tag PFP Maker",  "Gorilla Tag",         "Games",     3800,
     "Blocky VR-monke profile picture generator — hats, faces, badges and holdables."),
    ("708151",  "fantasy-maker",    "Fantasy Character Maker", "D&D / Tabletop",     "Tabletop",  3000,
     "Tabletop portrait kit: horns, ears, bangs, layered clothing, hats and adventuring gear."),
    ("2323700", "hazbin-sona",      "Hazbin-Sona Maker",      "Hazbin Hotel",        "Animation", 1900,
     "Hell-born OC builder with horns, tails, sharp grins and back-layer hair."),
    ("1718994", "fnaf-oc",          "FNAF OC Creator",        "Five Nights at Freddy's", "Games", 1400,
     "Animatronic character kit — muzzles, endoskeleton eyes, ears and stage costumes."),
    ("1472643", "genshin-maker",    "Genshin Character Maker", "Genshin Impact",     "Games",     1000,
     "Teyvat-styled portrait maker: beast ears, horns, layered robes, scarves and hats."),
    ("2744981", "dandys-world",     "Dandy's World OC Maker", "Dandy's World",       "Games",     2500,
     "Full-body toon builder for the Roblox horror hit — the maker this project started from."),
]


def main():
    out = []
    for mid, slug, name, franchise, category, rank, blurb in CURATED:
        path = os.path.join(WEB, f"{mid}.json")
        if not os.path.exists(path):
            print("skip (not mirrored yet):", mid, name)
            continue
        m = json.load(open(path, encoding="utf-8"))
        items = sum(len(p["items"]) for p in m["parts"])
        colours = sum(len(p["colors"]) for p in m["parts"])
        n_img = sum(
            len(by_color)
            for by_layer in m["images"].values()
            for by_color in by_layer.values()
        )
        combos = 1.0
        for p in m["parts"]:
            n = len(p["items"]) + (1 if p["removable"] else 0)
            combos *= max(1, n) * max(1, len(p["colors"]))
            combos = min(combos, 1e300)
        out.append({
            "id": mid,
            "slug": slug,
            "name": name,
            "franchise": franchise,
            "category": category,
            "rank": rank,
            "blurb": blurb,
            "title": m["title"],
            "creator": m["creator"],
            "icon": m["icon"],
            "canvas": m["canvas"],
            "tags": m["tags"][:8],
            "parts": len(m["parts"]),
            "items": items,
            "colors": colours,
            "images": n_img,
            "combinations": combos,
            "manifestKB": round(os.path.getsize(path) / 1024),
        })

    out.sort(key=lambda r: -r["rank"])
    dst = os.path.join(WEB, "catalogue.json")
    json.dump(out, open(dst, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"catalogue -> {dst}  ({len(out)} makers)")
    print(f'{"id":<10}{"parts":>6}{"items":>7}{"colors":>8}{"imgs":>7}  name')
    for r in out:
        print(f'{r["id"]:<10}{r["parts"]:>6}{r["items"]:>7}{r["colors"]:>8}{r["images"]:>7}  {r["name"]} · {r["franchise"]}')
    print("totals:", sum(r["items"] for r in out), "items,", sum(r["images"] for r in out), "item-image entries")


if __name__ == "__main__":
    main()
