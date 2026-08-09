# OC Maker — Architecture Deep Dive

A self-hosted, fully offline reimplementation of the Picrew character-maker player,
running **12 of the site's most-visited game / anime / IP makers** from one codebase.

Reference source: `https://picrew.me/en/image_maker/<makerId>/`

Live site: `https://www.ocmaker.site`

---

## 0. Domain & deployment configuration

All identity / URL settings live in `app/lib/site.ts`:

| Constant | Purpose |
|---|---|
| `SITE_URL` | Canonical origin, used by `metadataBase`, sitemap, Open Graph and JSON-LD. |
| `SITE_NAME` | Brand wordmark (`OC Maker`). |
| `SITE_TAGLINE` / `SITE_DESCRIPTION` | Default `<title>` suffix and home-page meta description. |
| `PAGE_EXT` | `.html` keeps URLs portable on every static host. If your host rewrites extensionless paths to `.html` (Cloudflare Pages, Netlify, Vercel, AWS S3 static website), set it to `''` and flip `trailingSlash: true` in `next.config.js` for clean `/m/<slug>/` URLs. |

Next.js generates `sitemap.xml`, `robots.txt`, Open Graph / Twitter cards, JSON-LD, and all icon / manifest links automatically from this single file.

---

## 1. The library

| Rank | Maker id | Franchise | Title (original) | Parts | Items | Colours | Images | Canvas |
|---:|---|---|---|---:|---:|---:|---:|---|
| 1 | `626197`  | Original                 | Character maker                | 35 | 541 | 189 | 2 602 | 600×600 |
| 2 | `2758034` | My Little Pony           | pony maker arina-nadzarova     | 33 | 339 | 328 | 4 105 | 600×600 |
| 3 | `254030`  | Warrior Cats             | felidaze's cat creator         | 42 | 357 | 487 | 3 580 | 600×600 |
| 4 | `1257436` | Sonic the Hedgehog       | Sonic Maker                    | 35 | 391 | 347 | 5 540 | 600×600 |
| 5 | `125168`  | Furry                    | Mrsquidgereen's Fursona Maker  | 22 | 243 | 144 | 1 674 | 600×600 |
| 6 | `2047846` | Murder Drones            | MurderDronesOCmaker            | 17 | 114 |  88 |   732 | 600×600 |
| 7 | `2243753` | Gorilla Tag              | Gorilla Tag PFP Maker          |  9 | 189 |   9 |   193 | 600×600 |
| 8 | `708151`  | D&D / Tabletop           | Fantasy Character Maker        | 20 | 473 | 129 | 1 800 | 600×600 |
| 9 | `2744981` | Dandy's World            | DANDY'S WORLD OC MAKER! (WIP)  | 16 | 134 |  90 |   399 | 540×960 |
| 10 | `2323700`| Hazbin Hotel             | Hazbin-Sona maker              | 12 | 144 |  30 |   366 | 600×600 |
| 11 | `1718994`| Five Nights at Freddy's  | fnaf oc creator (wip)          | 18 |  64 | 145 |   382 | 600×600 |
| 12 | `1472643`| Genshin Impact           | genshin character maker        | 39 | 411 | 316 | 4 250 | 600×600 |

**Totals — 298 part categories, 3 400 pieces, 25 623 rendered item-images, 28 908 files
mirrored (632 MB PNG → 182 MB WebP, 0 failures).**

---

## 2. Functional Architecture

### Home (`/`)
- Hero with library-wide counters (makers / categories / pieces / images).
- **Surprise me** → jumps to a random maker with a freshly rolled OC (`/m/<slug>/?roll=1`).
- Category chips (Games / Animation / Furry / Books / Tabletop / Original) + free-text search
  over name, franchise, original artist and Picrew tags.
- Card grid: icon, franchise, blurb, part/piece/combination counts.

### Studio (`/m/<slug>/`)
- Canvas sized from the maker's own `cf.w × cf.h` (540×960 for Dandy's World, 600×600 elsewhere).
- Category tab rail in the author's original menu order, each tab showing its thumbnail
  and a dot when the slot is currently empty.
- Colour swatch row per category; swatches the selected piece has no artwork for are dimmed.
- Item grid with a **None** tile for removable categories.
- Toolbar: Random all · Shuffle one category · Undo/Redo · Reset to author default ·
  Share link · Download transparent PNG.
- Keyboard: <kbd>R</kbd> reroll, <kbd>D</kbd> download, <kbd>Ctrl/⌘+Z</kbd> undo, <kbd>⇧</kbd> redo.
- Bottom rail switches between all 12 makers without going home.
- Per-maker autosave in `localStorage` (`oc-studio:<id>`).

### Behaviour parity with the original player

| Feature | Original | This implementation |
|---|---|---|
| Random | Random item per category, "none" allowed for removable slots, random palette colour | `randomSelection()`; removable slots empty 30 % of the time instead of `1/(n+1)` so accessory-heavy makers still look dressed |
| Mutually-exclusive parts | `cf.ruleList` groups (e.g. Sonic "Nose"/"Nose2") | `ruleGroups` + `applyRules()`; picking one clears its siblings |
| Multi-layer parts | One part can paint on several z-levels (hair front/back, pony mane ×13) | `part.layers[] = {id, z}`, one draw op per layer |
| Defaults | `cf.zeroConf` | `getDefaultSelection()` → `zeroConf` → `defItmId` → first item |
| Download | Canvas PNG | `canvas.toBlob('image/png')`, transparent background preserved |

---

## 3. Data Architecture

### Source format
Each maker page is an **Astro SSR** app. The whole maker definition ships inside a single
`<script type="application/json+devalue">` (`it-astro-state`) — a flattened reference graph.
`tools/devalue_parse.py` unflattens it back into ordinary JSON.

```
picrew-image-maker-data
├── info        title, creator_name, icon_url, tags[]
├── cf          configuration
│   ├── w / h               canvas px
│   ├── pList[]             part categories, in menu order
│   │   ├── pId, pNm        id, display name
│   │   ├── lyrs[]          layer ids this part paints on   ← may be > 1
│   │   ├── cpId            colour-palette id
│   │   ├── isRmv           removable → renders a "None" tile
│   │   ├── defItmId        default item
│   │   └── items[] { itmId, thumbUrl }
│   ├── cpList{}            cpId → [{ cId, cd }]   (cd = "#rrggbb")
│   ├── lyrList{}           layerId → z index
│   ├── zeroConf{}          partId → { itmId, cId }
│   └── ruleList{}          groups of mutually-exclusive parts
└── img
    └── lst{}               itemId → layerId → colorId → { url }
```

### Normalised manifest (`public/makers/<id>.json`)

```jsonc
{
  "id": 1257436,
  "title": "Sonic Maker",
  "creator": "…",
  "canvas": { "w": 600, "h": 600 },
  "icon": "/makers/1257436/icon.webp",
  "tags": ["sonic", "oc"],
  "ruleGroups": [ { "id": 1, "parts": [12, 13] } ],
  "parts": [
    {
      "id": 12, "name": "Nose", "order": 4,
      "layers": [ { "id": 40, "z": 12 }, { "id": 41, "z": 31 } ],
      "removable": true, "defaultItemId": 901, "thumb": "/makers/…/p_12.webp",
      "colors": [ { "id": 1, "hex": "#2b2b2b" } ],
      "items":  [ { "id": 901, "thumb": "/makers/…/ii_901.webp" } ]
    }
  ],
  "images":   { "901": { "40": { "1": "/makers/…/901_40_1.webp" } } },
  "defaults": { "12": { "itmId": 901, "cId": 1 } }
}
```

Manifests range **37 kB → 383 kB** and are **fetched lazily at runtime**, so no page ever
ships the whole 2.3 MB library in its JS bundle. `public/makers/catalogue.json` (7 kB) is the
only data compiled into the build — it feeds the home grid, static params and metadata.

### Asset pipeline
```
picrew.me maker page
   │  tools/probe_makers.py     → .cache/makers/<id>.json     (devalue state, cached)
   ▼
tools/build_maker.py
   ├─ download every URL        → raw-assets/<id>/…           (pristine PNG, 632 MB)
   ├─ transcode (Pillow, q=86)  → public/makers/<id>/….webp   (182 MB, 29 %)
   └─ emit manifest             → public/makers/<id>.json
   ▼
tools/build_catalogue.py        → public/makers/catalogue.json
```
16 worker threads, 4 retries with backoff, resumable (existing `.webp` files are skipped).

---

## 4. Technical Architecture

### Stack
- **Next.js 15** App Router, `output: 'export'` → pure static hosting, no server at runtime.
- **TypeScript** end-to-end; manifest shape declared in `app/types.ts`.
- Hand-written CSS (`globals.css` studio + `gallery.css` home), Tailwind preflight only.
- **HTML5 canvas** compositor — no WebGL, no third-party render lib.

### Routing
| Route | Kind | Notes |
|---|---|---|
| `/` | static | `Gallery` client component over `catalogue.json` |
| `/m/[slug]/` | static, 12 pages | `generateStaticParams()` from the catalogue; per-maker `<title>`/description |

### Rendering pipeline
```
selection: { partId: { itemId, colorId } }
   │
   ▼  drawOps(manifest, selection)
for each part → for each layer of that part
    url = images[itemId][layerId][colorId]  (fallback: first colour that exists)
    push { z: lyrList[layerId], url }
   │
   ▼  sort by z ascending
preload all images in parallel (Promise.all)
clear canvas → drawImage each, bottom → top, in ONE pass  ← avoids flicker
```
Single-pass compositing matters: makers like the pony maker have 13 multi-layer parts,
so a naive per-part redraw would tear on every click.

### Share codes
`btoa("partId.itemId.colorId_…")` stored in the URL hash (`#c=`). Copy-to-clipboard on
Share; decoded on load and merged over the author defaults, so a code from an older
manifest revision still opens.

### Performance
- Only the ~20–40 images of the current selection are fetched per maker.
- WebP at q=86 → the heaviest maker (Sonic, 5 540 images) is 20.6 MB total on disk.
- Item tiles use `loading="lazy"`; tabs and grids are separately scrollable.
- Canvas backing store is the maker's native resolution; CSS scales to fit.
- Items whose author never uploaded a thumbnail fall back to their own top-layer artwork
  (`itemPreview()`), so no picker cell is ever a blank placeholder.

---

## 5. Validation

- `tools/random100.py` renders 100 random composites offline into a contact sheet
  (`preview/random100_contact_sheet.jpg`) — zero empty renders confirms layer ordering
  and item→layer→colour resolution.
- Mirror integrity: **28 908 / 28 908 files** downloaded, 0 failures.
- Every manifest re-validated after the build: part counts, layer z-maps, palette ids and
  image lookup keys all resolve.

---

## 6. Files of note

| Path | Purpose |
|---|---|
| `tools/devalue_parse.py` | Unflattens Astro's devalue blob. |
| `tools/probe_makers.py` | Fetches + caches a maker's state; prints part/item stats. |
| `tools/build_maker.py` | Mirrors a maker: download → WebP → manifest. |
| `tools/build_catalogue.py` | Curated metadata × manifests → `catalogue.json`. |
| `tools/size_estimate.py` | HEAD-samples the CDN to budget a mirror before running it. |
| `app/types.ts` | Manifest / catalogue type declarations. |
| `app/lib/maker.ts` | Lazy manifest loader, draw ops, defaults, RNG, rules, share codec. |
| `app/lib/catalogue.ts` | Build-time catalogue import + slug lookup. |
| `app/components/Gallery.tsx` | Home: hero, filters, search, card grid. |
| `app/components/MakerStudio.tsx` | Studio shell: load, history, shortcuts, share, switcher. |
| `app/components/AvatarCanvas.tsx` | Single-pass canvas compositor + PNG export. |
| `app/components/PartPanel.tsx` | Category tabs, swatches, item grid. |
| `app/components/Toolbar.tsx` | Random / Undo / Redo / Reset / Share / Download. |
| `app/m/[slug]/page.tsx` | Static route per maker. |

---

## 7. Legal / Asset Notice

All artwork, character designs and asset files belong to their original Picrew authors
(credited by name in every studio footer and in `catalogue.json`) and to Picrew Inc.
This project is a local engineering reproduction for architectural study of the player.
To publish a derivative work, replace `public/makers/` with your own art — the manifest
schema and the rest of the code are art-agnostic.
