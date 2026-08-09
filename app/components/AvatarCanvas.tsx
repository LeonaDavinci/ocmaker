'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { drawOps } from '@/app/lib/maker';
import type { MakerManifest, Selection } from '@/app/types';

export type AvatarCanvasHandle = {
  toBlob: () => Promise<Blob | null>;
};

type Props = {
  maker: MakerManifest;
  selection: Selection;
  className?: string;
};

const cache = new Map<string, HTMLImageElement>();

function loadImage(src: string): Promise<HTMLImageElement | null> {
  const hit = cache.get(src);
  if (hit) return Promise.resolve(hit.naturalWidth ? hit : null);
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    // CDN images (jsDelivr) must be requested CORS-clean or the canvas is
    // tainted and the PNG export (toBlob) throws. jsDelivr sends ACAO: *.
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      cache.set(src, img);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

const AvatarCanvas = forwardRef<AvatarCanvasHandle, Props>(function AvatarCanvas(
  { maker, selection, className },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runId = useRef(0);
  const [ready, setReady] = useState(false);

  useImperativeHandle(ref, () => ({
    toBlob: () =>
      new Promise<Blob | null>((resolve) => {
        const c = canvasRef.current;
        if (!c) return resolve(null);
        c.toBlob((b) => resolve(b), 'image/png');
      }),
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const id = ++runId.current;
    const { w, h } = maker.canvas;
    const urls = drawOps(maker, selection).map((o) => o.url);

    const paint = (images: (HTMLImageElement | null)[]) => {
      if (id !== runId.current) return;
      ctx.clearRect(0, 0, w, h);
      for (const img of images) if (img) ctx.drawImage(img, 0, 0, w, h);
      setReady(true);
    };

    // Fast path: everything is already decoded, so paint synchronously and
    // avoid a frame where the character is half-composed.
    if (urls.every((u) => cache.has(u))) {
      paint(urls.map((u) => cache.get(u) ?? null));
      return;
    }
    Promise.all(urls.map(loadImage)).then(paint);
  }, [maker, selection]);

  return (
    <div className={className}>
      <div className="canvas-frame" style={{ aspectRatio: `${maker.canvas.w} / ${maker.canvas.h}` }}>
        <canvas
          ref={canvasRef}
          width={maker.canvas.w}
          height={maker.canvas.h}
          className="canvas-el"
          aria-label="Your character preview"
          style={{ opacity: ready ? 1 : 0 }}
        />
        {!ready && <div className="canvas-loading" aria-hidden />}
      </div>
    </div>
  );
});

export default AvatarCanvas;
