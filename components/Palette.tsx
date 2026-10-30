'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, type ViewKey } from '@/lib/store';
import { TYPES } from '@/lib/catalog';
import { SECTIONS } from '@/lib/content';

type Entry = { group: string; label: string; sub?: string; run: () => void };

export default function Palette() {
  const open = useStore((s) => s.paletteOpen);
  const setOpen = useStore((s) => s.setPalette);
  const project = useStore((s) => s.project);
  const setView = useStore((s) => s.setView);
  const select = useStore((s) => s.select);
  const [q, setQ] = useState('');
  const [act, setAct] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      setQ('');
      setAct(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);
  const entries = useMemo<Entry[]>(() => {
    const views: [ViewKey, string][] = [['overview', 'Overview'], ['plan', 'Plan & light map'], ['3d', '3D walkthrough'], ['campusplan', 'Campus plan (edit)'], ['campus', 'Campus 3D'], ['light', 'Photo & lux check'], ['rig', 'Fixtures & patch'], ['build', 'Build list'], ['exhibits', 'Exhibits'], ['venue', 'Venue & settings']];
    const e: Entry[] = views.map(([k, l]) => ({ group: 'Views', label: l, run: () => setView(k) }));
    SECTIONS.forEach((s) => e.push({ group: 'Sections', label: `${s.num ? s.num + ' · ' : ''}${s.title}`, sub: s.sub, run: () => setView('exhibits') }));
    project.items.forEach((it) => e.push({ group: TYPES[it.type]?.group || 'Items', label: it.name, sub: TYPES[it.type]?.label, run: () => { setView('plan'); select(it.id); } }));
    project.probes.forEach((p) => e.push({ group: 'People', label: p.name, sub: 'face check', run: () => { setView('plan'); select(p.id); } }));
    return e;
  }, [project, setView, select]);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return entries.slice(0, 40);
    return entries.filter((e) => (e.label + ' ' + (e.sub || '') + ' ' + e.group).toLowerCase().includes(t)).slice(0, 60);
  }, [q, entries]);
  if (!open) return null;
  return (
    <div className="palette-back" onClick={() => setOpen(false)}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          placeholder="Search exhibits, lights, banners, people, views…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setAct(0); }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
            if (e.key === 'ArrowDown') { e.preventDefault(); setAct((a) => Math.min(list.length - 1, a + 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setAct((a) => Math.max(0, a - 1)); }
            if (e.key === 'Enter' && list[act]) { list[act].run(); setOpen(false); }
          }}
        />
        <ul>
          {list.map((e, i) => (
            <li key={i}>
              <button data-active={i === act} onMouseEnter={() => setAct(i)} onClick={() => { e.run(); setOpen(false); }}>
                <span className="muted-3 tiny" style={{ width: 70 }}>{e.group}</span>
                <span className="trunc" style={{ flex: 1 }}>{e.label}</span>
                {e.sub && <span className="muted-3 tiny trunc" style={{ maxWidth: 200 }}>{e.sub}</span>}
              </button>
            </li>
          ))}
          {!list.length && <li className="empty">No matches</li>}
        </ul>
      </div>
    </div>
  );
}
