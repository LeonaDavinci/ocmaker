'use client';

import { useMemo } from 'react';
import { availableColorIds, itemPreview, menuParts } from '@/app/lib/maker';
import type { MakerManifest, Part, Selection } from '@/app/types';

type Props = {
  maker: MakerManifest;
  selection: Selection;
  activePartId: number;
  onActivePart: (id: number) => void;
  onPick: (partId: number, itemId: number | null) => void;
  onColor: (partId: number, colorId: number) => void;
  onRandomPart: (partId: number) => void;
};

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="check-icon" aria-hidden>
      <path
        d="M20 6L9 17l-5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Fallback tile for the handful of parts/items the author never gave a thumbnail. */
function Glyph({ label }: { label: string }) {
  return <span className="glyph">{label.slice(0, 2).toUpperCase()}</span>;
}

export default function PartPanel({
  maker,
  selection,
  activePartId,
  onActivePart,
  onPick,
  onColor,
  onRandomPart,
}: Props) {
  const parts = useMemo(() => menuParts(maker), [maker]);
  const active: Part = useMemo(
    () => parts.find((p) => p.id === activePartId) ?? parts[0],
    [parts, activePartId],
  );
  const sel = selection[active.id] ?? { itemId: null, colorId: null };
  const rendered = availableColorIds(maker, active, sel.itemId);

  return (
    <section className="panel" aria-label="Character part editor">
      <div className="tabs-scroll">
        <div className="tabs" role="tablist" aria-label="Part categories">
          {parts.map((p) => {
            const on = p.id === active.id;
            const chosen = selection[p.id]?.itemId != null;
            return (
              <button
                key={p.id}
                role="tab"
                aria-selected={on}
                className={`tab ${on ? 'tab-on' : ''}`}
                onClick={() => onActivePart(p.id)}
                title={p.name}
              >
                <span className="tab-thumb">
                  {p.thumb ? (
                    <img src={p.thumb} alt="" loading="lazy" draggable={false} />
                  ) : (
                    <Glyph label={p.name} />
                  )}
                  {!chosen && <span className="tab-off-dot" aria-hidden />}
                </span>
                <span className="tab-label">{p.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="panel-head">
        <div className="panel-title">
          <h2>{active.name}</h2>
          <span className="panel-count">
            {active.items.length} option{active.items.length === 1 ? '' : 's'}
            {active.colors.length > 1 ? ` · ${active.colors.length} colors` : ''}
          </span>
        </div>
        <button className="btn-ghost" onClick={() => onRandomPart(active.id)}>
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden>
            <path
              d="M4 7h3l3 5m0 0l3 5h4M4 17h3l3-5m4-5h4m0 0l-2-2m2 2l-2 2m2 8l-2-2m2 2l-2 2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Shuffle
        </button>
      </div>

      {active.colors.length > 1 && (
        <div className="swatches" role="radiogroup" aria-label={`${active.name} color`}>
          {active.colors.map((c) => {
            const on = c.id === sel.colorId;
            const dim = sel.itemId != null && rendered.size > 0 && !rendered.has(String(c.id));
            return (
              <button
                key={c.id}
                role="radio"
                aria-checked={on}
                className={`swatch ${on ? 'swatch-on' : ''} ${dim ? 'swatch-dim' : ''}`}
                style={{ background: c.hex }}
                onClick={() => onColor(active.id, c.id)}
                title={dim ? `${c.hex} — not drawn for this option` : c.hex}
              >
                {on && <CheckIcon />}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid-scroll">
        <div className="grid">
          {active.removable && (
            <button
              className={`cell ${sel.itemId == null ? 'cell-on' : ''}`}
              onClick={() => onPick(active.id, null)}
              title="None"
            >
              <span className="cell-none">
                <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
                  <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M5.6 18.4L18.4 5.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </span>
              <span className="cell-tag">None</span>
            </button>
          )}
          {active.items.map((it, i) => {
            const on = it.id === sel.itemId;
            const src = itemPreview(maker, active, it, sel.colorId);
            return (
              <button
                key={it.id}
                className={`cell ${on ? 'cell-on' : ''}`}
                onClick={() => onPick(active.id, it.id)}
                title={`${active.name} ${i + 1}`}
              >
                {src ? (
                  <img src={src} alt={`${active.name} ${i + 1}`} loading="lazy" draggable={false} />
                ) : (
                  <Glyph label={String(i + 1)} />
                )}
                {on && (
                  <span className="cell-badge">
                    <CheckIcon />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
