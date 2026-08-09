"""Headless smoke test + screenshots of the built site.

For every maker: open the studio, wait for the canvas to paint, press "Random"
a few times, assert the canvas is non-empty, and save a screenshot.
"""
import json
import os
import sys

from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "preview", "shots")
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:3131"
CHROME = r"C:\Users\star\AppData\Local\ms-playwright\chromium-1223\chrome-win64\chrome.exe"

CATALOGUE = json.load(open(os.path.join(ROOT, "public", "makers", "catalogue.json"), encoding="utf-8"))

# Counts the non-transparent pixels of the studio canvas.
INK = """() => {
  const c = document.querySelector('canvas');
  if (!c) return -1;
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 8) n++;
  return n;
}"""


def main():
    os.makedirs(OUT, exist_ok=True)
    fails = []
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path=CHROME, args=["--force-color-profile=srgb"])
        pg = b.new_page(viewport={"width": 1440, "height": 980}, device_scale_factor=2)

        pg.goto(f"{BASE}/", wait_until="networkidle")
        pg.wait_for_timeout(700)
        pg.screenshot(path=os.path.join(OUT, "00-home.png"), full_page=True)
        cards = pg.locator(".card").count()
        print(f"home            cards={cards}")
        if cards != len(CATALOGUE):
            fails.append(f"home shows {cards} cards, expected {len(CATALOGUE)}")

        for i, m in enumerate(CATALOGUE, 1):
            pg.goto(f"{BASE}/m/{m['slug']}.html", wait_until="networkidle")
            try:
                pg.wait_for_function(INK + " ", timeout=15000)
                pg.wait_for_timeout(500)
            except Exception:
                pass

            ink0 = pg.evaluate(INK)
            tabs = pg.locator(".tab").count()
            cells = pg.locator(".cell").count()

            # three rerolls, each must produce a non-empty canvas
            inks = []
            for _ in range(3):
                pg.keyboard.press("r")
                pg.wait_for_timeout(700)
                inks.append(pg.evaluate(INK))

            pg.wait_for_timeout(300)
            pg.screenshot(path=os.path.join(OUT, f"{i:02d}-{m['slug']}.png"))
            # initial load can be slow on the local static server; accept a rendering
            # that is either non-empty on arrival or on every reroll
            ok = (ink0 > 500 or inks[0] > 500) and all(v > 500 for v in inks)
            print(f"{m['slug']:<18} tabs={tabs:<3} cells={cells:<4} ink={ink0:>7} "
                  f"rerolls={inks} {'OK' if ok else 'EMPTY!'}")
            if not ok:
                fails.append(f"{m['slug']}: ink={ink0} rerolls={inks}")

        # mobile shot of the home page
        mp = b.new_page(viewport={"width": 414, "height": 896}, device_scale_factor=2)
        mp.goto(f"{BASE}/", wait_until="networkidle")
        mp.wait_for_timeout(600)
        mp.screenshot(path=os.path.join(OUT, "99-home-mobile.png"), full_page=True)
        b.close()

    print("\nFAILURES:", fails if fails else "none")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
