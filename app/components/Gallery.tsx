'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatBig } from '@/app/lib/maker';
import { makerPath, SITE_NAME } from '@/app/lib/site';
import type { CatalogueEntry } from '@/app/types';

const nf = new Intl.NumberFormat('en-US');

export default function Gallery({ makers }: { makers: CatalogueEntry[] }) {
  const [filter, setFilter] = useState<string>('All');
  const [query, setQuery] = useState('');

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of makers) counts.set(m.category, (counts.get(m.category) ?? 0) + 1);
    return ['All', ...[...counts.keys()].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))];
  }, [makers]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return makers.filter((m) => {
      if (filter !== 'All' && m.category !== filter) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.franchise.toLowerCase().includes(q) ||
        m.creator.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [makers, filter, query]);

  const totals = useMemo(
    () => ({
      makers: makers.length,
      parts: makers.reduce((n, m) => n + m.parts, 0),
      items: makers.reduce((n, m) => n + m.items, 0),
      images: makers.reduce((n, m) => n + m.images, 0),
    }),
    [makers],
  );

  const surprise = () => {
    const m = makers[Math.floor(Math.random() * makers.length)];
    window.location.href = `${makerPath(m.slug)}?roll=1`;
  };

  return (
    <main className="home">
      <section className="hero">
        <div className="hero-glow" aria-hidden />
        <a href="/" className="hero-brand" aria-label={`${SITE_NAME} home`}>
          <svg viewBox="0 0 40 40" width="32" height="32" aria-hidden>
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
        <p className="hero-kicker">Offline character-creator archive</p>
        <h1 className="hero-title">
          Build an <span className="grad">OC</span> for any world
        </h1>
        <p className="hero-sub">
          {totals.makers} of the most-visited Picrew makers, mirrored complete with every part and colour
          variant. Swap hair, brows, eyes, muzzles, horns, outfits and accessories, then export a
          transparent PNG. Everything renders in your browser — nothing is uploaded.
        </p>

        <div className="hero-cta">
          <button className="pill pill-primary" onClick={surprise}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="4.5" fill="none" stroke="currentColor" strokeWidth="1.9" />
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
              <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" />
              <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" />
              <circle cx="8.5" cy="15.5" r="1.5" fill="currentColor" />
            </svg>
            Surprise me
          </button>
          <a className="pill pill-ghost" href="#makers">
            Browse all makers
          </a>
        </div>

        <dl className="hero-stats">
          <div>
            <dt>Makers</dt>
            <dd>{totals.makers}</dd>
          </div>
          <div>
            <dt>Part categories</dt>
            <dd>{nf.format(totals.parts)}</dd>
          </div>
          <div>
            <dt>Pieces</dt>
            <dd>{nf.format(totals.items)}</dd>
          </div>
          <div>
            <dt>Mirrored images</dt>
            <dd>{nf.format(totals.images)}</dd>
          </div>
        </dl>
      </section>

      <section id="makers" className="browse">
        <div className="browse-bar">
          <div className="chips" role="tablist" aria-label="Filter by category">
            {categories.map((c) => (
              <button
                key={c}
                role="tab"
                aria-selected={c === filter}
                className={`chip ${c === filter ? 'chip-on' : ''}`}
                onClick={() => setFilter(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <label className="search">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
              <circle cx="11" cy="11" r="6.4" fill="none" stroke="currentColor" strokeWidth="1.9" />
              <path d="M15.8 15.8L20 20" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              placeholder="Search franchise, artist, tag…"
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search makers"
            />
          </label>
        </div>

        <div className="cards">
          {shown.map((m) => (
            <Link key={m.id} href={makerPath(m.slug)} className="card">
              <div className="card-art">
                <img src={m.icon} alt="" loading="lazy" draggable={false} />
                <span className="card-badge">{m.category}</span>
              </div>
              <div className="card-body">
                <h3>{m.name}</h3>
                <p className="card-franchise">{m.franchise}</p>
                <p className="card-blurb">{m.blurb}</p>
                <ul className="card-stats">
                  <li>
                    <b>{m.parts}</b> categories
                  </li>
                  <li>
                    <b>{nf.format(m.items)}</b> pieces
                  </li>
                  <li>
                    <b>{formatBig(m.combinations)}</b> combos
                  </li>
                </ul>
                <span className="card-cta">
                  Open studio
                  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden>
                    <path d="M5 12h13m0 0l-5.5-5.5M18 12l-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
          {!shown.length && <p className="empty">No maker matches that search.</p>}
        </div>
      </section>

      <footer className="site-foot">
        <span>
          Fan-made offline study mirror. Every maker links back to its original author on picrew.me — all
          artwork remains theirs. Built with Next.js; rendering is 100% client-side.
        </span>
      </footer>
    </main>
  );
}
