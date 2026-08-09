import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Vercel enforces a hard per-deployment file limit (Hobby ~16k). Our 29k+ WebP
 * part images would blow past it and cause the deploy to silently fall back to
 * the old scaffold build. The images are served from jsDelivr at runtime, so we
 * strip them from the static export here — keeping only the (tiny) JSON
 * manifests and code in the deployment artifact.
 *
 * WebP assets live at arbitrary depth under dist/makers/<id>/<...>.webp, so we
 * walk recursively, delete every .webp, then prune empty directories.
 */
// `output: 'export'` writes the static site to ./out (next.config has no
// distDir override). Clean whichever directory the export landed in.
import { existsSync } from 'node:fs';
const OUT_DIR = existsSync(path.join(process.cwd(), 'out'))
  ? path.join(process.cwd(), 'out')
  : path.join(process.cwd(), 'dist');
const MAKERS = path.join(OUT_DIR, 'makers');

async function walk(dir) {
  let removed = 0;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      removed += await walk(p);
      // prune empty dirs (but never the makers root or <id>.json siblings)
      const left = await fs.readdir(p);
      if (left.length === 0) await fs.rm(p, { recursive: true, force: true });
    } else if (e.isFile() && e.name.toLowerCase().endsWith('.webp')) {
      await fs.unlink(p);
      removed++;
    }
  }
  return removed;
}

async function main() {
  let removed = 0;
  try {
    removed = await walk(MAKERS);
  } catch (err) {
    console.warn('[clean-export] skipped (no dist/makers):', err.message);
    return;
  }
  console.log(`[clean-export] removed ${removed} webp assets from build output`);
}

main();
