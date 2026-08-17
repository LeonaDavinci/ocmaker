"""
Generate the brand / social assets for www.ocmaker.site.

Outputs (all under public/):
  favicon.svg            hand-written, crisp at any size
  icon-32.png  icon-192.png  icon-512.png  apple-touch-icon.png
  site.webmanifest
  og.png                 1200x630 site-wide Open Graph card
  og/<slug>.png          1200x630 per-maker Open Graph card

Run:  python tools/build_brand.py
"""

from __future__ import annotations

import json
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, "public")
OG_DIR = os.path.join(PUB, "og")

DOMAIN = "ocmaker.site"
BRAND = "OC Maker"

INK = (35, 27, 48)
MUTED = (122, 112, 142)
PINK = (255, 107, 138)
VIOLET = (124, 107, 255)
PAPER = (250, 247, 253)

FONT_DIRS = [
    r"C:\Windows\Fonts",
    os.path.join(os.environ.get("LOCALAPPDATA", ""), "Microsoft", "Windows", "Fonts"),
]
FONT_STACK = {
    "black": ["Inter-Black.ttf", "seguibl.ttf", "arialbd.ttf", "segoeuib.ttf"],
    "bold": ["Inter-Bold.ttf", "segoeuib.ttf", "arialbd.ttf"],
    "semi": ["Inter-SemiBold.ttf", "seguisb.ttf", "segoeui.ttf", "arial.ttf"],
    "regular": ["Inter-Regular.ttf", "segoeui.ttf", "arial.ttf"],
}


def font(weight: str, size: int) -> ImageFont.FreeTypeFont:
    for name in FONT_STACK[weight]:
        for d in FONT_DIRS:
            p = os.path.join(d, name)
            if d and os.path.isfile(p):
                return ImageFont.truetype(p, size)
    return ImageFont.load_default(size)


# --------------------------------------------------------------------------- #
# painting helpers
# --------------------------------------------------------------------------- #
def blob(canvas: Image.Image, cx: int, cy: int, rx: int, ry: int, rgb, alpha: float) -> None:
    """Soft radial colour wash centred on (cx, cy)."""
    g = ImageOps.invert(Image.radial_gradient("L")).resize((rx * 2, ry * 2), Image.LANCZOS)
    g = g.point(lambda v: int(v * alpha))
    layer = Image.new("RGB", g.size, rgb)
    canvas.paste(layer, (cx - rx, cy - ry), g)


def linear_gradient(size, a, b):
    w, h = size
    grad = Image.new("RGB", (w, 1))
    px = grad.load()
    for x in range(w):
        t = x / max(1, w - 1)
        px[x, 0] = tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))
    return grad.resize(size, Image.BILINEAR)


def gradient_text(img: Image.Image, xy, text: str, fnt, a=PINK, b=VIOLET) -> int:
    """Draw `text` filled with a horizontal gradient. Returns its pixel width."""
    d = ImageDraw.Draw(img)
    w = int(d.textlength(text, font=fnt))
    h = fnt.size * 2
    mask = Image.new("L", (w + 8, h), 0)
    ImageDraw.Draw(mask).text((0, 0), text, font=fnt, fill=255)
    img.paste(linear_gradient(mask.size, a, b), xy, mask)
    return w


def rounded(im: Image.Image, radius_frac: float = 0.24) -> Image.Image:
    im = im.convert("RGBA")
    r = int(min(im.size) * radius_frac)
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, im.width - 1, im.height - 1], r, fill=255)
    mask = Image.composite(mask, Image.new("L", im.size, 0), im.split()[3])
    out = im.copy()
    out.putalpha(mask)
    return out


def with_shadow(im: Image.Image, blur: int = 26, dy: int = 14, alpha: int = 78) -> Image.Image:
    pad = blur * 2
    sh = Image.new("RGBA", (im.width + pad * 2, im.height + pad * 2 + dy), (0, 0, 0, 0))
    silhouette = Image.new("RGBA", im.size, (70, 45, 110, alpha))
    silhouette.putalpha(Image.eval(im.split()[3], lambda v: v * alpha // 255))
    sh.paste(silhouette, (pad, pad + dy), silhouette)
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    sh.alpha_composite(im, (pad, pad))
    return sh


def fit(text: str, fnt_weight: str, size: int, max_w: int, draw: ImageDraw.ImageDraw):
    """Shrink the font until `text` fits inside max_w."""
    while size > 20:
        f = font(fnt_weight, size)
        if draw.textlength(text, font=f) <= max_w:
            return f
        size -= 3
    return font(fnt_weight, 20)


# --------------------------------------------------------------------------- #
# app icon
# --------------------------------------------------------------------------- #
def make_icon(size: int) -> Image.Image:
    s = 512
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    body = linear_gradient((s, s), (255, 122, 150), (116, 100, 255)).convert("RGBA")
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, s - 1, s - 1], int(s * 0.235), fill=255)
    body.putalpha(mask)

    d = ImageDraw.Draw(body)
    # a friendly face: two eyes + a smile, the universal "make a character" glyph
    for cx in (int(s * 0.355), int(s * 0.645)):
        d.ellipse([cx - 42, int(s * 0.36) - 52, cx + 42, int(s * 0.36) + 52], fill=(255, 255, 255, 240))
        d.ellipse([cx - 17, int(s * 0.375) - 22, cx + 17, int(s * 0.375) + 22], fill=(58, 38, 84, 255))
    d.arc([int(s * 0.32), int(s * 0.52), int(s * 0.68), int(s * 0.80)], 18, 162,
          fill=(255, 255, 255, 240), width=30)
    im.alpha_composite(body)
    return im.resize((size, size), Image.LANCZOS)


FAVICON_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff7a96"/>
      <stop offset="1" stop-color="#7464ff"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="120" fill="url(#g)"/>
  <g fill="#fff">
    <ellipse cx="182" cy="184" rx="42" ry="52"/>
    <ellipse cx="330" cy="184" rx="42" ry="52"/>
  </g>
  <g fill="#3a2654">
    <ellipse cx="182" cy="192" rx="17" ry="22"/>
    <ellipse cx="330" cy="192" rx="17" ry="22"/>
  </g>
  <path d="M172 300a92 74 0 0 0 168 0" fill="none" stroke="#fff" stroke-width="30" stroke-linecap="round"/>
</svg>
"""

MANIFEST = {
    "name": "OC Maker — character creators for games, anime & IPs",
    "short_name": "OC Maker",
    "description": "Free browser-only OC makers for 20 fandoms. Nothing is uploaded.",
    "start_url": "/",
    "scope": "/",
    "display": "standalone",
    "background_color": "#f4f1f6",
    "theme_color": "#f4f1f6",
    "icons": [
        {"src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
        {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
        {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
    ],
}


# --------------------------------------------------------------------------- #
# Open Graph cards
# --------------------------------------------------------------------------- #
W, H = 1200, 630


def og_base() -> Image.Image:
    im = Image.new("RGB", (W, H), PAPER)
    blob(im, 150, 90, 560, 380, (255, 214, 228), 0.95)
    blob(im, 1090, 600, 620, 420, (214, 218, 255), 0.95)
    blob(im, 640, -60, 520, 300, (255, 236, 214), 0.55)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 9], fill=None)
    im.paste(linear_gradient((W, 9), PINK, VIOLET), (0, 0))
    return im


def draw_domain(im: Image.Image, y: int = 540) -> None:
    d = ImageDraw.Draw(im)
    f = font("bold", 27)
    d.text((72, y), DOMAIN, font=f, fill=VIOLET)


def site_card(cat) -> Image.Image:
    im = og_base()
    d = ImageDraw.Draw(im)

    d.text((72, 84), "FREE · BROWSER-ONLY · NO SIGN-UP", font=font("bold", 24), fill=MUTED)
    gradient_text(im, (70, 128), "OC Maker", font("black", 118))
    d.text((72, 276), "Build an original character", font=font("black", 54), fill=INK)
    d.text((72, 340), f"for {len(cat)} games, anime & IPs", font=font("black", 54), fill=INK)

    stats = f"{sum(m['parts'] for m in cat):,} categories   ·   {sum(m['items'] for m in cat):,} pieces   ·   transparent PNG export"
    d.text((72, 432), stats, font=font("semi", 26), fill=MUTED)
    draw_domain(im)

    # icon strip down the right edge
    picks = [m for m in cat if m.get("icon")][:6]
    x, y = 840, 96
    for i, m in enumerate(picks):
        p = os.path.join(PUB, m["icon"].lstrip("/"))
        if not os.path.isfile(p):
            continue
        tile = rounded(Image.open(p).convert("RGBA").resize((150, 150), Image.LANCZOS), 0.28)
        sh = with_shadow(tile, 18, 10, 70)
        col, row = i % 2, i // 2
        im.paste(sh, (x + col * 172 - 36, y + row * 172 - 26), sh)
    return im


def maker_card(m) -> Image.Image:
    im = og_base()
    d = ImageDraw.Draw(im)

    p = os.path.join(PUB, m["icon"].lstrip("/"))
    if os.path.isfile(p):
        tile = rounded(Image.open(p).convert("RGBA").resize((330, 330), Image.LANCZOS), 0.22)
        sh = with_shadow(tile, 30, 18, 82)
        im.paste(sh, (760 - 60, 150 - 42), sh)

    tx, maxw = 72, 620
    d.text((tx, 96), m["franchise"].upper(), font=font("bold", 27), fill=VIOLET)
    f_name = fit(m["name"], "black", 74, maxw, d)
    d.text((tx, 148), m["name"], font=f_name, fill=INK)

    # wrapped blurb
    words, line, lines = m["blurb"].split(), "", []
    fb = font("semi", 28)
    for w in words:
        t = (line + " " + w).strip()
        if d.textlength(t, font=fb) > maxw and line:
            lines.append(line)
            line = w
        else:
            line = t
        if len(lines) == 3:
            break
    if line and len(lines) < 3:
        lines.append(line)
    for i, ln in enumerate(lines):
        d.text((tx, 250 + i * 40), ln, font=fb, fill=MUTED)

    y = 250 + len(lines) * 40 + 34
    chips = [f"{m['parts']} categories", f"{m['items']:,} pieces", f"art by {m['creator']}"]
    cx = tx
    fc = font("bold", 23)
    for c in chips:
        w = int(d.textlength(c, font=fc)) + 34
        d.rounded_rectangle([cx, y, cx + w, y + 46], 23, fill=(255, 255, 255), outline=(232, 226, 242))
        d.text((cx + 17, y + 11), c, font=fc, fill=(96, 86, 118))
        cx += w + 12
        if cx > 640:
            break
    draw_domain(im)
    return im


# --------------------------------------------------------------------------- #
def main() -> None:
    os.makedirs(OG_DIR, exist_ok=True)
    cat = json.load(open(os.path.join(PUB, "makers", "catalogue.json"), encoding="utf-8"))

    open(os.path.join(PUB, "favicon.svg"), "w", encoding="utf-8").write(FAVICON_SVG)
    json.dump(MANIFEST, open(os.path.join(PUB, "site.webmanifest"), "w", encoding="utf-8"), indent=2)
    for size, name in ((32, "icon-32.png"), (192, "icon-192.png"), (512, "icon-512.png"),
                       (180, "apple-touch-icon.png")):
        make_icon(size).save(os.path.join(PUB, name))
    make_icon(48).save(os.path.join(PUB, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
    print("icons + manifest + favicon written")

    site_card(cat).save(os.path.join(PUB, "og.png"), optimize=True)
    print("og.png")
    for m in cat:
        maker_card(m).save(os.path.join(OG_DIR, f"{m['slug']}.png"), optimize=True)
        print(f"og/{m['slug']}.png")


if __name__ == "__main__":
    main()
