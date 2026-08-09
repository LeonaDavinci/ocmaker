'use client';

type Props = {
  onRandom: () => void;
  onReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDownload: () => void;
  onShare: () => void;
  canUndo: boolean;
  canRedo: boolean;
  shared: boolean;
};

const Icon = {
  dice: (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="4.5" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" />
      <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" />
      <circle cx="8.5" cy="15.5" r="1.5" fill="currentColor" />
    </svg>
  ),
  reset: (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden>
      <path
        d="M20 12a8 8 0 1 1-2.6-5.9M20 4v4h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  undo: (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden>
      <path
        d="M9 8H5V4M5.2 8.2A7.5 7.5 0 1 1 4.6 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  redo: (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden>
      <path
        d="M15 8h4V4M18.8 8.2A7.5 7.5 0 1 0 19.4 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  download: (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden>
      <path
        d="M12 3v11m0 0l4.2-4.2M12 14l-4.2-4.2M4 17.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  link: (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden>
      <path
        d="M10 14a4.5 4.5 0 0 0 6.4 0l2.6-2.6a4.5 4.5 0 0 0-6.4-6.4L11.2 6.4M14 10a4.5 4.5 0 0 0-6.4 0L5 12.6a4.5 4.5 0 0 0 6.4 6.4l1.3-1.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden>
      <path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export default function Toolbar({
  onRandom,
  onReset,
  onUndo,
  onRedo,
  onDownload,
  onShare,
  canUndo,
  canRedo,
  shared,
}: Props) {
  return (
    <div className="toolbar">
      <div className="toolbar-row">
        <button className="btn btn-primary" onClick={onRandom} title="Randomise everything (R)">
          {Icon.dice} Random
        </button>
        <button className="btn btn-accent" onClick={onDownload} title="Download PNG (D)">
          {Icon.download} Download
        </button>
      </div>
      <div className="toolbar-row">
        <button className="btn btn-soft" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          {Icon.undo} Undo
        </button>
        <button className="btn btn-soft" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          {Icon.redo} Redo
        </button>
        <button className="btn btn-soft" onClick={onReset} title="Back to the original character">
          {Icon.reset} Original
        </button>
        <button className="btn btn-soft" onClick={onShare} title="Copy a link to this character">
          {shared ? Icon.check : Icon.link} {shared ? 'Copied' : 'Share'}
        </button>
      </div>
    </div>
  );
}
