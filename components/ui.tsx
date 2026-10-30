'use client';
import React from 'react';

type IP = { size?: number; className?: string };
const S = ({ size = 18, children, className }: IP & { children: React.ReactNode }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);
export const Icon = {
  overview: (p: IP) => (
    <S {...p}>
      <rect x="3" y="3" width="7" height="9" rx="2" />
      <rect x="14" y="3" width="7" height="5" rx="2" />
      <rect x="14" y="12" width="7" height="9" rx="2" />
      <rect x="3" y="16" width="7" height="5" rx="2" />
    </S>
  ),
  plan: (p: IP) => (
    <S {...p}>
      <path d="M3 4h18v16H3z" />
      <path d="M3 10h6v10M15 4v7h6" />
    </S>
  ),
  cube: (p: IP) => (
    <S {...p}>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
    </S>
  ),
  bulb: (p: IP) => (
    <S {...p}>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" />
    </S>
  ),
  rig: (p: IP) => (
    <S {...p}>
      <path d="M5 5h14M12 5v16M7 21l5-6 5 6" />
      <circle cx="7" cy="8" r="1.8" />
      <circle cx="17" cy="8" r="1.8" />
    </S>
  ),
  box: (p: IP) => (
    <S {...p}>
      <path d="M4 7l8-4 8 4v10l-8 4-8-4z" />
      <path d="M4 7l8 4 8-4M12 11v10" />
    </S>
  ),
  frame: (p: IP) => (
    <S {...p}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </S>
  ),
  venue: (p: IP) => (
    <S {...p}>
      <path d="M3 21h18M5 21V9l7-5 7 5v12" />
      <path d="M10 21v-6h4v6" />
    </S>
  ),
  close: (p: IP) => (
    <S {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </S>
  ),
  menu: (p: IP) => (
    <S {...p}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </S>
  ),
  search: (p: IP) => (
    <S {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </S>
  ),
  undo: (p: IP) => (
    <S {...p}>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </S>
  ),
  redo: (p: IP) => (
    <S {...p}>
      <path d="M15 14l5-5-5-5" />
      <path d="M20 9H10a6 6 0 0 0 0 12h3" />
    </S>
  ),
  person: (p: IP) => (
    <S {...p}>
      <circle cx="12" cy="6" r="3" />
      <path d="M6 21v-5a6 6 0 0 1 12 0v5" />
    </S>
  ),
  plus: (p: IP) => (
    <S {...p}>
      <path d="M12 5v14M5 12h14" />
    </S>
  ),
  trash: (p: IP) => (
    <S {...p}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </S>
  ),
  copy: (p: IP) => (
    <S {...p}>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
    </S>
  ),
  download: (p: IP) => (
    <S {...p}>
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </S>
  ),
  upload: (p: IP) => (
    <S {...p}>
      <path d="M12 20V9M7 14l5-5 5 5M5 4h14" />
    </S>
  ),
  target: (p: IP) => (
    <S {...p}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </S>
  ),
  ruler: (p: IP) => (
    <S {...p}>
      <path d="M3 17L17 3l4 4L7 21z" />
      <path d="M7 13l2 2M10 10l2 2M13 7l2 2" />
    </S>
  ),
  eye: (p: IP) => (
    <S {...p}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </S>
  ),
  camera: (p: IP) => (
    <S {...p}>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </S>
  ),
  walk: (p: IP) => (
    <S {...p}>
      <circle cx="13" cy="4" r="2" />
      <path d="M10 22l2-7 3 3v4M8 12l3-4 4 2 3 3M12 15l-1-5" />
    </S>
  ),
  lock: (p: IP) => (
    <S {...p}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </S>
  ),
  reset: (p: IP) => (
    <S {...p}>
      <path d="M4 4v6h6" />
      <path d="M20 12a8 8 0 1 1-2.3-5.7L20 9" />
    </S>
  ),
};

export function Pill({ children, sev, className = '' }: { children: React.ReactNode; sev?: 'error' | 'warning' | 'info' | 'ok'; className?: string }) {
  return <span className={`pill ${sev ? `sev-${sev}` : ''} ${className}`}>{children}</span>;
}

export function Slider({ value, min, max, step = 0.01, onChange, fmt }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; fmt?: (v: number) => string }) {
  return (
    <div className="slider">
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
      <span className="v">{fmt ? fmt(value) : value.toFixed(2)}</span>
    </div>
  );
}

export function NumIn({ value, onChange, step = 0.5, min, max, suffix }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string }) {
  const [txt, setTxt] = React.useState(String(round(value)));
  React.useEffect(() => setTxt(String(round(value))), [value]);
  return (
    <div style={{ position: 'relative' }}>
      <input
        className="num-in"
        type="number"
        step={step}
        min={min}
        max={max}
        value={txt}
        onChange={(e) => {
          setTxt(e.target.value);
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
      />
      {suffix && <span style={{ position: 'absolute', right: 26, top: 7, fontSize: 11, color: 'var(--on-dark-3)', pointerEvents: 'none' }}>{suffix}</span>}
    </div>
  );
}
const round = (v: number) => Math.round(v * 100) / 100;

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div>{children}</div>
    </div>
  );
}

export function Seg<T extends string | number>({ value, options, onChange }: { value: T; options: { v: T; label: React.ReactNode; title?: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="group">
      {options.map((o) => (
        <button key={String(o.v)} aria-pressed={o.v === value} title={o.title} onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function rgbCss(c: [number, number, number], a = 1) {
  const g = (v: number) => Math.round(255 * Math.pow(Math.max(0, Math.min(1, v)), 1 / 2.2));
  return `rgba(${g(c[0])},${g(c[1])},${g(c[2])},${a})`;
}
