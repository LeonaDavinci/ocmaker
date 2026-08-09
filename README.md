# OC Maker

🌐 Live site: **https://www.ocmaker.site**

A fully client-side character-creator archive. Twelve popular OC (original character) makers —
games, animation, furry and tabletop franchises — rebuilt as a single static Next.js site.
Every layer is composited in the browser on a `<canvas>`; nothing is uploaded, nothing is
rendered server-side.

---

## What's inside

| Slug | Maker | Franchise |
| --- | --- | --- |
| `character-maker` | Character Maker | General |
| `pony-maker` | Pony Maker | My Little Pony |
| `warrior-cats` | Warrior Cats Cat Creator | Warriors |
| `sonic-maker` | Sonic Character Maker | Sonic the Hedgehog |
| `fursona-maker` | Fursona Maker | Furry |
| `murder-drones` | Murder Drones OC Maker | Murder Drones |
| `gorilla-tag` | Gorilla Tag PFP Maker | Gorilla Tag |
| `fantasy-character` | Fantasy Character Maker | Tabletop / Fantasy |
| `dandys-world` | Dandy's World OC Maker | Dandy's World |
| `hazbin-sona` | Hazbin-Sona Maker | Hazbin Hotel |
| `fnaf-oc` | FNAF OC Creator | Five Nights at Freddy's |
| `genshin-character` | Genshin Character Maker | Genshin Impact |

## Features

- **Per-maker studio** at `/m/<slug>` — category tabs, colour swatches, item grid.
- **Randomise / Shuffle** with rule-group awareness (mutually-exclusive parts never collide).
- **Undo / Redo** with full history, plus keyboard shortcuts (`R` reroll, `Ctrl+Z` / `Ctrl+Shift+Z`).
- **Share codes** — the whole selection is packed into the URL hash (`#c=…`), no backend needed.
- **PNG download** at native canvas resolution.
- **Autosave** per maker via `localStorage`.
- **SEO** — per-page canonical URLs, Open Graph cards, JSON-LD (`WebApplication` / `WebSite` /
  `ItemList`), generated `sitemap.xml` and `robots.txt`.

## Tech stack

- Next.js 15 (App Router) exported as a fully static site (`output: 'export'`)
- TypeScript + plain CSS (no runtime CSS framework)
- Canvas 2D compositor using the painter's algorithm, single-pass to avoid flicker
- Manifests lazy-loaded per maker (`/makers/<id>.json`) so the JS bundle stays small
- All artwork transcoded PNG → WebP (632 MB → 182 MB)

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export into dist/
```

Deploy `dist/` to any static host (Cloudflare Pages, Netlify, Vercel, S3 …).

### Clean URLs

`app/lib/site.ts` exposes `PAGE_EXT`. It currently defaults to `.html` so the build works on
static hosts without rewrite rules. If your host rewrites extensionless paths, set
`PAGE_EXT = ''` and flip `trailingSlash: true` in `next.config.js` for `/m/<slug>/` URLs.

## Asset pipeline

The `tools/` directory holds the mirroring pipeline (Python 3.13):

| Script | Purpose |
| --- | --- |
| `devalue_parse.py` | Decodes the `application/json+devalue` state blob into plain JSON |
| `probe_makers.py` | Fetches and caches maker state, reports part/item/layer counts |
| `size_estimate.py` | HEAD-samples the CDN to estimate mirror size before downloading |
| `build_maker.py` | Downloads every layer, transcodes to WebP, emits `public/makers/<id>.json` |
| `build_catalogue.py` | Merges curated metadata with manifests into `catalogue.json` |
| `build_brand.py` | Generates favicons, PWA icons and Open Graph cards |
| `shoot.py` | Headless smoke test — loads every studio and verifies the canvas renders |

`raw-assets/` (pristine PNGs) and `.cache/` are git-ignored; re-run `build_maker.py` to
regenerate them.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full data-model and rendering deep dive.

## Asset notice

All artwork belongs to the original Picrew creators credited in each studio footer. This
repository is a technical study of the layered-avatar rendering model. Do not redistribute
the artwork commercially or claim it as your own.
