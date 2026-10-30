'use client';
// Campus plan — a flat blueprint of the whole campus that you can edit. Edits are saved in lib/campusEdits and show up live in Campus 3D.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { loadCampus, type CampusData, type PolyJ } from '@/lib/campus';
import { useCE, editedData, inRect, lineBooths, newId, normRect, type Added, type Edits, type Rect, EX_KINDS, KDC_KINDS, SITE_KINDS, type ExKind } from '@/lib/campusEdits';
import { Field, NumIn } from '../ui';

type Tool = 'select' | 'carnival' | 'wall' | 'glass' | 'door' | 'area' | 'tree' | 'tent' | 'gate' | 'text' | 'sign' | 'shuttle' | 'under' | 'shoes' | 'ramp' | 'canopy' | 'display';
type Sel = { k: string; id: string } | null;
type V2 = [number, number];
const TOOLS: [Tool, string, string][] = [
  ['select', 'Select', 'V'], ['wall', 'Wall', 'W'], ['glass', 'Glass', 'G'], ['door', 'Door', 'D'], ['area', 'Area / zone', 'A'],
  ['tree', 'Tree', 'T'], ['tent', 'Tent', 'N'], ['gate', 'Gate', 'M'], ['carnival', 'Carnival gate', 'C'], ['text', 'Label', 'L'], ['sign', 'Sign', 'S'], ['shuttle', 'Shuttle', 'H'], ['shoes', 'Shoe stands', 'R'], ['ramp', 'Ramp', 'P'], ['canopy', 'Solar canopy', 'O'], ['display', 'Side-room display', 'I'], ['under', 'Move map image', 'U'],
];
const AREA_KINDS = ['zone', 'lawn', 'paving', 'asphalt', 'floor', 'water', 'block', 'erase'] as const;
type AreaTool = (typeof AREA_KINDS)[number];
const AREA_COL: Record<string, string> = { lawn: '#3f8f5c', paving: '#b9c4cf', asphalt: '#2b3a4a', floor: '#c9bfae', water: '#4a86a8', block: '#d9c7a6' };
const ZONE_COLS = ['#2f6fdb', '#e0282e', '#2fae5a', '#f2c230', '#d6249f', '#e8620a', '#1f7a6e', '#8a5cd6'];
const EDIT_KINDS = ['zone', 'sign', 'shuttle', 'added', 'erase', 'booth', 'carnival', 'annakut', 'canopy', 'shoes', 'ramp', 'display', 'exitem', 'drape'];
const draggable = (k: string) => EDIT_KINDS.includes(k);
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

function getItem(e: Edits, s: { k: string; id: string }): any {
  switch (s.k) {
    case 'zone': return e.zones.find((z) => z.id === s.id);
    case 'sign': return e.signs.find((z) => z.id === s.id);
    case 'shuttle': return e.shuttles.find((z) => z.id === s.id);
    case 'added': return e.added.find((z) => z.id === s.id);
    case 'booth': return e.booths.find((z) => z.id === s.id);
    case 'carnival': return e.carnival.find((z) => z.id === s.id);
    case 'annakut': return e.annakut.find((z) => z.id === s.id);
    case 'canopy': return e.canopies.find((z) => z.id === s.id);
    case 'display': return e.displays.find((z) => z.id === s.id);
    case 'exitem': return e.exItems.find((z) => z.id === s.id);
    case 'drape': return e.drapes.find((z) => z.id === s.id);
    case 'shoes': return e.shoes.find((z) => z.id === s.id);
    case 'ramp': return e.ramps.find((z) => z.id === s.id);
    case 'erase': { const i = +s.id; return { get r() { return e.erase[i]; }, set r(v: Rect) { e.erase[i] = v; } }; }
  }
  return undefined;
}
function translate(it: any, o: any, dx: number, dy: number) {
  if ('r' in o) it.r = [o.r[0] + dx, o.r[1] + dx, o.r[2] + dy, o.r[3] + dy];
  else if ('a' in o) { it.a = [o.a[0] + dx, o.a[1] + dy]; it.b = [o.b[0] + dx, o.b[1] + dy]; }
  else { it.x = o.x + dx; it.y = o.y + dy; }
}
const ring = (r: number[][]) => 'M' + r.map((p) => p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join('L') + 'Z';
const polyD = (p: PolyJ) => ring(p.o) + p.h.map(ring).join('');
const segD = (s: number[][]) => s.map((q) => `M${q[0].toFixed(2)} ${q[1].toFixed(2)}L${q[2].toFixed(2)} ${q[3].toFixed(2)}`).join('');
const nsc = { vectorEffect: 'non-scaling-stroke' as const };
const HIGHLIGHT = '#ffb347';

/* ───────── base (DWG) layers: memoised so panning/zooming never re-renders them ───────── */
interface Layers { under: boolean; parking: boolean; walls: boolean; openings: boolean; site: boolean; rooms: boolean; event: boolean; added: boolean }
const BaseLayers = React.memo(function BaseLayers({ base, hidden, erase, showHidden, layers, selKey }: { base: CampusData; hidden: string[]; erase: Rect[]; showHidden: boolean; layers: Layers; selKey: string }) {
  const hid = useMemo(() => new Set(hidden), [hidden]);
  const gone = (x: number, y: number) => erase.some((r) => inRect(x, y, r));
  const cen = (p: PolyJ) => { let x = 0, y = 0; for (const q of p.o) { x += q[0]; y += q[1]; } return [x / p.o.length, y / p.o.length]; };
  // returns 0 = visible, 1 = hidden-but-shown-faded, -1 = not drawn
  const st = (key: string, x: number, y: number) => ((hid.has(key) || gone(x, y)) ? (showHidden ? 1 : -1) : 0);
  const filt = (segs: number[][]) => segs.filter((s) => !gone((s[0] + s[2]) / 2, (s[1] + s[3]) / 2));
  const s = base.site;
  const bulk = useMemo(() => ({
    hull: ring(s.hull), stalls: segD(filt(s.stalls)), curbs: segD(filt(s.curbs)), conc: segD(filt(s.conc)), fences: segD(filt(s.fences)), rails: segD(filt(s.rails)),
    foot: ring(base.footprint.o),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [base, erase]);
  const wallCol: Record<string, string> = { ext: '#9cc3e6', tall: '#b9d6f0', int: '#7fa9cf', oop: '#4a647c' };
  const hl = (key: string) => (key === selKey ? { stroke: HIGHLIGHT, strokeWidth: 3, ...nsc } : null);
  const fade = (v: number) => (v === 1 ? { opacity: 0.28, strokeDasharray: '3 2' } : null);
  return (
    <g>
      {layers.parking && (
        <g pointerEvents="none">
          <path d={bulk.hull} fill="#142c45" />
          <path d={bulk.conc} stroke="#4d6a86" strokeWidth={1} fill="none" {...nsc} />
          <path d={bulk.stalls} stroke="#35516d" strokeWidth={1} fill="none" {...nsc} />
          <path d={bulk.curbs} stroke="#6b8aa6" strokeWidth={1} fill="none" {...nsc} />
          <path d={bulk.fences} stroke="#a6b6c8" strokeWidth={1} fill="none" {...nsc} />
          <path d={bulk.rails} stroke="#8ea2b8" strokeWidth={1} fill="none" {...nsc} />
          {s.ada.map((p, i) => <rect key={i} x={p[0] - 2} y={p[1] - 2} width={4} height={4} fill="#2b6fd0" opacity={0.8} />)}
        </g>
      )}
      {layers.site && (
        <g>
          {s.walks.map((p, i) => { const [x, y] = cen(p); const v = st('k' + i, x, y); return v < 0 ? null : <path key={i} d={polyD(p)} fill="#4a6580" fillRule="evenodd" data-k="k" data-id={i} {...fade(v)} {...hl('k' + i)} />; })}
          {s.planters.map((p, i) => { const [x, y] = cen(p); const v = st('p' + i, x, y); return v < 0 ? null : <path key={i} d={polyD(p)} fill="#2d6a4f" fillOpacity={0.85} fillRule="evenodd" data-k="p" data-id={i} {...fade(v)} {...hl('p' + i)} />; })}
          {s.trees.map((p, i) => { const v = st('t' + i, p[0], p[1]); return v < 0 ? null : <circle key={i} cx={p[0]} cy={p[1]} r={6} fill="#3f8f5c" fillOpacity={0.75} data-k="t" data-id={i} {...fade(v)} {...hl('t' + i)} />; })}
          {s.poles.map((p, i) => { const v = st('l' + i, p[0], p[1]); return v < 0 ? null : <rect key={i} x={p[0] - 1.6} y={p[1] - 1.6} width={3.2} height={3.2} fill="#ffd166" data-k="l" data-id={i} {...fade(v)} {...hl('l' + i)} />; })}
        </g>
      )}
      {layers.walls && (
        <g>
          {base.footprint && <path d={bulk.foot} fill="#16304b" pointerEvents="none" />}
          {base.walls.map((w, i) => {
            const [x, y] = cen(w);
            const v = st('w' + i, x, y);
            if (v < 0) return null;
            return <path key={i} d={polyD(w)} fill={wallCol[w.g || 'ext']} stroke={wallCol[w.g || 'ext']} strokeWidth={1.2} {...nsc} fillRule="evenodd" data-k="w" data-id={i} {...fade(v)} {...hl('w' + i)} />;
          })}
        </g>
      )}
      {layers.openings && (
        <g>
          {base.glass.map((g, i) => { const v = st('g' + i, (g[0] + g[2]) / 2, (g[1] + g[3]) / 2); return v < 0 ? null : <line key={i} x1={g[0]} y1={g[1]} x2={g[2]} y2={g[3]} stroke="#5ee1ff" strokeWidth={3} data-k="g" data-id={i} {...nsc} {...fade(v)} {...(i + '' && hl('g' + i))} />; })}
          {base.doors.map((d: any, i) => {
            const mx = d.t === 'leaf' ? d.r[0][0] : (d.a[0] + d.b[0]) / 2, my = d.t === 'leaf' ? d.r[0][1] : (d.a[1] + d.b[1]) / 2;
            const v = st('d' + i, mx, my);
            if (v < 0) return null;
            return d.t === 'leaf'
              ? <path key={i} d={ring(d.r)} fill="#f0b429" data-k="d" data-id={i} {...fade(v)} {...hl('d' + i)} />
              : <line key={i} x1={d.a[0]} y1={d.a[1]} x2={d.b[0]} y2={d.b[1]} stroke="#d19b2a" strokeWidth={3} strokeDasharray="4 3" data-k="d" data-id={i} {...nsc} {...fade(v)} {...hl('d' + i)} />;
          })}
        </g>
      )}
    </g>
  );
});

const MAJOR = /^(assembly hall|foyer|mandir hall|mahila sabha hall|gymnasium|kitchen|library|womens dining|mens dining|multi room|open space)$/i;
function RoomLabels({ base, size, all }: { base: CampusData; size: number; all: boolean }) {
  return (
    <g pointerEvents="none" fill="#cfe3f5" fontSize={size} textAnchor="middle" fontFamily="DM Sans Variable, sans-serif">
      {base.rooms.filter((r) => all || MAJOR.test(r.n)).map((r, i) => <text key={i} transform={`translate(${r.x},${r.y}) scale(1,-1)`}>{r.n}</text>)}
    </g>
  );
}

/* ───────── event + added layers (small, redrawn freely) ───────── */
function EditedLayer({ e, s, selKey, layers }: { e: Edits; s: number; selKey: string; layers: Layers }) {
  const sel = (k: string, id: string) => (selKey === k + ':' + id ? HIGHLIGHT : null);
  const lab = (x: number, y: number, t: string, col = '#fff', size = 11 * s) => (
    <text transform={`translate(${x},${y}) scale(1,-1)`} fill={col} fontSize={size} textAnchor="middle" fontWeight={700} fontFamily="DM Sans Variable, sans-serif" pointerEvents="none">{t}</text>
  );
  const r = Math.max(3, 7 * s);
  return (
    <g>
      {layers.added && e.added.map((it) => {
        const hi = sel('added', it.id);
        const common = { 'data-k': 'added', 'data-id': it.id } as any;
        switch (it.t) {
          case 'wall': return <line key={it.id} x1={it.a[0]} y1={it.a[1]} x2={it.b[0]} y2={it.b[1]} stroke={hi || '#ffe0a8'} strokeWidth={Math.max(it.w, 1.4)} {...common} />;
          case 'glass': return <line key={it.id} x1={it.a[0]} y1={it.a[1]} x2={it.b[0]} y2={it.b[1]} stroke={hi || '#5ee1ff'} strokeWidth={Math.max(0.8, 2 * s)} {...common} />;
          case 'door': return <line key={it.id} x1={it.a[0]} y1={it.a[1]} x2={it.b[0]} y2={it.b[1]} stroke={hi || '#f0b429'} strokeWidth={Math.max(1, 2.5 * s)} {...common} />;
          case 'area': {
            const [x0, x1, y0, y1] = it.r;
            return (
              <g key={it.id}>
                <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={AREA_COL[it.k]} fillOpacity={it.k === 'block' ? 0.7 : 0.55} stroke={hi || '#ffffff55'} strokeWidth={1.5} {...nsc} pointerEvents="stroke" {...common} />
                <g {...common} style={{ cursor: 'pointer' }}>{lab((x0 + x1) / 2, (y0 + y1) / 2, it.k + (it.k === 'block' ? ` ${it.h}′` : ''), '#fff', 10 * s)}</g>
              </g>
            );
          }
          case 'tree': return <circle key={it.id} cx={it.x} cy={it.y} r={6} fill="#4cc27e" fillOpacity={0.85} stroke={hi || 'none'} strokeWidth={2} {...nsc} {...common} />;
          case 'tent': return <rect key={it.id} x={it.x - 4} y={it.y - 4} width={8} height={8} fill={it.c} stroke={hi || '#fff'} strokeWidth={1} {...nsc} {...common} />;
          case 'gate': {
            const a = (it.yaw * Math.PI) / 180, dx = Math.cos(a) * it.w / 2, dy = -Math.sin(a) * it.w / 2;
            return (
              <g key={it.id} {...common} style={{ cursor: 'pointer' }}>
                <line x1={it.x - dx} y1={it.y - dy} x2={it.x + dx} y2={it.y + dy} stroke={hi || '#e3b84c'} strokeWidth={Math.max(2, 3 * s)} />
                <circle cx={it.x - dx} cy={it.y - dy} r={Math.max(1.5, 3 * s)} fill="#f28c0f" /><circle cx={it.x + dx} cy={it.y + dy} r={Math.max(1.5, 3 * s)} fill="#f28c0f" />
                {lab(it.x, it.y - 6 * s * 2, it.label, '#ffe9b8', 10 * s)}
              </g>
            );
          }
          case 'text': return <g key={it.id} {...common} style={{ cursor: 'pointer' }}><rect x={it.x - 1} y={it.y - 1} width={2} height={2} fill={hi || '#fff'} />{lab(it.x, it.y + 3 * s, it.label, hi || '#fff', 12 * s)}</g>;
        }
      })}
      {layers.event && (
        <g>
          {e.zones.map((z) => {
            const [x0, x1, y0, y1] = z.r, hi = sel('zone', z.id);
            const common = { 'data-k': 'zone', 'data-id': z.id } as any;
            return (
              <g key={z.id}>
                <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={z.color} fillOpacity={0.22} stroke={hi || z.color} strokeWidth={hi ? 2.5 : 1.5} strokeDasharray="6 3" {...nsc} pointerEvents="stroke" {...common} />
                <g {...common} style={{ cursor: 'pointer' }}>{lab((x0 + x1) / 2, (y0 + y1) / 2, z.label, '#fff', 14 * s)}</g>
              </g>
            );
          })}
          {e.booths.map((b, i) => (
            <g key={b.id} transform={`translate(${b.x},${b.y}) rotate(${b.yaw})`} data-k="booth" data-id={b.id} style={{ cursor: 'pointer' }}>
              <rect x={-8} y={-8} width={16} height={16} fill={b.color} fillOpacity={0.4} stroke={sel('booth', b.id) || b.color} strokeWidth={sel('booth', b.id) ? 2.5 : 1.2} {...nsc} />
              <line x1={8} y1={-5} x2={8} y2={5} stroke="#fff" strokeWidth={2.5} {...nsc} />
              <g transform={`rotate(${-b.yaw})`}>{lab(0, -2 * s * 3, String(i + 1), '#fff', Math.max(5, 12 * s))}</g>
            </g>
          ))}
          {e.carnival.map((c) => (
            <g key={c.id} transform={`translate(${c.x},${c.y}) rotate(${c.yaw})`} data-k="carnival" data-id={c.id} style={{ cursor: 'pointer' }}>
              <line x1={0} y1={-c.w / 2} x2={0} y2={c.w / 2} stroke={sel('carnival', c.id) || '#e0a92c'} strokeWidth={Math.max(2.5, 3 * s)} />
              <rect x={-3.5} y={-c.w / 2 - 0.5} width={7} height={9} fill="#c2255f" /><rect x={-3.5} y={c.w / 2 - 8.5} width={7} height={9} fill="#c2255f" />
              <line x1={0} y1={0} x2={22} y2={0} stroke="#e8b84a" strokeWidth={5} strokeDasharray="3 3" opacity={0.7} />
              <g transform={`rotate(${-c.yaw})`}>{lab(0, 14 * s, c.title, '#ffe9b8', 10 * s)}</g>
            </g>
          ))}
          {e.annakut.map((a) => {
            const pts = [[-a.w / 2, a.d / 2], [a.w / 2, a.d / 2], [a.w / 2, a.d * 0.05], [a.w * 0.3, -a.d / 2], [-a.w * 0.3, -a.d / 2], [-a.w / 2, a.d * 0.05]];
            return (
              <g key={a.id} transform={`translate(${a.x},${a.y}) rotate(${a.yaw})`} data-k="annakut" data-id={a.id} style={{ cursor: 'pointer' }}>
                <path d={ring(pts)} fill="#7a4aa0" fillOpacity={0.3} stroke={sel('annakut', a.id) || '#b78be0'} strokeWidth={1.5} {...nsc} />
                <rect x={-a.w / 2} y={a.d / 2} width={a.w} height={6} fill="#d4a63a" fillOpacity={0.55} /><g transform={`rotate(${-a.yaw})`}>{lab(0, a.d / 2 + 3, 'Shrine', '#fff3cc', 8 * s)}</g>
                <g transform={`rotate(${-a.yaw})`}>{lab(0, 0, 'Annakut', '#e6d4f5', 11 * s)}</g>
              </g>
            );
          })}
          {e.drapes.map((r) => (
            <line key={r.id} x1={r.a[0]} y1={r.a[1]} x2={r.b[0]} y2={r.b[1]} stroke={sel('drape', r.id) || '#4a6fd0'} strokeWidth={sel('drape', r.id) ? 5 : 3.5} strokeLinecap="round" opacity={0.9} {...nsc} data-k="drape" data-id={r.id} style={{ cursor: 'pointer' }} />
          ))}
          {e.exItems.map((q) => {
            const K = EX_KINDS[q.kind];
            if (q.kind === 'label') return <g key={q.id} data-k="exitem" data-id={q.id} style={{ cursor: 'pointer' }}>{lab(q.x, q.y, q.t || 'Label', sel('exitem', q.id) || '#9db8ff', 9 * s)}</g>;
            return (
              <g key={q.id} transform={`translate(${q.x},${q.y}) rotate(${q.yaw})`} data-k="exitem" data-id={q.id} style={{ cursor: 'pointer' }}>
                {q.kind === 'rath'
                  ? <circle r={q.w / 2} fill={K.color} fillOpacity={0.12} stroke={sel('exitem', q.id) || K.color} strokeWidth={sel('exitem', q.id) ? 2.2 : 1.4} strokeDasharray="4 3" {...nsc} />
                  : <rect x={-q.w / 2} y={-q.d / 2} width={q.w} height={q.d} fill={K.color} fillOpacity={q.kind === 'arrow' ? 0.8 : q.kind === 'pocket' ? 0.06 : q.kind === 'path' ? 0.7 : 0.28} stroke={sel('exitem', q.id) || K.color} strokeWidth={sel('exitem', q.id) ? 2.2 : 1} strokeDasharray={q.kind === 'pocket' ? '8 4' : undefined} pointerEvents={q.kind === 'pocket' ? 'stroke' : undefined} {...nsc} />}
                {['shootout', 'steps', 'quest', 'moonwalker', 'castle'].includes(q.kind) && <rect x={-q.w / 2} y={-12.7} width={24.6} height={25.4} fill="none" stroke="#ffffff" strokeOpacity={0.35} strokeWidth={0.8} strokeDasharray="3 2" {...nsc} pointerEvents="none" />}
                {q.kind !== 'arrow' && q.kind !== 'rath' && q.kind !== 'path' && q.kind !== 'pocket' && q.kind !== 'fence' && <line x1={q.w / 2} y1={-Math.min(q.d / 2, 2)} x2={q.w / 2} y2={Math.min(q.d / 2, 2)} stroke="#fff" strokeWidth={2.4} {...nsc} />}
                {q.kind !== 'arrow' && <g transform={`rotate(${-q.yaw})`}>{lab(0, 0, K.label.split(' (')[0], '#e8eefc', 8 * s)}</g>}
              </g>
            );
          })}
          {e.displays.map((q) => (
            <g key={q.id} transform={`translate(${q.x},${q.y}) rotate(${q.yaw})`} data-k="display" data-id={q.id} style={{ cursor: 'pointer' }}>
              <rect x={-q.w / 2} y={-q.d / 2} width={q.w} height={q.d} fill="#c9783a" fillOpacity={0.35} stroke={sel('display', q.id) || '#e0975a'} strokeWidth={1.3} {...nsc} />
              <g transform={`rotate(${-q.yaw})`}>{lab(0, 0, 'Display', '#ffe0c4', 9 * s)}</g>
            </g>
          ))}
          {e.canopies.map((c) => (
            <g key={c.id} data-k="canopy" data-id={c.id} style={{ cursor: 'pointer' }}>
              <rect x={c.r[0]} y={c.r[2]} width={c.r[1] - c.r[0]} height={c.r[3] - c.r[2]} fill="#3b4a7a" fillOpacity={0.14} stroke={sel('canopy', c.id) || '#6f82c4'} strokeWidth={1.5} strokeDasharray="10 4" {...nsc} pointerEvents="stroke" />
              {lab((c.r[0] + c.r[1]) / 2, c.r[2] + 8, 'Solar canopy', '#aab8f0', 11 * s)}
            </g>
          ))}
          {e.shoes.map((q) => (
            <g key={q.id} transform={`translate(${q.x},${q.y}) rotate(${q.yaw})`} data-k="shoes" data-id={q.id} style={{ cursor: 'pointer' }}>
              <rect x={0} y={-0.75} width={q.n * 6} height={1.5} fill="#9c3d22" stroke={sel('shoes', q.id) || '#d97a4a'} strokeWidth={1} {...nsc} />
              <g transform={`rotate(${-q.yaw})`}>{lab(q.n * 3, -4, 'Shoe stands', '#f0b39a', 8 * s)}</g>
            </g>
          ))}
          {e.ramps.map((q) => (
            <g key={q.id} transform={`translate(${q.x},${q.y}) rotate(${q.yaw})`} data-k="ramp" data-id={q.id} style={{ cursor: 'pointer' }}>
              <rect x={0} y={-q.w / 2} width={q.len} height={q.w} fill="#b3262e" fillOpacity={0.35} stroke={sel('ramp', q.id) || '#e0555e'} strokeWidth={1.2} {...nsc} />
              {q.lane !== 0 && <rect x={0} y={q.lane > 0 ? q.w / 2 : -q.w / 2 + q.lane} width={q.len} height={Math.abs(q.lane)} fill="none" stroke="#e0555e" strokeDasharray="3 3" strokeWidth={1} {...nsc} />}
              <g transform={`rotate(${-q.yaw})`}>{lab(0, 0, 'Ramp', '#ffd5d8', 8 * s)}</g>
            </g>
          ))}
          {e.shuttles.map((p) => <g key={p.id} data-k="shuttle" data-id={p.id} style={{ cursor: 'pointer' }}><rect x={p.x - r * 0.7} y={p.y - r * 0.7} width={r * 1.4} height={r * 1.4} fill="#f0b429" stroke={sel('shuttle', p.id) || '#222'} strokeWidth={1.5} {...nsc} />{lab(p.x, p.y + r * 1.3, 'Shuttle', '#f0b429', 9 * s)}</g>)}
          {e.signs.map((p) => <g key={p.id} data-k="sign" data-id={p.id} style={{ cursor: 'pointer' }}><circle cx={p.x} cy={p.y} r={r} fill="#c94f5a" stroke={sel('sign', p.id) || '#fff'} strokeWidth={1.5} {...nsc} />{lab(p.x, p.y - r * 0.35, String(p.n ?? ''), '#fff', Math.max(4, 8 * s))}</g>)}
        </g>
      )}
      {e.erase.map((q, i) => (
        <rect key={i} x={q[0]} y={q[2]} width={q[1] - q[0]} height={q[3] - q[2]} fill="#e5604f" fillOpacity={0.12} stroke={sel('erase', String(i)) || '#e5604f'} strokeWidth={1.5} strokeDasharray="2 3" {...nsc} pointerEvents="stroke" data-k="erase" data-id={i} />
      ))}
    </g>
  );
}

/* ───────── main view ───────── */
export default function CampusPlan() {
  const [base, setBase] = useState<CampusData | null>(null);
  const e = useCE((s) => s.e);
  const { live, commit, checkpoint, undo, redo, reset, importJSON } = useCE.getState();
  const canUndo = useCE((s) => s.past.length > 0), canRedo = useCE((s) => s.future.length > 0);
  const setView3 = useStore((s) => s.setView);
  const [tool, setTool] = useState<Tool>('select');
  const [areaKind, setAreaKind] = useState<AreaTool>('zone');
  const [sel, setSel] = useState<Sel>(null);
  const [snapG, setSnapG] = useState(1);
  const [showHidden, setShowHidden] = useState(false);
  const [layers, setLayers] = useState<Layers>({ under: true, parking: true, walls: true, openings: true, site: true, rooms: true, event: true, added: true });
  const [draft, setDraft] = useState<{ a: V2; b: V2 } | null>(null);
  const [cursor, setCursor] = useState<V2>([0, 0]);
  const [vp, setVp] = useState({ cx: -130, cy: 190, s: 1.1 });
  const [box, setBox] = useState({ w: 900, h: 600 });
  const [armed, setArmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<any>(null);
  const space = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadCampus().then(setBase); }, []);
  const data = useMemo(() => (base ? editedData(base, e) : null), [base, e.hidden, e.erase]);
  void data;

  // size + fit
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);
  const fit = () => setVp({ cx: -150, cy: 205, s: Math.max(780 / box.w, 760 / box.h) * 1.05 });
  const fitOnce = useRef(false);
  useEffect(() => { if (base && box.w > 100 && !fitOnce.current) { fitOnce.current = true; fit(); } /* eslint-disable-next-line */ }, [base, box.w]);

  const toFt = (ev: { clientX: number; clientY: number }): V2 => {
    const r = svg.current!.getBoundingClientRect();
    return [vp.cx + (ev.clientX - r.left - r.width / 2) * vp.s, vp.cy - (ev.clientY - r.top - r.height / 2) * vp.s];
  };
  const snap = (v: number) => (snapG > 0 ? Math.round(v / snapG) * snapG : v);

  // wheel zoom around the cursor (non-passive so the page doesn't scroll)
  const vpRef = useRef(vp); vpRef.current = vp;
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const v = vpRef.current, r = el.getBoundingClientRect();
      const k = Math.exp(ev.deltaY * 0.0015);
      const ns = Math.min(4, Math.max(0.03, v.s * k));
      const mx = v.cx + (ev.clientX - r.left - r.width / 2) * v.s, my = v.cy - (ev.clientY - r.top - r.height / 2) * v.s;
      setVp({ s: ns, cx: mx - (ev.clientX - r.left - r.width / 2) * ns, cy: my + (ev.clientY - r.top - r.height / 2) * ns });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [base]);

  /* ───────── creation helpers ───────── */
  const selectNew = (k: string, id: string) => setSel({ k, id });
  const place = (t: Tool, p: V2) => {
    const id = newId('a');
    if (t === 'sign') {
      const n = Math.max(0, ...e.signs.map((q) => q.n ?? 0)) + 1;
      const sid = newId('s');
      commit((x) => x.signs.push({ id: sid, n, x: p[0], y: p[1] }));
      return selectNew('sign', sid);
    }
    if (t === 'carnival') { commit((x) => x.carnival.push({ id, x: p[0], y: p[1], w: 24, yaw: -90, title: 'WELCOME TO UTSAVPUR', style: 'arch' })); return selectNew('carnival', id); }
    if (t === 'shoes') { commit((x) => x.shoes.push({ id, x: p[0], y: p[1], yaw: 0, n: 5 })); return selectNew('shoes', id); }
    if (t === 'ramp') { commit((x) => x.ramps.push({ id, x: p[0], y: p[1], yaw: 90, len: 15, w: 8, h: 1.25, lane: -6 })); return selectNew('ramp', id); }
    if (t === 'display') { commit((x) => x.displays.push({ id, x: p[0], y: p[1], w: 36, d: 14, yaw: 0 })); return selectNew('display', id); }
    if (t === 'canopy') { commit((x) => x.canopies.push({ id, r: [p[0], p[0] + 120, p[1], p[1] + 80], h: 14 })); return selectNew('canopy', id); }
    if (t === 'shuttle') { const sid = newId('h'); commit((x) => x.shuttles.push({ id: sid, x: p[0], y: p[1] })); return selectNew('shuttle', sid); }
    const mk: Record<string, Added> = {
      tree: { id, t: 'tree', x: p[0], y: p[1] },
      tent: { id, t: 'tent', x: p[0], y: p[1], c: '#e8620a' },
      gate: { id, t: 'gate', x: p[0], y: p[1], w: 24, yaw: 0, label: 'Main Gate' },
      text: { id, t: 'text', x: p[0], y: p[1], label: 'Label' },
    };
    if (mk[t]) { commit((x) => x.added.push(mk[t])); selectNew('added', id); }
  };
  const finishDraw = (a: V2, b: V2) => {
    const id = newId('a');
    if (tool === 'area') {
      const r = normRect(a, b);
      if (r[1] - r[0] < 1 || r[3] - r[2] < 1) return;
      if (areaKind === 'erase') { commit((x) => x.erase.push(r)); return selectNew('erase', String(e.erase.length)); }
      if (areaKind === 'zone') {
        commit((x) => x.zones.push({ id, label: 'New zone', color: ZONE_COLS[x.zones.length % ZONE_COLS.length], r, tents: false }));
        return selectNew('zone', id);
      }
      commit((x) => x.added.push({ id, t: 'area', r, k: areaKind, h: 16 }));
      return selectNew('added', id);
    }
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.5) return;
    const it: Added = tool === 'wall' ? { id, t: 'wall', a, b, w: 1, h: 16 } : tool === 'glass' ? { id, t: 'glass', a, b, h: 9 } : { id, t: 'door', a, b };
    commit((x) => x.added.push(it));
    selectNew('added', id);
  };

  /* ───────── pointer handling ───────── */
  const onDown = (ev: React.PointerEvent) => {
    const p = toFt(ev), sp: V2 = [snap(p[0]), snap(p[1])];
    const t = ev.target as Element;
    const el = t.closest('[data-k]') as HTMLElement | null;
    const handle = t.closest('[data-handle]') as HTMLElement | null;
    svg.current!.setPointerCapture(ev.pointerId);
    if (ev.button === 1 || ev.button === 2 || space.current) { drag.current = { m: 'pan', sx: ev.clientX, sy: ev.clientY, v: { ...vp } }; return; }
    if (handle && sel) { checkpoint(); drag.current = { m: 'handle', h: handle.dataset.handle }; return; }
    if (tool === 'select') {
      if (el) {
        const s = { k: el.dataset.k!, id: el.dataset.id! };
        setSel(s);
        if (draggable(s.k)) { checkpoint(); drag.current = { m: 'move', s, start: sp, orig: clone(getItem(useCE.getState().e, s)) }; }
        return;
      }
      setSel(null);
      drag.current = { m: 'pan', sx: ev.clientX, sy: ev.clientY, v: { ...vp } };
      return;
    }
    if (tool === 'under') { checkpoint(); drag.current = { m: 'under', start: p, orig: { x: e.under.x, y: e.under.y } }; return; }
    if (tool === 'wall' || tool === 'glass' || tool === 'door' || tool === 'area') { drag.current = { m: 'draw', a: sp }; setDraft({ a: sp, b: sp }); return; }
    place(tool, sp);
  };
  const onMove = (ev: React.PointerEvent) => {
    const p = toFt(ev);
    let sp: V2 = [snap(p[0]), snap(p[1])];
    setCursor(sp);
    const d = drag.current;
    if (!d) return;
    if (d.m === 'pan') setVp({ ...d.v, cx: d.v.cx - (ev.clientX - d.sx) * d.v.s, cy: d.v.cy + (ev.clientY - d.sy) * d.v.s });
    else if (d.m === 'move') {
      const dx = sp[0] - d.start[0], dy = sp[1] - d.start[1];
      live((x) => { const it = getItem(x, d.s); if (it) translate(it, d.orig, dx, dy); });
    } else if (d.m === 'handle' && sel) {
      live((x) => {
        const it = getItem(x, sel);
        if (!it) return;
        if ('r' in it) {
          const r = [...it.r] as Rect;
          if (d.h.includes('w')) r[0] = Math.min(sp[0], r[1] - 1);
          if (d.h.includes('e')) r[1] = Math.max(sp[0], r[0] + 1);
          if (d.h.includes('s')) r[2] = Math.min(sp[1], r[3] - 1);
          if (d.h.includes('n')) r[3] = Math.max(sp[1], r[2] + 1);
          it.r = r;
        } else if ('a' in it) it[d.h] = sp;
      });
    } else if (d.m === 'under') live((x) => { x.under.x = d.orig.x + (p[0] - d.start[0]); x.under.y = d.orig.y + (p[1] - d.start[1]); });
    else if (d.m === 'draw') {
      if (ev.shiftKey && tool !== 'area') sp = Math.abs(sp[0] - d.a[0]) > Math.abs(sp[1] - d.a[1]) ? [sp[0], d.a[1]] : [d.a[0], sp[1]];
      setDraft({ a: d.a, b: sp });
    }
  };
  const onUp = (ev: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    try { svg.current?.releasePointerCapture(ev.pointerId); } catch { /* already released */ }
    if (d?.m === 'draw' && draft) finishDraw(draft.a, draft.b);
    setDraft(null);
  };

  /* ───────── keyboard ───────── */
  const deleteSel = () => {
    if (!sel) return;
    if (sel.k === 'zone') commit((x) => { x.zones = x.zones.filter((z) => z.id !== sel.id); });
    else if (sel.k === 'sign') commit((x) => { x.signs = x.signs.filter((z) => z.id !== sel.id); });
    else if (sel.k === 'shuttle') commit((x) => { x.shuttles = x.shuttles.filter((z) => z.id !== sel.id); });
    else if (sel.k === 'added') commit((x) => { x.added = x.added.filter((z) => z.id !== sel.id); });
    else if (sel.k === 'booth') commit((x) => { x.booths = x.booths.filter((z) => z.id !== sel.id); });
    else if (sel.k === 'carnival') commit((x) => { x.carnival = x.carnival.filter((z) => z.id !== sel.id); });
    else if (sel.k === 'annakut') commit((x) => { x.annakut = x.annakut.filter((z) => z.id !== sel.id); });
    else if (sel.k === 'exitem') commit((x) => { x.exItems = x.exItems.filter((z) => z.id !== sel.id); });
    else if (sel.k === 'drape') commit((x) => { x.drapes = x.drapes.filter((z) => z.id !== sel.id); });
    else if (sel.k === 'display') commit((x) => { x.displays = x.displays.filter((z) => z.id !== sel.id); });
    else if (sel.k === 'canopy') commit((x) => { x.canopies = x.canopies.filter((z) => z.id !== sel.id); });
    else if (sel.k === 'shoes') commit((x) => { x.shoes = x.shoes.filter((z) => z.id !== sel.id); });
    else if (sel.k === 'ramp') commit((x) => { x.ramps = x.ramps.filter((z) => z.id !== sel.id); });
    else if (sel.k === 'erase') commit((x) => { x.erase.splice(+sel.id, 1); });
    else if (!e.hidden.includes(sel.k + sel.id)) commit((x) => { x.hidden.push(sel.k + sel.id); });
    setSel(null);
  };
  const kbd = useRef<(ev: KeyboardEvent) => void>(() => {});
  kbd.current = (ev) => {
    const t = ev.target as HTMLElement;
    const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
    if (ev.code === 'Space' && !typing) { space.current = ev.type === 'keydown'; if (ev.type === 'keydown') ev.preventDefault(); return; }
    if (ev.type !== 'keydown' || typing) return;
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'z') {
      ev.preventDefault(); ev.stopImmediatePropagation();
      if (ev.shiftKey) redo(); else undo();
      return;
    }
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); deleteSel(); return; }
    if (ev.key === 'Escape') { setDraft(null); drag.current = null; setSel(null); setTool('select'); return; }
    const m = TOOLS.find((q) => q[2].toLowerCase() === ev.key.toLowerCase());
    if (m) setTool(m[0]);
  };
  useEffect(() => {
    const h = (ev: KeyboardEvent) => kbd.current(ev);
    window.addEventListener('keydown', h, true);
    window.addEventListener('keyup', h, true);
    return () => { window.removeEventListener('keydown', h, true); window.removeEventListener('keyup', h, true); };
  }, []);

  /* ───────── derived ───────── */
  const selKey = sel ? (EDIT_KINDS.includes(sel.k) ? sel.k + ':' + sel.id : sel.k + sel.id) : '';
  const selBaseKey = sel && !EDIT_KINDS.includes(sel.k) ? sel.k + sel.id : '';
  const selItem = sel ? getItem(e, sel) : null;
  const vb = `${vp.cx - (box.w * vp.s) / 2} ${-vp.cy - (box.h * vp.s) / 2} ${box.w * vp.s} ${box.h * vp.s}`;
  const hs = 6 * vp.s;
  const u = e.under;

  const exportJSON = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(e, null, 2)], { type: 'application/json' }));
    a.download = 'campus-edits.json';
    a.click();
  };

  return (
    <div className="view-full" style={{ flexDirection: 'column' }}>
      <div className="view-tight" style={{ paddingBottom: 8, flex: 'none' }}>
        <div className="section-title" style={{ margin: 0 }}>
          <h1 className="h-display">Campus plan</h1>
          <span className="muted small">Blueprint of the whole campus. Fix walls, move zones, add gates and items — everything shows up in Campus 3D. Edits save in this browser; your DWG data is never changed.</span>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 12, padding: '0 16px 16px' }}>
        <div ref={wrap} style={{ flex: 1, position: 'relative', minWidth: 0, borderRadius: 16, overflow: 'hidden', background: '#0c1d30', border: '1px solid #223a55' }}>
          {!base && <div className="empty">Loading campus…</div>}
          <svg
            ref={svg}
            width="100%"
            height="100%"
            viewBox={vb}
            style={{ touchAction: 'none', display: 'block', cursor: tool === 'select' ? 'default' : tool === 'under' ? 'move' : 'crosshair', userSelect: 'none' }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onContextMenu={(ev) => ev.preventDefault()}
          >
            <defs>
              <pattern id="cgrid" width={50} height={50} patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="#18314d" strokeWidth={1} {...nsc} /></pattern>
            </defs>
            <g transform="scale(1,-1)">
              <rect x={-1500} y={-1500} width={3000} height={3000} fill="url(#cgrid)" pointerEvents="none" />
              {layers.under && u.on && (
                <g transform={`translate(${u.x},${u.y}) scale(${u.s},${-u.s})`} opacity={u.op} pointerEvents="none">
                  <image href="campus-map.png" width={1280} height={1180} />
                </g>
              )}
              {base && <BaseLayers base={base} hidden={e.hidden} erase={e.erase} showHidden={showHidden} layers={layers} selKey={selBaseKey} />}
              {base && layers.rooms && vp.s < 1.3 && <RoomLabels base={base} size={Math.max(4, 9 * vp.s)} all={vp.s < 0.45} />}
              <EditedLayer e={e} s={vp.s} selKey={selKey} layers={layers} />
              {/* hall origin */}
              <g pointerEvents="none" stroke="#ff7a59" strokeWidth={1} {...nsc}><line x1={-6} y1={0} x2={6} y2={0} /><line x1={0} y1={-6} x2={0} y2={6} /></g>
              {/* selection handles */}
              {selItem && sel && ['zone', 'added', 'erase'].includes(sel.k) && 'r' in selItem && (
                <g>
                  {([['nw', 0, 3], ['ne', 1, 3], ['sw', 0, 2], ['se', 1, 2]] as const).map(([h, xi, yi]) => (
                    <rect key={h} x={selItem.r[xi] - hs / 2} y={selItem.r[yi] - hs / 2} width={hs} height={hs} fill={HIGHLIGHT} stroke="#000" strokeWidth={1} {...nsc} data-handle={h} style={{ cursor: 'nwse-resize' }} />
                  ))}
                </g>
              )}
              {selItem && sel?.k === 'added' && 'a' in selItem && (
                <g>
                  {(['a', 'b'] as const).map((h) => <circle key={h} cx={selItem[h][0]} cy={selItem[h][1]} r={hs * 0.7} fill={HIGHLIGHT} stroke="#000" strokeWidth={1} {...nsc} data-handle={h} style={{ cursor: 'move' }} />)}
                </g>
              )}
              {draft && (
                tool === 'area'
                  ? <rect x={Math.min(draft.a[0], draft.b[0])} y={Math.min(draft.a[1], draft.b[1])} width={Math.abs(draft.b[0] - draft.a[0])} height={Math.abs(draft.b[1] - draft.a[1])} fill={HIGHLIGHT} fillOpacity={0.15} stroke={HIGHLIGHT} strokeWidth={1.5} strokeDasharray="4 3" {...nsc} pointerEvents="none" />
                  : <line x1={draft.a[0]} y1={draft.a[1]} x2={draft.b[0]} y2={draft.b[1]} stroke={HIGHLIGHT} strokeWidth={2} strokeDasharray="4 3" {...nsc} pointerEvents="none" />
              )}
            </g>
          </svg>

          <div className="tool-strip tl" style={{ maxWidth: 'calc(100% - 24px)', flexWrap: 'wrap' }}>
            {TOOLS.map(([k, label, key]) => (
              <button key={k} className="chip" aria-pressed={tool === k} onClick={() => setTool(k)} title={`${label} (${key})`}>{label}</button>
            ))}
            {tool === 'area' && (
              <select className="input" style={{ height: 28, fontSize: 12 }} value={areaKind} onChange={(ev) => setAreaKind(ev.target.value as AreaTool)}>
                {AREA_KINDS.map((k) => <option key={k} value={k}>{k === 'zone' ? 'Event zone' : k === 'erase' ? 'Erase DWG items' : k === 'block' ? 'Building block' : k}</option>)}
              </select>
            )}
          </div>
          <div className="tool-strip bl">
            <button className="chip" onClick={undo} disabled={!canUndo} style={{ opacity: canUndo ? 1 : 0.4 }}>Undo</button>
            <button className="chip" onClick={redo} disabled={!canRedo} style={{ opacity: canRedo ? 1 : 0.4 }}>Redo</button>
            <button className="chip" onClick={fit}>Fit</button>
            <select className="input" style={{ height: 28, fontSize: 12 }} value={snapG} onChange={(ev) => setSnapG(parseFloat(ev.target.value))} title="Snap to grid">
              <option value={0}>No snap</option><option value={0.5}>Snap 0.5′</option><option value={1}>Snap 1′</option><option value={2}>Snap 2′</option><option value={5}>Snap 5′</option>
            </select>
          </div>
          <div className="cam-badge">x {cursor[0].toFixed(1)}′  ·  y {cursor[1].toFixed(1)}′  ·  hall SW corner = (0, 0)</div>
        </div>

        {/* side panel */}
        <div className="stack" style={{ width: 310, flex: 'none', overflow: 'auto', gap: 10 }}>
          <div className="card" style={{ padding: 14 }}>
            <span className="eyebrow">{sel ? 'Selected' : 'Nothing selected'}</span>
            {!sel && <p className="small muted" style={{ margin: '6px 0 0' }}>Click anything on the plan to select it. Drag zones, signs and added items to move them; drag the orange handles to resize. Scroll to zoom, drag the background or hold Space to pan. Delete removes (or hides, for DWG items).</p>}
            {sel && <Inspector sel={sel} e={e} item={selItem} onDelete={deleteSel} onClose={() => setSel(null)} />}
          </div>

          <div className="card" style={{ padding: 14 }}>
            <span className="eyebrow">Site-map image (tracing)</span>
            <div className="stack" style={{ gap: 8, marginTop: 8 }}>
              <label className="small row-flex" style={{ gap: 8 }}><input type="checkbox" checked={u.on} onChange={(ev) => commit((x) => { x.under.on = ev.target.checked; })} /> Show your Diwali site map under the plan</label>
              {u.on && (
                <>
                  <Field label="Opacity"><input type="range" min={0.1} max={1} step={0.05} value={u.op} onChange={(ev) => live((x) => { x.under.op = parseFloat(ev.target.value); })} style={{ width: '100%', accentColor: 'var(--terra)' }} /></Field>
                  <Field label="Scale (ft / px)"><NumIn value={u.s} step={0.005} onChange={(v) => commit((x) => { x.under.s = Math.max(0.05, v); })} /></Field>
                  <div className="row3" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                    <Field label="Offset x"><NumIn value={u.x} step={2} onChange={(v) => commit((x) => { x.under.x = v; })} suffix="ft" /></Field>
                    <Field label="Offset y"><NumIn value={u.y} step={2} onChange={(v) => commit((x) => { x.under.y = v; })} suffix="ft" /></Field>
                  </div>
                  <span className="tiny muted">Use “Move map image” (U) to drag it into register with the walls, then adjust scale.</span>
                </>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: 14 }}>
            <span className="eyebrow">Layers</span>
            <div className="chips" style={{ marginTop: 8 }}>
              {(Object.keys(layers) as (keyof Layers)[]).map((k) => (
                <button key={k} className="chip" aria-pressed={layers[k]} onClick={() => setLayers((l) => ({ ...l, [k]: !l[k] }))}>{k}</button>
              ))}
              <button className="chip" aria-pressed={showHidden} onClick={() => setShowHidden((v) => !v)} title="Show deleted DWG items faded so you can restore them">hidden ({e.hidden.length})</button>
            </div>
          </div>

          <div className="card" style={{ padding: 14 }}>
            <span className="eyebrow">Objects</span>
            <button className="btn btn-sm" style={{ marginTop: 10 }} title="Re-line the 10 booths along the east wall of the KDC zone" onClick={() => { const z = e.zones.find((q) => q.id === 'kdc'); if (z) commit((x) => { x.booths = lineBooths(z.r).map((nb, i) => ({ ...nb, title: x.booths[i]?.title ?? nb.title, sub: x.booths[i]?.sub ?? nb.sub, color: x.booths[i]?.color ?? nb.color })); }); }}>Line up KDC booths along its east wall</button>

            <div className="row-flex" style={{ gap: 6, marginTop: 8 }}>
              <select className="txt-in" defaultValue="" onChange={(ev) => { const k = ev.target.value as ExKind; if (!k) return; const K = EX_KINDS[k]; const id = newId('x'); commit((x) => x.exItems.push({ id, kind: k, x: KDC_KINDS.has(k) ? 222 : SITE_KINDS.has(k) ? -34 : 60, y: KDC_KINDS.has(k) ? 330 : SITE_KINDS.has(k) ? -40 : 47, yaw: K.yaw, w: K.w, d: K.d, t: k === 'label' ? 'Label' : undefined })); setSel({ k: 'exitem', id }); ev.target.value = ''; }}>
                <option value="">+ Add exhibit…</option>
                {(Object.keys(EX_KINDS) as ExKind[]).map((k) => <option key={k} value={k}>{EX_KINDS[k].label}</option>)}
              </select>
              <button className="btn btn-sm" onClick={() => { const id = newId('d'); commit((x) => x.drapes.push({ id, a: [50, 47], b: [70, 47], h: 12 })); setSel({ k: 'drape', id }); }}>+ Drape run</button>
            </div>
            <div className="stack" style={{ gap: 4, marginTop: 8, maxHeight: 260, overflow: 'auto' }}>
              {e.zones.map((z) => <ObjRow key={z.id} on={sel?.id === z.id && sel.k === 'zone'} onClick={() => setSel({ k: 'zone', id: z.id })} dot={z.color} label={z.label} sub="zone" />)}
              {e.signs.map((z) => <ObjRow key={z.id} on={sel?.id === z.id && sel.k === 'sign'} onClick={() => setSel({ k: 'sign', id: z.id })} dot="#c94f5a" label={`Sign ${z.n}`} sub="sign" />)}
              {e.shuttles.map((z, i) => <ObjRow key={z.id} on={sel?.id === z.id && sel.k === 'shuttle'} onClick={() => setSel({ k: 'shuttle', id: z.id })} dot="#f0b429" label={`Shuttle stop ${i + 1}`} sub="shuttle" />)}
              {e.booths.map((z, i) => <ObjRow key={z.id} on={sel?.id === z.id && sel.k === 'booth'} onClick={() => setSel({ k: 'booth', id: z.id })} dot={z.color} label={`Booth ${i + 1}: ${z.title}`} sub="booth" />)}
              {e.carnival.map((z) => <ObjRow key={z.id} on={sel?.id === z.id && sel.k === 'carnival'} onClick={() => setSel({ k: 'carnival', id: z.id })} dot="#c2255f" label={`Carnival gate`} sub="gate" />)}
              {e.annakut.map((z) => <ObjRow key={z.id} on={sel?.id === z.id && sel.k === 'annakut'} onClick={() => setSel({ k: 'annakut', id: z.id })} dot="#7a4aa0" label="Annakut layout" sub="mandir" />)}
              {e.exItems.map((z) => <ObjRow key={z.id} on={sel?.id === z.id && sel.k === 'exitem'} onClick={() => setSel({ k: 'exitem', id: z.id })} dot={EX_KINDS[z.kind].color} label={z.kind === 'label' ? `Label: ${z.t}` : EX_KINDS[z.kind].label} sub={KDC_KINDS.has(z.kind) ? 'KDC' : SITE_KINDS.has(z.kind) ? 'site' : 'exhibit'} />)}
              {e.drapes.map((z, i) => <ObjRow key={z.id} on={sel?.id === z.id && sel.k === 'drape'} onClick={() => setSel({ k: 'drape', id: z.id })} dot="#4a6fd0" label={`Pipe & drape ${i + 1}`} sub="drape" />)}
              {e.displays.map((z) => <ObjRow key={z.id} on={sel?.id === z.id && sel.k === 'display'} onClick={() => setSel({ k: 'display', id: z.id })} dot="#c9783a" label="Side-room display" sub="display" />)}
              {e.canopies.map((z) => <ObjRow key={z.id} on={sel?.id === z.id && sel.k === 'canopy'} onClick={() => setSel({ k: 'canopy', id: z.id })} dot="#3b4a7a" label="Solar canopy" sub="canopy" />)}
              {e.shoes.map((z) => <ObjRow key={z.id} on={sel?.id === z.id && sel.k === 'shoes'} onClick={() => setSel({ k: 'shoes', id: z.id })} dot="#9c3d22" label={`Shoe stands (${z.n})`} sub="shoes" />)}
              {e.ramps.map((z) => <ObjRow key={z.id} on={sel?.id === z.id && sel.k === 'ramp'} onClick={() => setSel({ k: 'ramp', id: z.id })} dot="#b3262e" label="Visitor ramp" sub="mandir" />)}
              {e.added.map((z) => <ObjRow key={z.id} on={sel?.id === z.id && sel.k === 'added'} onClick={() => setSel({ k: 'added', id: z.id })} dot="#ffe0a8" label={z.t === 'area' ? `${z.k} area` : z.t === 'gate' || z.t === 'text' ? `${z.t}: ${z.label}` : z.t} sub="added" />)}
              {e.erase.map((_, i) => <ObjRow key={i} on={sel?.id === String(i) && sel.k === 'erase'} onClick={() => setSel({ k: 'erase', id: String(i) })} dot="#e5604f" label={`Erased region ${i + 1}`} sub="erase" />)}
            </div>
          </div>

          <div className="card card-flat" style={{ padding: 14 }}>
            <span className="eyebrow">Edits file</span>
            <div className="row-flex" style={{ marginTop: 8, gap: 6 }}>
              <button className="btn btn-sm btn-terra" onClick={() => setView3('campus')}>View in 3D</button>
              <button className="btn btn-sm" onClick={exportJSON}>Export</button>
              <button className="btn btn-sm" onClick={() => fileRef.current?.click()}>Import</button>
              <button className="btn btn-sm" onClick={async () => { try { await navigator.clipboard.writeText(JSON.stringify(e)); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard refused */ } }}>{copied ? 'Copied' : 'Copy'}</button>
              <button className="btn btn-sm" style={armed ? { color: '#ff9a8c', borderColor: '#ff9a8c' } : undefined} onClick={() => { if (armed) { reset(); setArmed(false); setSel(null); } else { setArmed(true); setTimeout(() => setArmed(false), 4000); } }}>{armed ? 'Click again to reset all' : 'Reset all'}</button>
              <input ref={fileRef} type="file" accept=".json" hidden onChange={async (ev) => { const f = ev.target.files?.[0]; if (!f) return; try { if (!importJSON(JSON.parse(await f.text()))) alert('Not a campus edits file'); } catch { alert('Not a campus edits file'); } ev.target.value = ''; }} />
            </div>
            <span className="tiny muted" style={{ display: 'block', marginTop: 8 }}>Send me the exported file (or Copy and paste it) and I can read exactly what you changed.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ObjRow({ on, onClick, dot, label, sub }: { on: boolean; onClick: () => void; dot: string; label: string; sub: string }) {
  return (
    <button onClick={onClick} className="row-flex" style={{ gap: 8, padding: '4px 8px', borderRadius: 8, border: 0, background: on ? 'var(--ink-3)' : 'transparent', textAlign: 'left', width: '100%', flexWrap: 'nowrap' }}>
      <span className="dot" style={{ background: dot }} />
      <span className="small trunc" style={{ flex: 1 }}>{label}</span>
      <span className="tiny muted-3">{sub}</span>
    </button>
  );
}

/* ───────── inspector ───────── */
const BASE_NAMES: Record<string, string> = { w: 'Wall', g: 'Glazing', d: 'Door / opening', p: 'Planter', k: 'Sidewalk', t: 'Tree', l: 'Light pole' };
function Inspector({ sel, e, item, onDelete, onClose }: { sel: { k: string; id: string }; e: Edits; item: any; onDelete: () => void; onClose: () => void }) {
  const { commit, live, checkpoint } = useCE.getState();
  const upd = (fn: (it: any) => void) => commit((x) => { const it = getItem(x, sel); if (it) fn(it); });
  const num = (label: string, get: () => number, set: (it: any, v: number) => void, suffix = 'ft', step = 0.5) => (
    <Field label={label}><NumIn value={get()} step={step} suffix={suffix} onChange={(v) => upd((it) => set(it, v))} /></Field>
  );
  const rectFields = (it: any) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
      {num('West x', () => it.r[0], (o, v) => (o.r = [v, o.r[1], o.r[2], o.r[3]]))}
      {num('East x', () => it.r[1], (o, v) => (o.r = [o.r[0], v, o.r[2], o.r[3]]))}
      {num('South y', () => it.r[2], (o, v) => (o.r = [o.r[0], o.r[1], v, o.r[3]]))}
      {num('North y', () => it.r[3], (o, v) => (o.r = [o.r[0], o.r[1], o.r[2], v]))}
    </div>
  );
  const xy = (it: any) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
      {num('x', () => it.x, (o, v) => (o.x = v))}
      {num('y', () => it.y, (o, v) => (o.y = v))}
    </div>
  );
  const text = (label: string, value: string, set: (it: any, v: string) => void) => (
    <Field label={label}>
      <input className="txt-in" value={value} onFocus={() => checkpoint()} onChange={(ev) => live((x) => { const it = getItem(x, sel); if (it) set(it, ev.target.value); })} />
    </Field>
  );
  const head = (t: string) => <div className="row-flex" style={{ marginTop: 6, justifyContent: 'space-between' }}><b className="h2">{t}</b><button className="btn btn-sm btn-ghost" onClick={onClose}>Done</button></div>;

  // base (DWG) items
  if (BASE_NAMES[sel.k]) {
    const key = sel.k + sel.id;
    const isHidden = e.hidden.includes(key);
    const wallDefault = 16;
    return (
      <div className="stack" style={{ gap: 8 }}>
        {head(`${BASE_NAMES[sel.k]} #${sel.id}`)}
        <span className="tiny muted">From the DWG. {isHidden ? 'Currently hidden.' : 'Delete hides it from both views; you can restore it.'}</span>
        {sel.k === 'w' && !isHidden && (
          <Field label="Height override">
            <NumIn value={e.wallH[key] ?? wallDefault} step={1} suffix="ft" onChange={(v) => commit((x) => { x.wallH[key] = v; })} />
          </Field>
        )}
        {sel.k === 'w' && e.wallH[key] !== undefined && <button className="btn btn-sm" onClick={() => commit((x) => { delete x.wallH[key]; })}>Reset height</button>}
        <div className="row-flex">
          {isHidden
            ? <button className="btn btn-sm btn-terra" onClick={() => commit((x) => { x.hidden = x.hidden.filter((h) => h !== key); })}>Restore</button>
            : <button className="btn btn-sm" onClick={onDelete}>Hide (Delete)</button>}
        </div>
      </div>
    );
  }
  if (!item) return <span className="small muted">That item no longer exists.</span>;
  const del = <button className="btn btn-sm" onClick={onDelete}>Delete</button>;

  if (sel.k === 'zone') {
    return (
      <div className="stack" style={{ gap: 8 }}>
        {head('Zone')}
        {text('Label', item.label, (it, v) => (it.label = v))}
        <Field label="Colour"><input type="color" value={item.color} onChange={(ev) => upd((it) => (it.color = ev.target.value))} style={{ width: 60, height: 28, border: 0, background: 'none' }} /></Field>
        <label className="small row-flex" style={{ gap: 8 }}><input type="checkbox" checked={item.tents} onChange={(ev) => upd((it) => (it.tents = ev.target.checked))} /> Fill with vendor tents</label>
        {rectFields(item)}
        {del}
      </div>
    );
  }
  if (sel.k === 'booth') return (
    <div className="stack" style={{ gap: 8 }}>
      {head('Festival booth (16 × 16 ft)')}
      {text('Festival', item.title, (it, v) => (it.title = v))}
      {text('Subtitle', item.sub, (it, v) => (it.sub = v))}
      <Field label="Colour"><input type="color" value={item.color} onChange={(ev) => upd((it) => (it.color = ev.target.value))} style={{ width: 60, height: 28, border: 0, background: 'none' }} /></Field>
      {xy(item)}
      {num('Faces', () => item.yaw, (o, v) => (o.yaw = v), '°', 90)}
      <span className="tiny muted">Facing: 0° = east, 90° = north, 180° = west, 270° = south. Booths along the east wall face west (180°).</span>
      {del}
    </div>
  );
  if (sel.k === 'carnival') return (
    <div className="stack" style={{ gap: 8 }}>
      {head('Carnival gate')}
      {text('Sign text', item.title, (it, v) => (it.title = v))}
      {xy(item)}
      <Field label="Style">
        <select className="txt-in" value={item.style || 'arch'} onChange={(ev) => upd((o) => (o.style = ev.target.value))}>
          <option value="arch">Crescent pillars + scalloped arch</option>
          <option value="towers">Pink towers</option>
            <option value="utsavpur">Utsavpur gate</option>
        </select>
      </Field>
      {num('Width', () => item.w, (o, v) => (o.w = Math.max(12, v)))}
      {num('Faces', () => item.yaw, (o, v) => (o.yaw = v), '°', 90)}
      <span className="tiny muted">The marked line is the gate; the dashed carpet runs the way it faces (−90° = south, toward visitors arriving from the south).</span>
      {del}
    </div>
  );
  if (sel.k === 'drape') return (
    <div className="stack" style={{ gap: 8 }}>
      {head('Pipe & drape run')}
      {num('Start x', () => item.a[0], (o, v) => (o.a = [v, o.a[1]]))}
      {num('Start y', () => item.a[1], (o, v) => (o.a = [o.a[0], v]))}
      {num('End x', () => item.b[0], (o, v) => (o.b = [v, o.b[1]]))}
      {num('End y', () => item.b[1], (o, v) => (o.b = [o.b[0], v]))}
      {num('Height', () => item.h, (o, v) => (o.h = Math.max(4, v)))}
      <span className="tiny muted">Black pleated drape on pipe, drawn from start to end. Drag the line to move the whole run.</span>
      {del}
    </div>
  );
  if (sel.k === 'exitem') return (
    <div className="stack" style={{ gap: 8 }}>
      {head(EX_KINDS[item.kind as ExKind].label)}
      {item.kind === 'label' && text('Text', item.t || '', (it, v) => (it.t = v))}
      {xy(item)}
      {num('Faces', () => item.yaw, (o, v) => (o.yaw = v), '°', 15)}
      {!['house', 'stages', 'indiaMap', 'tv', 'nvBox', 'dioramaGod', 'dioramaGuru', 'capa', 'nvVarni', 'shootout', 'steps', 'quest', 'moonwalker', 'castle'].includes(item.kind) && num('Width', () => item.w, (o, v) => (o.w = Math.max(1, v)))}
      {['line', 'photo', 'calendar', 'santMilan', 'mandir', 'shastra', 'sant', 'actSpace', 'pocket', 'rath', 'path', 'fence'].includes(item.kind) && num('Depth', () => item.d, (o, v) => (o.d = Math.max(1, v)))}
      <span className="tiny muted">Facing: 0° = east, 90° = north, 180° = west, 270° = south — the direction visitors see the front from. The 16-stage unit only moves (it doesn't rotate).</span>
      {del}
    </div>
  );
  if (sel.k === 'display') return (
    <div className="stack" style={{ gap: 8 }}>
      {head('Side-room display')}
      {xy(item)}
      {num('Width', () => item.w, (o, v) => (o.w = Math.max(10, v)))}
      {num('Depth', () => item.d, (o, v) => (o.d = Math.max(6, v)))}
      {num('Rotation', () => item.yaw, (o, v) => (o.yaw = v), '°', 90)}
      <span className="tiny muted">Tiered food pyramid with a tiled-roof backdrop (last year's annakut photo). 0° puts the backdrop against the north wall; 90° = west wall, 180° = south, 270° = east.</span>
      {del}
    </div>
  );
  if (sel.k === 'canopy') return (
    <div className="stack" style={{ gap: 8 }}>
      {head('Solar canopy')}
      {rectFields(item)}
      {num('Low (north) eave height', () => item.h, (o, v) => (o.h = Math.max(10, v)))}
      <span className="tiny muted">Steel frame with solar panels; the south edge is 4 ft higher than this height.</span>
      {del}
    </div>
  );
  if (sel.k === 'shoes') return (
    <div className="stack" style={{ gap: 8 }}>
      {head('Shoe stands')}
      {xy(item)}
      {num('Modules (6 ft each)', () => item.n, (o, v) => (o.n = Math.max(1, Math.round(v))), '', 1)}
      {num('Direction', () => item.yaw, (o, v) => (o.yaw = v), '°', 90)}
      <span className="tiny muted">The row starts at the marked point and runs in this direction (0° = east). Stands are 1.5 ft deep, about 6.5 ft tall.</span>
      {del}
    </div>
  );
  if (sel.k === 'ramp') return (
    <div className="stack" style={{ gap: 8 }}>
      {head('Visitor ramp')}
      {xy(item)}
      {num('Direction', () => item.yaw, (o, v) => (o.yaw = v), '°', 90)}
      {num('Length', () => item.len, (o, v) => (o.len = Math.max(4, v)))}
      {num('Width', () => item.w, (o, v) => (o.w = Math.max(3, v)))}
      {num('Rise', () => item.h, (o, v) => (o.h = Math.max(0.2, v)), 'ft', 0.25)}
      <label className="tiny" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={!!item.flat} onChange={(ev) => upd((o) => (o.flat = ev.target.checked))} />Flat platform (no slope)</label>
      {num('Ground lane beside it', () => item.lane, (o, v) => (o.lane = v))}
      <span className="tiny muted">Starts at the marked point (the doorway) and runs in the direction. Lane: positive = left of travel, negative = right, 0 = none (the other queue line on the ground).</span>
      {del}
    </div>
  );
  if (sel.k === 'annakut') return (
    <div className="stack" style={{ gap: 8 }}>
      {head('Annakut layout (Mandir Hall)')}
      {xy(item)}
      {num('Width', () => item.w, (o, v) => (o.w = Math.max(20, v)))}
      {num('Depth', () => item.d, (o, v) => (o.d = Math.max(16, v)))}
      {num('Rotation', () => item.yaw, (o, v) => (o.yaw = v), '°', 90)}
      <span className="tiny muted">0° puts the shrine and tiers against the north wall; 90° = west wall, 180° = south, 270° = east.</span>
      {del}
    </div>
  );
  if (sel.k === 'sign') return <div className="stack" style={{ gap: 8 }}>{head(`Sign ${item.n}`)}{num('Number', () => item.n, (it, v) => (it.n = Math.round(v)), '', 1)}{xy(item)}{del}</div>;
  if (sel.k === 'shuttle') return <div className="stack" style={{ gap: 8 }}>{head('Shuttle stop')}{xy(item)}{del}</div>;
  if (sel.k === 'erase') return <div className="stack" style={{ gap: 8 }}>{head('Erased region')}<span className="tiny muted">Every DWG item inside this box (cars, curbs, walls, trees…) is removed from both views.</span>{rectFields(item)}{del}</div>;

  // added items
  const it = item as Added;
  return (
    <div className="stack" style={{ gap: 8 }}>
      {head(it.t === 'area' ? `${it.k} area` : it.t[0].toUpperCase() + it.t.slice(1))}
      {(it.t === 'wall' || it.t === 'glass' || it.t === 'door') && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
            {num('Start x', () => it.a[0], (o, v) => (o.a = [v, o.a[1]]))}
            {num('Start y', () => it.a[1], (o, v) => (o.a = [o.a[0], v]))}
            {num('End x', () => it.b[0], (o, v) => (o.b = [v, o.b[1]]))}
            {num('End y', () => it.b[1], (o, v) => (o.b = [o.b[0], v]))}
          </div>
          {it.t === 'wall' && num('Thickness', () => it.w, (o, v) => (o.w = Math.max(0.2, v)))}
          {(it.t === 'wall' || it.t === 'glass') && num('Height', () => it.h, (o, v) => (o.h = Math.max(1, v)))}
        </>
      )}
      {it.t === 'area' && (
        <>
          <Field label="Type">
            <select className="txt-in" value={it.k} onChange={(ev) => upd((o) => (o.k = ev.target.value))}>
              {['lawn', 'paving', 'asphalt', 'floor', 'water', 'block'].map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </Field>
          {it.k === 'block' && num('Height', () => it.h, (o, v) => (o.h = Math.max(1, v)))}
          {rectFields(it)}
        </>
      )}
      {(it.t === 'tree' || it.t === 'tent' || it.t === 'gate' || it.t === 'text') && xy(it)}
      {it.t === 'tent' && <Field label="Colour"><input type="color" value={it.c} onChange={(ev) => upd((o) => (o.c = ev.target.value))} style={{ width: 60, height: 28, border: 0, background: 'none' }} /></Field>}
      {it.t === 'gate' && (
        <>
          {text('Sign text', it.label, (o, v) => (o.label = v))}
          {num('Opening width', () => it.w, (o, v) => (o.w = Math.max(6, v)))}
          {num('Rotation', () => it.yaw, (o, v) => (o.yaw = v), '°', 15)}
          <span className="tiny muted">Rotation 0° faces the sign south; 90° faces it west, etc.</span>
        </>
      )}
      {it.t === 'text' && text('Text', it.label, (o, v) => (o.label = v))}
      {del}
    </div>
  );
}
