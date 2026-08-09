'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AvatarCanvas, { type AvatarCanvasHandle } from '@/app/components/AvatarCanvas';
import PartPanel from '@/app/components/PartPanel';
import Toolbar from '@/app/components/Toolbar';
import {
  applyRules,
  countCombinations,
  decodeSelection,
  encodeSelection,
  formatBig,
  getDefaultSelection,
  loadManifest,
  menuParts,
  randomPart,
  randomSelection,
  storageKey,
} from '@/app/lib/maker';
import { makerPath, SITE_NAME } from '@/app/lib/site';
import type { CatalogueEntry, MakerManifest, Selection } from '@/app/types';

const MAX_HISTORY = 60;

export default function MakerStudio({ entry, siblings }: { entry: CatalogueEntry; siblings: CatalogueEntry[] }) {
  const [maker, setMaker] = useState<MakerManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>({});
  const [activePartId, setActivePartId] = useState<number>(0);
  const [shared, setShared] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const past = useRef<Selection[]>([]);
  const future = useRef<Selection[]>([]);
  const [, bump] = useState(0);
  const canvasRef = useRef<AvatarCanvasHandle>(null);

  /* ---------------- load manifest, then restore share link / session ---------------- */
  useEffect(() => {
    let alive = true;
    setMaker(null);
    setError(null);
    past.current = [];
    future.current = [];

    loadManifest(entry.id)
      .then((m) => {
        if (!alive) return;
        let sel: Selection | null = null;
        const hash = window.location.hash;
        const roll = new URLSearchParams(window.location.search).get('roll');
        if (hash.startsWith('#c=')) sel = decodeSelection(m, hash.slice(3));
        if (!sel && roll) {
          sel = randomSelection(m);
          history.replaceState(null, '', window.location.pathname);
        }
        if (!sel) {
          try {
            const raw = localStorage.getItem(storageKey(entry.id));
            if (raw) sel = { ...getDefaultSelection(m), ...(JSON.parse(raw) as Selection) };
          } catch {
            /* ignore corrupt storage */
          }
        }
        setMaker(m);
        setSelection(sel ?? getDefaultSelection(m));
        setActivePartId(menuParts(m)[0]?.id ?? 0);
      })
      .catch((e: Error) => alive && setError(e.message));

    return () => {
      alive = false;
    };
  }, [entry.id]);

  useEffect(() => {
    if (!maker || !Object.keys(selection).length) return;
    try {
      localStorage.setItem(storageKey(entry.id), JSON.stringify(selection));
    } catch {
      /* private mode / quota — non fatal */
    }
  }, [selection, maker, entry.id]);

  const commit = useCallback((next: Selection | ((s: Selection) => Selection)) => {
    setSelection((prev) => {
      const value = typeof next === 'function' ? (next as (s: Selection) => Selection)(prev) : next;
      past.current = [...past.current, prev].slice(-MAX_HISTORY);
      future.current = [];
      bump((n) => n + 1);
      return value;
    });
  }, []);

  const handlePick = useCallback(
    (partId: number, itemId: number | null) => {
      if (!maker) return;
      commit((prev) => {
        const next: Selection = { ...prev, [partId]: { ...prev[partId], itemId } };
        // Honour the author's mutually-exclusive part groups.
        if (itemId != null) {
          for (const g of maker.ruleGroups ?? []) {
            if (!g.parts.includes(partId)) continue;
            for (const other of g.parts) {
              if (other !== partId && next[other]?.itemId != null) {
                next[other] = { ...next[other], itemId: null };
              }
            }
          }
        }
        return next;
      });
    },
    [commit, maker],
  );

  const handleColor = useCallback(
    (partId: number, colorId: number) => commit((prev) => ({ ...prev, [partId]: { ...prev[partId], colorId } })),
    [commit],
  );

  const handleRandomPart = useCallback(
    (partId: number) => {
      if (!maker) return;
      const p = maker.parts.find((x) => x.id === partId);
      if (!p) return;
      commit((prev) => applyRules(maker, { ...prev, [partId]: randomPart(p) }));
    },
    [commit, maker],
  );

  const handleRandom = useCallback(() => maker && commit(randomSelection(maker)), [commit, maker]);
  const handleReset = useCallback(() => maker && commit(getDefaultSelection(maker)), [commit, maker]);

  const handleUndo = useCallback(() => {
    if (!past.current.length) return;
    const prev = past.current[past.current.length - 1];
    past.current = past.current.slice(0, -1);
    setSelection((cur) => {
      future.current = [...future.current, cur];
      return prev;
    });
    bump((n) => n + 1);
  }, []);

  const handleRedo = useCallback(() => {
    if (!future.current.length) return;
    const next = future.current[future.current.length - 1];
    future.current = future.current.slice(0, -1);
    setSelection((cur) => {
      past.current = [...past.current, cur];
      return next;
    });
    bump((n) => n + 1);
  }, []);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1900);
  }, []);

  const handleDownload = useCallback(async () => {
    const blob = await canvasRef.current?.toBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entry.slug}-oc-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    flash('Saved as transparent PNG');
  }, [entry.slug, flash]);

  const handleShare = useCallback(async () => {
    if (!maker) return;
    const code = encodeSelection(maker, selection);
    history.replaceState(null, '', `#c=${code}`);
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      /* clipboard blocked — the address bar still carries the code */
    }
    setShared(true);
    window.setTimeout(() => setShared(false), 1900);
  }, [maker, selection]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA)$/.test(t.tagName)) return;
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if (!meta && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleRandom();
      } else if (!meta && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDownload();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleRedo, handleUndo, handleRandom, handleDownload]);

  const combos = useMemo(() => (maker ? formatBig(countCombinations(maker)) : '—'), [maker]);

  return (
    <main className="page">
      <header className="site-head">
        <div className="head-inner">
          <Link href="/" className="head-back" title="All makers">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <img className="head-icon" src={entry.icon} alt="" draggable={false} />
          <div className="head-text">
            <h1>{entry.name}</h1>
            <p>
              <strong>{entry.franchise}</strong> · art by {entry.creator} · {entry.parts} categories ·{' '}
              {entry.items} pieces · {combos} combos
            </p>
          </div>
          <a href="/" className="head-brand" aria-label={`${SITE_NAME} home`}>
            <svg viewBox="0 0 40 40" width="28" height="28" aria-hidden>
              <rect x="2" y="2" width="36" height="36" rx="9" fill="url(#brandG)" />
              <ellipse cx="14" cy="14" rx="5" ry="6" fill="#fff" />
              <ellipse cx="26" cy="14" rx="5" ry="6" fill="#fff" />
              <ellipse cx="14" cy="16" rx="2" ry="2.5" fill="#3a2654" />
              <ellipse cx="26" cy="16" rx="2" ry="2.5" fill="#3a2654" />
              <path d="M12 26a12 9 0 0 0 16 0" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
              <defs>
                <linearGradient id="brandG" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#ff7a96" />
                  <stop offset="1" stopColor="#7464ff" />
                </linearGradient>
              </defs>
            </svg>
            <span>{SITE_NAME}</span>
          </a>
        </div>
      </header>

      {error && (
        <div className="notice notice-bad">
          Could not load this maker: {error}. <Link href="/">Back to the gallery</Link>.
        </div>
      )}

      {!maker && !error && (
        <div className="workspace">
          <div className="stage-col">
            <div className="stage-card">
              <div className="canvas-frame" style={{ aspectRatio: `${entry.canvas.w} / ${entry.canvas.h}` }}>
                <div className="canvas-loading" aria-hidden />
              </div>
            </div>
          </div>
          <div className="panel panel-skeleton" aria-hidden />
        </div>
      )}

      {maker && (
        <div className="workspace">
          <div className="stage-col">
            <div className="stage-card">
              <AvatarCanvas ref={canvasRef} maker={maker} selection={selection} className="stage" />
            </div>
            <Toolbar
              onRandom={handleRandom}
              onReset={handleReset}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onDownload={handleDownload}
              onShare={handleShare}
              canUndo={past.current.length > 0}
              canRedo={future.current.length > 0}
              shared={shared}
            />
            <p className="hint">
              <kbd>R</kbd> reroll · <kbd>D</kbd> download · <kbd>Ctrl</kbd>+<kbd>Z</kbd> undo
            </p>
          </div>

          <PartPanel
            maker={maker}
            selection={selection}
            activePartId={activePartId}
            onActivePart={setActivePartId}
            onPick={handlePick}
            onColor={handleColor}
            onRandomPart={handleRandomPart}
          />
        </div>
      )}

      <nav className="switcher" aria-label="Other makers">
        <span className="switcher-label">Switch maker</span>
        <div className="switcher-rail">
          {siblings.map((s) => (
            <Link
              key={s.id}
              href={makerPath(s.slug)}
              className={`switcher-chip ${s.id === entry.id ? 'switcher-on' : ''}`}
              title={`${s.name} — ${s.franchise}`}
            >
              <img src={s.icon} alt="" loading="lazy" draggable={false} />
              <span>{s.franchise}</span>
            </Link>
          ))}
        </div>
      </nav>

      <footer className="site-foot">
        <span>
          Offline study mirror of Picrew maker #{entry.id} — <em>{entry.title}</em>. All artwork belongs to{' '}
          <strong>{entry.creator}</strong>; please support the original creators on picrew.me.
        </span>
      </footer>

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
