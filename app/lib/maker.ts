import type {
  ColorDef,
  Item,
  MakerManifest,
  Part,
  PartSelection,
  Selection,
} from '@/app/types';

/* ------------------------------------------------------------------ *
 * Manifests are fetched at runtime (one per maker, 30 kB – 2 MB each) *
 * so a single page never ships the whole library in its JS bundle.    *
 * ------------------------------------------------------------------ */

/**
 * Asset CDN. The 29k+ WebP part images live in the GitHub repo and are served
 * through jsDelivr so they stay OUT of the Vercel deployment (Vercel enforces a
 * hard per-deploy file limit that the raw asset count would blow past). In dev
 * we keep serving them locally from /public for offline convenience.
 */
/* The default 20 makers' assets live in the main repo. A handful of large
 * makers are sharded into the separate ocmaker-media repo to stay under
 * jsDelivr's per-repo file ceiling. Route each maker's assets to its repo. */
const MAIN_REPO = 'LeonaDavinci/ocmaker';
const MEDIA_REPO = 'LeonaDavinci/ocmaker-media';
const MEDIA_MAKERS = new Set(['2141620', '94097']);

const repoFor = (id: string | null | undefined): string =>
  id && MEDIA_MAKERS.has(String(id)) ? MEDIA_REPO : MAIN_REPO;

const cdnBaseFor = (id: string | null | undefined): string =>
  process.env.NODE_ENV === 'production'
    ? `https://cdn.jsdelivr.net/gh/${repoFor(id)}@main/public`
    : '';

/** Active maker id, set while a manifest is being rewritten so nested asset
 *  URLs resolve to that maker's own asset repo. */
let _activeId: string | null = null;

/** Rewrite a /makers/... path to the CDN in production, or leave it local in dev. */
export const assetUrl = (u?: string | null, id?: string | null): string => {
  if (!u) return u ?? '';
  if (u.startsWith('/makers/')) return `${cdnBaseFor(id ?? _activeId)}${u}`;
  return u;
};

/** Recursively rewrite every /makers/... string inside a parsed manifest. */
function rewriteManifest<T>(node: T): T {
  if (typeof node === 'string') return assetUrl(node) as unknown as T;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) node[i] = rewriteManifest(node[i]);
    return node;
  }
  if (node && typeof node === 'object') {
    for (const k of Object.keys(node)) {
      (node as Record<string, unknown>)[k] = rewriteManifest(
        (node as Record<string, unknown>)[k],
      );
    }
    return node;
  }
  return node;
}

const cache = new Map<string, Promise<MakerManifest>>();

export function loadManifest(id: string): Promise<MakerManifest> {
  let p = cache.get(id);
  if (!p) {
    p = fetch(`/makers/${id}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`manifest ${id}: HTTP ${r.status}`);
        return (r.json() as Promise<MakerManifest>).then((m) => {
          _activeId = id;
          return rewriteManifest(m);
        });
      })
      .catch((e) => {
        cache.delete(id);
        throw e;
      });
    cache.set(id, p);
  }
  return p;
}

export const storageKey = (id: string | number) => `oc-studio:${id}`;

/** Menu order as the original author arranged it. */
export const menuParts = (m: MakerManifest): Part[] =>
  [...m.parts].sort((a, b) => a.order - b.order);

/** One draw call per (part, layer), bottom to top. */
export type DrawOp = { z: number; url: string };

export function drawOps(m: MakerManifest, sel: Selection): DrawOp[] {
  const ops: DrawOp[] = [];
  for (const part of m.parts) {
    const s = sel[part.id];
    if (!s || s.itemId == null) continue;
    const byLayer = m.images[String(s.itemId)];
    if (!byLayer) continue;
    for (const layer of part.layers) {
      const byColor = byLayer[String(layer.id)];
      if (!byColor) continue;
      const url = byColor[String(s.colorId)] ?? Object.values(byColor)[0];
      if (url) ops.push({ z: layer.z, url });
    }
  }
  ops.sort((a, b) => a.z - b.z);
  return ops;
}

export function getDefaultSelection(m: MakerManifest): Selection {
  const sel: Selection = {};
  for (const p of m.parts) {
    const def = m.defaults[String(p.id)];
    sel[p.id] = {
      itemId: def?.itmId ?? p.defaultItemId ?? p.items[0]?.id ?? null,
      colorId: def?.cId ?? p.colors[0]?.id ?? null,
    };
  }
  return sel;
}

/** Colour ids this specific item actually has artwork for. */
export function availableColorIds(m: MakerManifest, part: Part, itemId: number | null): Set<string> {
  const out = new Set<string>();
  if (itemId == null) return out;
  const byLayer = m.images[String(itemId)];
  if (!byLayer) return out;
  for (const layer of part.layers) {
    const byColor = byLayer[String(layer.id)];
    if (byColor) for (const k of Object.keys(byColor)) out.add(k);
  }
  return out;
}

/**
 * Tile artwork for the picker. Prefer the author's thumbnail; when they never
 * uploaded one, fall back to the item's own layer art in the active colour.
 */
export function itemPreview(
  m: MakerManifest,
  part: Part,
  item: Item,
  colorId: number | null,
): string | null {
  if (item.thumb) return item.thumb;
  const byLayer = m.images[String(item.id)];
  if (!byLayer) return null;
  for (const layer of [...part.layers].sort((a, b) => b.z - a.z)) {
    const byColor = byLayer[String(layer.id)];
    if (!byColor) continue;
    const url = byColor[String(colorId)] ?? Object.values(byColor)[0];
    if (url) return url;
  }
  return null;
}

export const getItem = (part: Part, itemId: number | null): Item | undefined =>
  part.items.find((i) => i.id === itemId);

export const getColor = (part: Part, colorId: number | null): ColorDef | undefined =>
  part.colors.find((c) => c.id === colorId);

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function randomPart(part: Part): PartSelection {
  // Optional parts get a modest chance of "none" rather than 1/(n+1),
  // otherwise heavily-populated accessory slots are almost never empty.
  const empty = part.removable && Math.random() < 0.3;
  return {
    itemId: empty || !part.items.length ? null : pick(part.items).id,
    colorId: part.colors.length ? pick(part.colors).id : null,
  };
}

/**
 * Some makers group mutually-exclusive parts (e.g. "Nose" / "Nose2").
 * Keep at most one populated so faces don't double up.
 */
export function applyRules(m: MakerManifest, sel: Selection): Selection {
  for (const group of m.ruleGroups ?? []) {
    const members = group.parts.filter((pid) => sel[pid]);
    const filled = members.filter((pid) => sel[pid].itemId != null);
    if (filled.length > 1) {
      const keep = pick(filled);
      for (const pid of filled) if (pid !== keep) sel[pid] = { ...sel[pid], itemId: null };
    }
  }
  return sel;
}

export function randomSelection(m: MakerManifest): Selection {
  const sel: Selection = {};
  for (const p of m.parts) sel[p.id] = randomPart(p);
  return applyRules(m, sel);
}

/** Compact share code: base64 of "partId.itemId.colorId" tuples. */
export function encodeSelection(m: MakerManifest, sel: Selection): string {
  const body = m.parts
    .map((p) => {
      const s = sel[p.id];
      return `${p.id}.${s?.itemId ?? ''}.${s?.colorId ?? ''}`;
    })
    .join('_');
  try {
    return btoa(body).replace(/=+$/, '');
  } catch {
    return '';
  }
}

export function decodeSelection(m: MakerManifest, code: string): Selection | null {
  try {
    const sel: Selection = {};
    for (const chunk of atob(code).split('_')) {
      const [pid, iid, cid] = chunk.split('.');
      const part = m.parts.find((p) => String(p.id) === pid);
      if (!part) continue;
      sel[part.id] = {
        itemId: iid === '' ? null : Number(iid),
        colorId: cid === '' ? null : Number(cid),
      };
    }
    return Object.keys(sel).length ? { ...getDefaultSelection(m), ...sel } : null;
  } catch {
    return null;
  }
}

export function countCombinations(m: MakerManifest): number {
  return m.parts.reduce((acc, p) => {
    const n = p.items.length + (p.removable ? 1 : 0);
    return acc * Math.max(1, n) * Math.max(1, p.colors.length);
  }, 1);
}

export function formatBig(n: number): string {
  if (!isFinite(n)) return '∞';
  if (n < 1e6) return n.toLocaleString('en-US');
  const exp = Math.floor(Math.log10(n));
  return `${(n / 10 ** exp).toFixed(1)}×10^${exp}`;
}
