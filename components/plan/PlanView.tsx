'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore, isProbeId } from '@/lib/store';
import type { Item, V2 } from '@/lib/types';
import { itemFootprint, TYPES, absPts, params as itemParams, drapeCounts, drapeUprights, stanchionCount } from '@/lib/catalog';
import { fixtureWorld, projectOnRun, drapeHang } from '@/lib/rig';
import { resolveModel } from '@/lib/fixtures';
import { HALL, OPENINGS, openingSegment, ROOM_POLY } from '@/lib/hall';
import { SECTION_MAP } from '@/lib/content';
import { DEG, pointInPoly, fmtFt, facing as facingVec, uid } from '@/lib/geom';
import { luxColor, photoColor, uvColor, luxGradientCss, LUX_TICKS, tickPos, PHOTO_BANDS, VERDICT_COLOR, fmtLux, fc } from '@/lib/heat';
import { Icon, Seg } from '../ui';
import dwg from '@/lib/dwgContext.json';

type Tool = 'select' | 'probe' | 'measure' | { place: string };
type Drag =
  | { kind: 'pan'; sx: number; sy: number; cx: number; cy: number }
  | { kind: 'move'; id: string; ox: number; oy: number; wx: number; wy: number; moved: boolean }
  | { kind: 'rotate'; id: string }
  | { kind: 'aim'; id: string }
  | { kind: 'slide'; id: string; run: string }
  | { kind: 'vertex'; id: string; idx: number }
  | { kind: 'probe'; id: string; ox: number; oy: number; wx: number; wy: number }
  | { kind: 'probeFace'; id: string };

const DIR_LABELS = ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE'];
const DRAPE_COLORS: Record<string, string> = { black: '#6b625c', ivory: '#e9dccb', maroon: '#a63a42' };

export default function PlanView() {
  const project = useStore((s) => s.project);
  const result = useStore((s) => s.result);
  const selected = useStore((s) => s.selected);
  const select = useStore((s) => s.select);
  const heat = useStore((s) => s.heat);
  const setHeat = useStore((s) => s.setHeat);
  const faceDir = useStore((s) => s.faceDir);
  const setFaceDir = useStore((s) => s.setFaceDir);
  const layers = useStore((s) => s.layers);
  const toggleLayer = useStore((s) => s.toggleLayer);
  const updateItem = useStore((s) => s.updateItem);
  const updateParams = useStore((s) => s.updateParams);
  const updateProbe = useStore((s) => s.updateProbe);
  const addProbe = useStore((s) => s.addProbe);
  const addItem = useStore((s) => s.addItem);
  const removeItem = useStore((s) => s.removeItem);
  const removeProbe = useStore((s) => s.removeProbe);
  const duplicateItem = useStore((s) => s.duplicateItem);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1000, h: 700 });
  const [cam, setCam] = useState({ cx: 76, cy: 47.6, s: 6 });
  const [tool, setTool] = useState<Tool>('select');
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; sx: number; sy: number } | null>(null);
  const [measure, setMeasure] = useState<V2[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const fitted = useRef(false);

  const byId = useMemo(() => new Map(project.items.map((i) => [i.id, i])), [project.items]);

  // —— sizing & fit ——
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
      if (!fitted.current && r.width > 50) {
        fitted.current = true;
        fit(r.width, r.height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fit = (w = size.w, h = size.h) => {
    const bx0 = -8, bx1 = 163, by0 = -6, by1 = 101;
    const s = Math.min(w / (bx1 - bx0), h / (by1 - by0)) * 0.96;
    setCam({ cx: (bx0 + bx1) / 2, cy: (by0 + by1) / 2, s });
  };

  const toScreen = useCallback((x: number, y: number) => ({ x: size.w / 2 + (x - cam.cx) * cam.s, y: size.h / 2 - (y - cam.cy) * cam.s }), [cam, size]);
  const toWorld = useCallback(
    (sx: number, sy: number) => ({ x: cam.cx + (sx - size.w / 2) / cam.s, y: cam.cy - (sy - size.h / 2) / cam.s }),
    [cam, size],
  );
  const evPos = (e: React.PointerEvent | React.WheelEvent | PointerEvent) => {
    const r = wrapRef.current!.getBoundingClientRect();
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    return { sx, sy, ...toWorld(sx, sy) };
  };
  const snap = (v: number, e: { shiftKey: boolean }) => (e.shiftKey ? v : Math.round(v * 2) / 2);

  // —— heatmap image ——
  const heatUrl = useMemo(() => {
    if (!result || heat === 'none') return null;
    const g = result.grid;
    const c = document.createElement('canvas');
    c.width = g.nx;
    c.height = g.ny;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(g.nx, g.ny);
    for (let j = 0; j < g.ny; j++)
      for (let i = 0; i < g.nx; i++) {
        const k = j * g.nx + i;
        const o = (j * g.nx + i) * 4;
        const m = g.mask[k];
        if (m === 0 || m === 2) {
          img.data[o + 3] = 0;
          continue;
        }
        let v = 0;
        let col: [number, number, number];
        if (heat === 'floor') col = luxColor((v = g.floor[k]));
        else if (heat === 'uv') col = uvColor((v = g.uv[k]));
        else {
          v = faceDir === null ? g.cyl[k] : g.e8[k * 8 + faceDir];
          col = heat === 'photo' ? photoColor(v) : luxColor(v);
        }
        img.data[o] = col[0];
        img.data[o + 1] = col[1];
        img.data[o + 2] = col[2];
        img.data[o + 3] = heat === 'photo' ? 200 : 235;
      }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  }, [result, heat, faceDir]);

  // —— context path from the DWG ——
  const ctxPaths = useMemo(() => {
    const mk = (segs: number[][]) => segs.map((s) => `M${s[0]} ${s[1]}L${s[2]} ${s[3]}`).join('');
    const d = dwg as any;
    return { wall: mk(d.wall), door: mk(d.door), glaz: mk(d.glaz), stair: mk(d.stair), other: mk(d.other) };
  }, []);
  const ctxLabels = useMemo(() => {
    // merge two-line room labels (e.g. ASSEMBLY / HALL)
    const L = (dwg as any).labels as [string, number, number][];
    const used = new Set<number>();
    const out: { t: string; x: number; y: number }[] = [];
    L.forEach((a, i) => {
      if (used.has(i)) return;
      const j = L.findIndex((b, k) => k !== i && !used.has(k) && Math.abs(b[1] - a[1]) < 6 && Math.abs(b[2] - a[2]) < 9 && b[2] < a[2]);
      if (j >= 0) {
        used.add(j);
        out.push({ t: `${a[0].trim()} ${L[j][0].trim()}`, x: (a[1] + L[j][1]) / 2, y: (a[2] + L[j][2]) / 2 });
      } else out.push({ t: a[0].trim(), x: a[1], y: a[2] });
      used.add(i);
    });
    return out.filter((l) => !(l.x > 0 && l.x < HALL.W && l.y > 0 && l.y < HALL.D));
  }, []);

  // —— egress landings ——
  const egress = useMemo(() => {
    const foot = project.items.filter((i) => !i.hidden && !['fixture', 'lilyPath', 'zoneArea', 'floorMark', 'booth'].includes(i.type)).map((i) => ({ i, poly: footPoly(i) }));
    return OPENINGS.filter((o) => o.exit).map((o) => {
      const [a, b] = openingSegment(o);
      const depth = 5;
      const inward = o.wall === 'S' ? { x: 0, y: 1 } : o.wall === 'N' ? { x: 0, y: -1 } : o.wall === 'W' ? { x: 1, y: 0 } : { x: -1, y: 0 };
      const poly = [a, b, { x: b.x + inward.x * depth, y: b.y + inward.y * depth }, { x: a.x + inward.x * depth, y: a.y + inward.y * depth }];
      let blockedBy: Item | null = null;
      for (let s = 0; s <= 6 && !blockedBy; s++)
        for (let t = 0; t <= 4 && !blockedBy; t++) {
          const p = { x: a.x + (b.x - a.x) * (s / 6) + inward.x * depth * (t / 4) + inward.x * 0.2, y: a.y + (b.y - a.y) * (s / 6) + inward.y * depth * (t / 4) + inward.y * 0.2 };
          for (const f of foot) {
            if (f.i.type === 'stanchions' || f.i.type === 'drape') {
              if (nearPolyline(p, f.poly, 0.6)) blockedBy = f.i;
            } else if (f.poly.length > 2 && pointInPoly(p, f.poly)) blockedBy = f.i;
            if (blockedBy) break;
          }
        }
      return { o, poly, blockedBy };
    });
  }, [project.items]);

  // —— pointer handlers ——
  const onWheel = (e: React.WheelEvent) => {
    const p = evPos(e);
    const k = Math.exp(-e.deltaY * 0.0015);
    const s = Math.max(1.5, Math.min(60, cam.s * k));
    setCam({ s, cx: p.x - (p.sx - size.w / 2) / s, cy: p.y + (p.sy - size.h / 2) / s });
  };
  const onBgDown = (e: React.PointerEvent) => {
    const p = evPos(e);
    setAddOpen(false);
    if (typeof tool === 'object') {
      const def = TYPES[tool.place];
      const base: any = { type: tool.place, name: def.label, section: 'infra', x: snap(p.x, e), y: snap(p.y, e), rot: 90, params: { ...def.defaults } };
      if (tool.place === 'drape') base.points = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
      if (tool.place === 'stanchions') base.points = [{ x: 0, y: 0 }, { x: 14, y: 0 }];
      if (tool.place === 'lilyPath') base.points = [{ x: 0, y: 0 }, { x: 10, y: 4 }];
      if (tool.place === 'zoneArea') base.points = [{ x: 0, y: 0 }, { x: 16, y: 0 }, { x: 16, y: 16 }, { x: 0, y: 16 }];
      if (tool.place === 'fixture') {
        base.params = { model: 'gallery30', mount: 'floor', h: 8, dim: 1, aim: { x: snap(p.x, e), y: snap(p.y, e) + 8, z: 4 } };
        base.name = 'New fixture';
      }
      addItem(base);
      setTool('select');
      return;
    }
    if (tool === 'probe') {
      addProbe({ name: `Person ${project.probes.length + 1}`, x: snap(p.x, e), y: snap(p.y, e), facing: 270 });
      setTool('select');
      return;
    }
    if (tool === 'measure') {
      setMeasure((m) => (m.length >= 2 ? [{ x: p.x, y: p.y }] : [...m, { x: p.x, y: p.y }]));
      return;
    }
    select(null);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDrag({ kind: 'pan', sx: p.sx, sy: p.sy, cx: cam.cx, cy: cam.cy });
  };
  const startMove = (e: React.PointerEvent, it: Item) => {
    e.stopPropagation();
    if (tool !== 'select') return onBgDown(e);
    select(it.id);
    if (it.locked) return;
    const p = evPos(e);
    let target = it;
    if (it.type === 'fixture' && it.params.rig && byId.get(it.params.rig)) target = byId.get(it.params.rig)!;
    if (target.type === 'drape') {
      // a fixture on a drape light pipe slides along the run instead of dragging the whole drape
      wrapRef.current?.setPointerCapture?.(e.pointerId);
      setDrag({ kind: 'slide', id: it.id, run: target.id });
      return;
    }
    wrapRef.current?.setPointerCapture?.(e.pointerId);
    setDrag({ kind: 'move', id: target.id, ox: target.x, oy: target.y, wx: p.x, wy: p.y, moved: false });
  };
  const onMove = (e: React.PointerEvent) => {
    const p = evPos(e);
    setHover({ x: p.x, y: p.y, sx: p.sx, sy: p.sy });
    if (!drag) return;
    if (drag.kind === 'pan') {
      setCam((c) => ({ ...c, cx: drag.cx - (p.sx - drag.sx) / c.s, cy: drag.cy + (p.sy - drag.sy) / c.s }));
    } else if (drag.kind === 'move') {
      const nx = snap(drag.ox + (p.x - drag.wx), e), ny = snap(drag.oy + (p.y - drag.wy), e);
      updateItem(drag.id, { x: nx, y: ny }, `move-${drag.id}`);
    } else if (drag.kind === 'rotate') {
      const it = byId.get(drag.id);
      if (!it) return;
      let a = (Math.atan2(p.y - it.y, p.x - it.x) * 180) / Math.PI;
      if (!e.shiftKey) a = Math.round(a / 15) * 15;
      updateItem(drag.id, { rot: (a + 360) % 360 }, `rot-${drag.id}`);
    } else if (drag.kind === 'slide') {
      const run = byId.get(drag.run);
      if (!run) return;
      const u = Math.round(projectOnRun(run, p.x, p.y) * (e.shiftKey ? 10 : 2)) / (e.shiftKey ? 10 : 2);
      updateParams(drag.id, { u }, `slide-${drag.id}`);
    } else if (drag.kind === 'aim') {
      const it = byId.get(drag.id);
      if (!it) return;
      updateParams(drag.id, { aim: { ...(it.params.aim || { z: 4 }), x: snap(p.x, e), y: snap(p.y, e) } }, `aim-${drag.id}`);
    } else if (drag.kind === 'vertex') {
      const it = byId.get(drag.id);
      if (!it || !it.points) return;
      const pts = it.points.map((q, i) => (i === drag.idx ? { x: snap(p.x, e) - it.x, y: snap(p.y, e) - it.y } : q));
      updateItem(drag.id, { points: pts }, `vtx-${drag.id}-${drag.idx}`);
    } else if (drag.kind === 'probe') {
      updateProbe(drag.id, { x: snap(drag.ox + (p.x - drag.wx), e), y: snap(drag.oy + (p.y - drag.wy), e) }, `pmove-${drag.id}`);
    } else if (drag.kind === 'probeFace') {
      const pr = project.probes.find((q) => q.id === drag.id);
      if (!pr) return;
      let a = (Math.atan2(p.y - pr.y, p.x - pr.x) * 180) / Math.PI;
      if (!e.shiftKey) a = Math.round(a / 15) * 15;
      updateProbe(drag.id, { facing: (a + 360) % 360 }, `pface-${drag.id}`);
    }
  };
  const onUp = () => setDrag(null);

  // —— keyboard ——
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.tagName === 'SELECT')) return;
      const sel = useStore.getState().selected;
      if (e.key === 'Escape') {
        setTool('select');
        select(null);
        setMeasure([]);
        setAddOpen(false);
        return;
      }
      if (!sel) return;
      const pr = isProbeId(sel);
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (pr) removeProbe(sel);
        else removeItem(sel);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd' && !pr) {
        e.preventDefault();
        duplicateItem(sel);
        return;
      }
      const it = useStore.getState().project.items.find((i) => i.id === sel);
      if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey) {
        const d = e.shiftKey ? -15 : 15;
        if (pr) {
          const q = useStore.getState().project.probes.find((x) => x.id === sel)!;
          updateProbe(sel, { facing: (q.facing + d + 360) % 360 });
        } else if (it) updateItem(sel, { rot: (it.rot + d + 360) % 360 });
        return;
      }
      const step = e.shiftKey ? 2 : 0.5;
      const nudge: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
      if (nudge[e.key]) {
        e.preventDefault();
        const [dx, dy] = nudge[e.key];
        if (pr) {
          const q = useStore.getState().project.probes.find((x) => x.id === sel)!;
          updateProbe(sel, { x: q.x + dx, y: q.y + dy }, `nudge-${sel}`);
        } else if (it) {
          const tgtIt = it.type === 'fixture' && it.params.rig ? useStore.getState().project.items.find((i) => i.id === it.params.rig) || it : it;
          if (tgtIt.type === 'drape' && it.type === 'fixture') useStore.getState().updateParams(it.id, { u: Math.max(0, (it.params.u ?? 0) + dx + dy) }, `nudge-${it.id}`);
          else updateItem(tgtIt.id, { x: tgtIt.x + dx, y: tgtIt.y + dy }, `nudge-${tgtIt.id}`);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [select, removeItem, removeProbe, duplicateItem, updateItem, updateProbe]);

  // —— hover readout values ——
  const readout = useMemo(() => {
    if (!hover || !result) return null;
    const g = result.grid;
    const i = Math.floor((hover.x - g.x0) / g.step), j = Math.floor((hover.y - g.y0) / g.step);
    if (i < 0 || j < 0 || i >= g.nx || j >= g.ny) return null;
    const k = j * g.nx + i;
    if (g.mask[k] === 0) return null;
    if (g.mask[k] === 2) return { inside: true } as any;
    const e8 = Array.from(g.e8.slice(k * 8, k * 8 + 8));
    return { floor: g.floor[k], cyl: g.cyl[k], e8, uv: g.uv[k], cri: g.cri[k], inside: false };
  }, [hover, result]);

  const sel = selected ? byId.get(selected) : null;
  const selProbe = selected && isProbeId(selected) ? project.probes.find((p) => p.id === selected) : null;
  const s = cam.s;
  const gT = `translate(${size.w / 2 - cam.cx * s} ${size.h / 2 + cam.cy * s}) scale(${s} ${-s})`;
  const showLabels = layers.labels && s > 3.2;
  const zoneSecs = useMemo(() => new Set(project.items.filter((b) => b.type === 'booth' && b.params?.zone && SECTION_MAP[b.section]?.num).map((b) => b.section)), [project.items]);

  // fixtures & beams
  const fixtures = useMemo(
    () =>
      project.items
        .filter((i) => i.type === 'fixture' && !i.hidden)
        .map((f) => {
          const pos = fixtureWorld(f, byId);
          const m = resolveModel(f.params.model, project.artSpotVariant);
          const aim = f.params.aim || { x: pos.x, y: pos.y + 5, z: 0 };
          return { f, pos, m, aim, beam: beamFoot(pos, aim, m ? ((m.zoom ? f.params.zoom ?? m.beam : m.beam) * m.field) / m.beam : 30), core: beamFoot(pos, aim, m ? (m.zoom ? f.params.zoom ?? m.beam : m.beam) : 20) };
        }),
    [project.items, byId, project.artSpotVariant],
  );

  const probeRes = useMemo(() => new Map((result?.probes || []).map((p) => [p.id, p])), [result]);
  const ADDABLE = ['posterStand', 'poster', 'banner', 'signStand', 'drape', 'stanchions', 'tbar', 'crank', 'pipebar', 'fixture', 'table', 'diorama', 'mirrors', 'kiosk', 'tvArch', 'fiberTower', 'mapDeck', 'lwall', 'house', 'nailWall', 'pillars', 'lilyPath', 'floorMark', 'zoneArea'];

  return (
    <div className="view-full" style={{ flexDirection: 'column' }}>
      <div className="view-tight" style={{ paddingBottom: 8, flex: 'none' }}>
        <div className="section-title" style={{ margin: 0 }}>
          <h1 className="h-display">Plan & light map</h1>
          <span className="muted small">Drag to move · drag the ◯ handle to rotate · drag ✛ to re-aim a light · wheel to zoom · R rotate · ⌫ delete · ⌘D duplicate</span>
        </div>
      </div>
      <div
        ref={wrapRef}
        className={`plan-wrap ${typeof tool === 'object' || tool !== 'select' ? 'tool-add' : ''}`}
        onWheel={onWheel}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={() => setHover(null)}
      >
        <svg width={size.w} height={size.h} onPointerDown={onBgDown}>
          <defs>
            <pattern id="hatch" width="1.2" height="1.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="1.2" stroke="#ffffff14" strokeWidth="0.35" />
            </pattern>
            <pattern id="grid5" width="5" height="5" patternUnits="userSpaceOnUse">
              <path d="M5 0H0V5" fill="none" stroke="#ffffff0d" strokeWidth={0.6 / s} />
            </pattern>
          </defs>
          <g transform={gT}>
            {/* room floor */}
            <polygon points={ROOM_POLY.map((p) => `${p.x},${p.y}`).join(' ')} fill="#16130f" />
            {heatUrl && (
              <image href={heatUrl} x={result!.grid.x0} y={result!.grid.y0} width={result!.grid.nx * result!.grid.step} height={result!.grid.ny * result!.grid.step} preserveAspectRatio="none" style={{ imageRendering: 'auto' }} opacity={0.92} />
            )}
            {layers.grid && <rect x={-10} y={-10} width={180} height={120} fill="url(#grid5)" />}
            {/* stage */}
            <rect x={HALL.stage.x0} y={HALL.stage.y0} width={HALL.stage.x1 - HALL.stage.x0} height={HALL.stage.y1 - HALL.stage.y0} fill="url(#hatch)" stroke="#5a504a" strokeWidth={1} vectorEffect="non-scaling-stroke" strokeDasharray="5 4" />
            {/* drawing context */}
            {layers.dwg && (
              <g fill="none" vectorEffect="non-scaling-stroke">
                <path d={ctxPaths.other} stroke="#3a3330" strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
                <path d={ctxPaths.stair} stroke="#9a6a3c" strokeWidth={0.7} vectorEffect="non-scaling-stroke" />
                <path d={ctxPaths.door} stroke="#4f7da3" strokeWidth={0.7} vectorEffect="non-scaling-stroke" />
                <path d={ctxPaths.glaz} stroke="#5fb3c4" strokeWidth={0.9} vectorEffect="non-scaling-stroke" />
                <path d={ctxPaths.wall} stroke="#a89a8f" strokeWidth={1.1} vectorEffect="non-scaling-stroke" />
              </g>
            )}
            {/* egress */}
            {layers.egress &&
              egress.map((e) => (
                <polygon key={e.o.id} points={e.poly.map((p) => `${p.x},${p.y}`).join(' ')} fill={e.blockedBy ? '#e5604f55' : '#86b39133'} stroke={e.blockedBy ? '#e5604f' : '#86b391'} strokeWidth={1} vectorEffect="non-scaling-stroke" strokeDasharray="3 3" />
              ))}
            {/* items */}
            {project.items.map((it) => {
              if (it.hidden || it.type === 'fixture') return null;
              const isSel = it.id === selected;
              const col = SECTION_MAP[it.section]?.color || '#c9b3a5';
              if (it.type === 'drape') {
                const pts = absPts(it);
                const pr = itemParams(it);
                const c = drapeCounts(it);
                const ups = drapeUprights(it);
                void c;
                return (
                  <g key={it.id} onPointerDown={(e) => startMove(e, it)} style={{ cursor: 'move' }}>
                    <polyline points={(pr.closed ? [...pts, pts[0]] : pts).map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#0a0908" strokeWidth={isSel ? 7 : 6} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                    <polyline points={(pr.closed ? [...pts, pts[0]] : pts).map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={isSel ? '#fff' : DRAPE_COLORS[pr.color] || '#888'} strokeWidth={isSel ? 4 : 3.2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={pr.valance > 0 ? 0.55 : 1} />
                    {pr.lightPipe && <polyline points={(pr.closed ? [...pts, pts[0]] : pts).map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#d9b45b" strokeWidth={1.4} strokeDasharray="5 3" vectorEffect="non-scaling-stroke" />}
                    {pr.valance > 0 && <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#141414" strokeWidth={2} strokeDasharray="1 3" vectorEffect="non-scaling-stroke" />}
                    <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="transparent" strokeWidth={14} vectorEffect="non-scaling-stroke" />
                    {ups.map((u, k) => (
                      <rect key={k} x={u.x - (pr.lightPipe ? 0.6 : 0.45)} y={u.y - (pr.lightPipe ? 0.6 : 0.45)} width={pr.lightPipe ? 1.2 : 0.9} height={pr.lightPipe ? 1.2 : 0.9} fill={pr.lightPipe ? '#d9b45b' : '#d8d0c8'} />
                    ))}
                  </g>
                );
              }
              if (it.type === 'stanchions' || it.type === 'lilyPath') {
                const pts = absPts(it);
                const pr = itemParams(it);
                const dots = it.type === 'lilyPath' ? alongPath(pts, pr.n) : alongPath(pts, stanchionCount(it));
                return (
                  <g key={it.id} onPointerDown={(e) => startMove(e, it)} style={{ cursor: 'move' }}>
                    {it.type === 'stanchions' && <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={isSel ? '#fff' : '#b0485a'} strokeWidth={2} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />}
                    <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="transparent" strokeWidth={12} vectorEffect="non-scaling-stroke" />
                    {dots.map((d, k) => (it.type === 'lilyPath' ? <ellipse key={k} cx={d.x} cy={d.y} rx={pr.r} ry={pr.r * 0.92} fill="#5f8f4e" stroke={isSel ? '#fff' : '#a3c78a'} strokeWidth={0.8} vectorEffect="non-scaling-stroke" opacity={0.9} /> : <circle key={k} cx={d.x} cy={d.y} r={0.5} fill="#d8d0c8" />))}
                  </g>
                );
              }
              if (it.type === 'booth') {
                const pts = itemFootprint(it);
                return <polygon key={it.id} points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill={it.params?.zone ? '#ffffff03' : '#ffffff06'} stroke={isSel ? '#fff' : it.params?.zone ? '#8ea2c7' : '#7a6f69'} strokeOpacity={it.params?.zone ? 0.7 : 1} strokeWidth={1} strokeDasharray={it.params?.zone ? undefined : '6 4'} vectorEffect="non-scaling-stroke" onPointerDown={(e) => startMove(e, it)} style={{ cursor: 'move' }} />;
              }
              if (it.type === 'zoneArea') {
                const pts = absPts(it);
                return <polygon key={it.id} points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={isSel ? '#fff' : '#8fa3c044'} strokeWidth={1} strokeDasharray="2 4" vectorEffect="non-scaling-stroke" onPointerDown={(e) => startMove(e, it)} />;
              }
              const poly = itemFootprint(it);
              if (poly.length < 2) return null;
              const isRig = it.type === 'tbar' || it.type === 'crank' || it.type === 'pipebar';
              return (
                <g key={it.id} onPointerDown={(e) => startMove(e, it)} style={{ cursor: it.locked ? 'pointer' : 'move' }}>
                  <polygon
                    points={poly.map((p) => `${p.x},${p.y}`).join(' ')}
                    fill={isRig ? '#00000000' : col}
                    fillOpacity={isRig ? 0 : it.type === 'house' ? 0.1 : 0.32}
                    stroke={isSel ? '#ffffff' : isRig ? '#d9b45b' : col}
                    strokeWidth={isSel ? 2 : 1.2}
                    vectorEffect="non-scaling-stroke"
                    strokeDasharray={isRig ? '3 2' : undefined}
                  />
                  {it.type === 'house' && <HouseInterior it={it} />}
                  {it.type === 'tbar' && <line x1={it.x - Math.sin(it.rot * DEG) * 2} y1={it.y + Math.cos(it.rot * DEG) * 2} x2={it.x + Math.sin(it.rot * DEG) * 2} y2={it.y - Math.cos(it.rot * DEG) * 2} stroke="#d9b45b" strokeWidth={2.4} vectorEffect="non-scaling-stroke" />}
                  {it.type === 'crank' && <line x1={it.x - Math.sin(it.rot * DEG) * 3} y1={it.y + Math.cos(it.rot * DEG) * 3} x2={it.x + Math.sin(it.rot * DEG) * 3} y2={it.y - Math.cos(it.rot * DEG) * 3} stroke="#d9b45b" strokeWidth={3.2} vectorEffect="non-scaling-stroke" />}
                  {/* front indicator */}
                  {!isRig && !['mapDeck'].includes(it.type) && <FrontTick it={it} color={isSel ? '#fff' : col} />}
                </g>
              );
            })}
            {/* beams */}
            {layers.fixtures &&
              fixtures.map(({ f, pos, beam, core, m, aim }) => {
                const isSel = f.id === selected;
                const show = layers.beams || isSel;
                const c = m ? m.channels.reduce((acc, ch) => { const lv = (f.params.ch ? f.params.ch[ch.key] ?? 0 : m.defaultCh[ch.key] ?? 0); return [acc[0] + ch.rgb[0] * lv * ch.lm, acc[1] + ch.rgb[1] * lv * ch.lm, acc[2] + ch.rgb[2] * lv * ch.lm]; }, [0, 0, 0]) : [1, 1, 1];
                const mx = Math.max(...c) || 1;
                const colr = `rgb(${Math.round(255 * Math.pow(c[0] / mx, 0.45))},${Math.round(255 * Math.pow(c[1] / mx, 0.45))},${Math.round(255 * Math.pow(c[2] / mx, 0.45))})`;
                return (
                  <g key={f.id}>
                    {show && beam.length > 2 && <polygon points={beam.map((p) => `${p.x},${p.y}`).join(' ')} fill={colr} fillOpacity={isSel ? 0.16 : 0.06} stroke={colr} strokeOpacity={isSel ? 0.9 : 0.35} strokeWidth={1} vectorEffect="non-scaling-stroke" strokeDasharray="2 3" pointerEvents="none" />}
                    {show && core.length > 2 && <polygon points={core.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={colr} strokeOpacity={isSel ? 1 : 0.5} strokeWidth={1} vectorEffect="non-scaling-stroke" pointerEvents="none" />}
                    {(show || isSel) && <line x1={pos.x} y1={pos.y} x2={aim.x} y2={aim.y} stroke={colr} strokeOpacity={isSel ? 0.9 : 0.3} strokeWidth={1} vectorEffect="non-scaling-stroke" pointerEvents="none" />}
                    {f.params.rig && byId.get(f.params.rig)?.type === 'drape' && (() => {
                      const hg = drapeHang(f, byId.get(f.params.rig)!);
                      return <line x1={hg.pipe.x} y1={hg.pipe.y} x2={pos.x} y2={pos.y} stroke="#d9b45b" strokeWidth={2} vectorEffect="non-scaling-stroke" pointerEvents="none" />;
                    })()}
                    <g onPointerDown={(e) => startMove(e, f)} style={{ cursor: f.params.rig && byId.get(f.params.rig)?.type === 'drape' ? 'ew-resize' : 'pointer' }}>
                      <circle cx={pos.x} cy={pos.y} r={0.75} fill={colr} stroke={isSel ? '#fff' : '#111'} strokeWidth={isSel ? 2 : 1} vectorEffect="non-scaling-stroke" />
                      <circle cx={pos.x} cy={pos.y} r={1.6} fill="transparent" />
                    </g>
                    {isSel && (
                      <g onPointerDown={(e) => { e.stopPropagation(); setDrag({ kind: 'aim', id: f.id }); }} style={{ cursor: 'crosshair' }}>
                        <circle cx={aim.x} cy={aim.y} r={1.1} fill="#0009" stroke="#fff" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                        <path d={`M${aim.x - 1.8} ${aim.y}H${aim.x + 1.8}M${aim.x} ${aim.y - 1.8}V${aim.y + 1.8}`} stroke="#fff" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
                      </g>
                    )}
                  </g>
                );
              })}
            {/* rotation & vertex handles */}
            {sel && !sel.locked && sel.type !== 'fixture' && !sel.points && (() => {
              const f = facingVec(sel.rot);
              const r = handleRadius(sel);
              const hx = sel.x + f.x * r, hy = sel.y + f.y * r;
              return (
                <g>
                  <line x1={sel.x} y1={sel.y} x2={hx} y2={hy} stroke="#fff" strokeOpacity={0.6} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                  <circle cx={hx} cy={hy} r={9 / s} fill="#d69e7a" stroke="#fff" strokeWidth={1.5} vectorEffect="non-scaling-stroke" style={{ cursor: 'grab' }} onPointerDown={(e) => { e.stopPropagation(); setDrag({ kind: 'rotate', id: sel.id }); }} />
                </g>
              );
            })()}
            {sel && sel.points && !sel.locked &&
              absPts(sel).map((p, idx) => (
                <rect key={idx} x={p.x - 6 / s} y={p.y - 6 / s} width={12 / s} height={12 / s} fill="#d69e7a" stroke="#fff" strokeWidth={1.2} vectorEffect="non-scaling-stroke" style={{ cursor: 'grab' }} onPointerDown={(e) => { e.stopPropagation(); setDrag({ kind: 'vertex', id: sel.id, idx }); }} />
              ))}
            {/* probes */}
            {layers.probes &&
              project.probes.map((pr) => {
                const r = probeRes.get(pr.id);
                const col = r ? VERDICT_COLOR[r.verdict] : '#aaa';
                const f = facingVec(pr.facing);
                const isSel = pr.id === selected;
                return (
                  <g key={pr.id}>
                    <path d={`M${pr.x} ${pr.y}L${pr.x + Math.cos((pr.facing + 32) * DEG) * 3.4} ${pr.y + Math.sin((pr.facing + 32) * DEG) * 3.4}A3.4 3.4 0 0 0 ${pr.x + Math.cos((pr.facing - 32) * DEG) * 3.4} ${pr.y + Math.sin((pr.facing - 32) * DEG) * 3.4}Z`} fill={col} fillOpacity={0.35} pointerEvents="none" transform="" />
                    <circle cx={pr.x} cy={pr.y} r={1.05} fill={col} stroke={isSel ? '#fff' : '#111'} strokeWidth={isSel ? 2 : 1.2} vectorEffect="non-scaling-stroke" style={{ cursor: 'move' }} onPointerDown={(e) => { e.stopPropagation(); select(pr.id); const p = evPos(e); setDrag({ kind: 'probe', id: pr.id, ox: pr.x, oy: pr.y, wx: p.x, wy: p.y }); }} />
                    {isSel && <circle cx={pr.x + f.x * 4.2} cy={pr.y + f.y * 4.2} r={8 / s} fill="#fff" stroke={col} strokeWidth={2} vectorEffect="non-scaling-stroke" style={{ cursor: 'grab' }} onPointerDown={(e) => { e.stopPropagation(); setDrag({ kind: 'probeFace', id: pr.id }); }} />}
                  </g>
                );
              })}
            {/* measure */}
            {measure.length > 0 && (
              <g pointerEvents="none">
                {measure.map((m, k) => (
                  <circle key={k} cx={m.x} cy={m.y} r={5 / s} fill="#fff" />
                ))}
                {measure.length === 2 && <line x1={measure[0].x} y1={measure[0].y} x2={measure[1].x} y2={measure[1].y} stroke="#fff" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeDasharray="5 3" />}
              </g>
            )}
          </g>
          {/* screen-space labels */}
          {layers.dwg && s > 3 &&
            ctxLabels.map((l, k) => {
              const p = toScreen(l.x, l.y);
              return (
                <text key={k} x={p.x} y={p.y} fill="#6f6560" fontSize={9.5} textAnchor="middle" style={{ letterSpacing: '0.06em', pointerEvents: 'none' }}>
                  {l.t}
                </text>
              );
            })}
          {(() => {
            const p = toScreen(HALL.stage.x0 + 20, (HALL.stage.y0 + HALL.stage.y1) / 2);
            return (
              <text x={p.x} y={p.y} fill="#7a6f69" fontSize={12} textAnchor="middle" style={{ letterSpacing: '0.2em', pointerEvents: 'none' }}>
                STAGE (+{project.settings.stageHeightFt}′)
              </text>
            );
          })()}
          {layers.egress && s > 3 &&
            egress.map((e) => {
              const c = e.poly.reduce((a, p) => ({ x: a.x + p.x / 4, y: a.y + p.y / 4 }), { x: 0, y: 0 });
              const p = toScreen(c.x, c.y);
              return (
                <text key={e.o.id} x={p.x} y={p.y + 3} fill={e.blockedBy ? '#ff9a8c' : '#a9d4b2'} fontSize={8.5} fontWeight={700} textAnchor="middle" style={{ pointerEvents: 'none', letterSpacing: '0.08em' }}>
                  {e.o.kind === 'opening' ? 'ENTRANCE' : e.blockedBy ? 'BLOCKED' : 'EXIT'}
                </text>
              );
            })}
          {showLabels &&
            project.items.map((it) => {
              if (it.hidden || ['fixture', 'tbar', 'crank', 'pipebar', 'zoneArea', 'floorMark', 'poster', 'lilyPath', 'stanchions'].includes(it.type)) return null;
              if ((it.type === 'posterStand' || it.type === 'signStand' || it.type === 'banner' || it.type === 'table') && s < 11 && it.id !== selected) return null;
              const poly = it.points ? absPts(it) : itemFootprint(it);
              if (!poly.length) return null;
              const c = poly.reduce((a, p) => ({ x: a.x + p.x / poly.length, y: a.y + p.y / poly.length }), { x: 0, y: 0 });
              const p = toScreen(c.x, c.y);
              const sec = SECTION_MAP[it.section];
              const secTitle = sec?.num ? `${sec.num} · ${sec.title}` : null;
              if (it.type === 'booth' && it.params?.zone) {
                // sketch zone: title in the top-left corner, like the client's layout drawing
                const tl = toScreen(Math.min(...poly.map((q) => q.x)) + 1, Math.max(...poly.map((q) => q.y)) - 1);
                return (
                  <text key={it.id} x={tl.x} y={tl.y + 12} fill="#e8a46a" fontSize={11.5} fontWeight={600} textAnchor="start" style={{ pointerEvents: 'none', paintOrder: 'stroke', stroke: '#0f0d0c', strokeWidth: 3 }}>
                    {secTitle || it.name}
                  </text>
                );
              }
              const zoned = zoneSecs.has(it.section);
              const big = !zoned && (['mapDeck', 'house', 'lwall', 'pillars', 'booth', 'centerpiece'].includes(it.type) || (it.type === 'stambh' && itemParams(it).kind === 0) || it.id === 'lotusN');
              const label = it.type === 'booth' || it.type === 'centerpiece' ? it.name : big ? (secTitle || it.name) : shortName(it);
              return (
                <text key={it.id} x={p.x} y={p.y} fill={big ? '#f3ebe5' : '#cbbfb6'} fontSize={big ? 12.5 : 9.5} fontWeight={big ? 600 : 400} textAnchor="middle" style={{ pointerEvents: 'none', paintOrder: 'stroke', stroke: '#0f0d0c', strokeWidth: 3 }}>
                  {label}
                </text>
              );
            })}
          {layers.probes &&
            project.probes.map((pr) => {
              const r = probeRes.get(pr.id);
              if (!r) return null;
              const p = toScreen(pr.x, pr.y);
              return (
                <g key={pr.id} style={{ pointerEvents: 'none' }}>
                  <text x={p.x + 9} y={p.y - 6} fill={VERDICT_COLOR[r.verdict]} fontSize={11} fontWeight={700} style={{ paintOrder: 'stroke', stroke: '#0f0d0c', strokeWidth: 3, fontFamily: 'var(--f-mono)' }}>
                    {fmtLux(r.face)} lx
                  </text>
                  {(s > 9 || pr.id === selected) && (
                    <text x={p.x + 9} y={p.y + 6} fill="#cbbfb6" fontSize={9} style={{ paintOrder: 'stroke', stroke: '#0f0d0c', strokeWidth: 3 }}>
                      {pr.name}
                    </text>
                  )}
                </g>
              );
            })}
          {measure.length === 2 && (() => {
            const a = toScreen(measure[0].x, measure[0].y), b = toScreen(measure[1].x, measure[1].y);
            const d = Math.hypot(measure[1].x - measure[0].x, measure[1].y - measure[0].y);
            return (
              <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 8} fill="#fff" fontSize={13} fontWeight={700} textAnchor="middle" style={{ paintOrder: 'stroke', stroke: '#000', strokeWidth: 4, fontFamily: 'var(--f-mono)' }}>
                {fmtFt(d)} · {(d * 0.3048).toFixed(2)} m
              </text>
            );
          })()}
          {/* scale bar */}
          {(() => {
            const ft = s > 10 ? 10 : s > 4 ? 20 : 40;
            return (
              <g transform={`translate(${size.w - 24 - ft * s} ${size.h - 22})`} style={{ pointerEvents: 'none' }}>
                <rect width={ft * s} height={4} fill="#f3ebe5" rx={2} />
                <text x={(ft * s) / 2} y={-6} fill="#a69a92" fontSize={10} textAnchor="middle" fontFamily="var(--f-mono)">
                  {ft} ft
                </text>
              </g>
            );
          })()}
          {/* north arrow */}
          <g transform={`translate(${size.w - 34} 66)`} style={{ pointerEvents: 'none' }}>
            <circle r={14} fill="#0f0d0cbb" stroke="#3f3936" />
            <path d="M0 -10 L5 4 L0 1 L-5 4Z" fill="#d69e7a" />
            <text y={-17} fill="#a69a92" fontSize={9} textAnchor="middle">N</text>
          </g>
        </svg>

        {/* toolbars */}
        <div className="tool-strip tl">
          <Seg
            value={typeof tool === 'object' ? 'place' : tool}
            onChange={(v) => { setTool(v as Tool); setMeasure([]); }}
            options={[
              { v: 'select', label: 'Select' },
              { v: 'probe', label: <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}><Icon.person size={13} /> Person</span>, title: 'Drop a person to check face light' },
              { v: 'measure', label: <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}><Icon.ruler size={13} /> Measure</span> },
            ]}
          />
          <button className="btn btn-sm" onClick={() => setAddOpen((o) => !o)}>
            <Icon.plus size={14} /> Add
          </button>
          {typeof tool === 'object' && <span className="pill sev-warning">Click to place {TYPES[tool.place]?.label}</span>}
        </div>
        {addOpen && (
          <div className="add-menu">
            {['Exhibits', 'Structure', 'Print', 'Crowd', 'Rigging', 'Lighting', 'Markers'].map((g) => (
              <div key={g}>
                <div className="palette-group">{g}</div>
                {ADDABLE.filter((k) => TYPES[k]?.group === g).map((k) => (
                  <button key={k} onClick={() => { setTool({ place: k }); setAddOpen(false); }}>
                    {TYPES[k].label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
        <div className="tool-strip tr">
          <Seg
            value={heat}
            onChange={(v) => setHeat(v)}
            options={[
              { v: 'face', label: 'Face lux', title: 'Vertical illuminance at face height' },
              { v: 'photo', label: 'Photo-ready', title: 'Phone photo readiness from face light' },
              { v: 'floor', label: 'Floor lux' },
              { v: 'uv', label: 'UV' },
              { v: 'none', label: 'Off' },
            ]}
          />
          {(heat === 'face' || heat === 'photo') && (
            <select className="input" style={{ height: 28, fontSize: 12 }} value={faceDir === null ? 'cyl' : String(faceDir)} onChange={(e) => setFaceDir(e.target.value === 'cyl' ? null : parseInt(e.target.value))} title="Which way faces point">
              <option value="cyl">Faces any way (cylindrical)</option>
              {DIR_LABELS.map((d, i) => (
                <option key={d} value={i}>Faces toward {d}</option>
              ))}
            </select>
          )}
        </div>
        <div className="tool-strip br" style={{ bottom: 44 }}>
          {(['dwg', 'beams', 'labels', 'egress', 'probes', 'grid'] as const).map((k) => (
            <button key={k} className="chip" aria-pressed={layers[k]} onClick={() => toggleLayer(k)}>
              {{ dwg: 'Drawing', beams: 'Beams', labels: 'Labels', egress: 'Exits', probes: 'People', grid: 'Grid' }[k]}
            </button>
          ))}
          <span className="sep" />
          <button className="btn btn-sm" onClick={() => fit()}>Fit</button>
        </div>
        {heat !== 'none' && (
          <div className="legend">
            {heat === 'photo' ? (
              <div className="stack" style={{ gap: 4 }}>
                <span className="eyebrow">Phone photo readiness (face light)</span>
                {PHOTO_BANDS.map((b) => (
                  <span key={b.key} className="row-flex" style={{ gap: 6 }}>
                    <span className="sw" style={{ background: `rgb(${b.color.join(',')})` }} /> {b.label}
                  </span>
                ))}
              </div>
            ) : heat === 'uv' ? (
              <div>
                <span className="eyebrow">UV-A at face height (µW/cm²)</span>
                <div className="bar" style={{ background: 'linear-gradient(90deg,#14121a,#5b2be0,#aa30ff)' }} />
                <div className="ticks"><span>0</span><span>20</span><span>200+</span></div>
              </div>
            ) : (
              <div>
                <span className="eyebrow">{heat === 'floor' ? 'Horizontal lux at floor' : faceDir === null ? 'Face lux — cylindrical @ ' + project.settings.faceHeightFt + '′' : `Face lux — facing ${DIR_LABELS[faceDir]}`}</span>
                <div className="bar" style={{ background: luxGradientCss() }} />
                <div className="ticks" style={{ position: 'relative', height: 12 }}>
                  {LUX_TICKS.map((t) => (
                    <span key={t} style={{ position: 'absolute', left: `${tickPos(t)}%`, transform: 'translateX(-50%)' }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {hover && readout && !drag && (
          <div className="plan-readout" style={{ left: Math.min(hover.sx + 16, size.w - 200), top: Math.min(hover.sy + 16, size.h - 170) }}>
            {readout.inside ? (
              <span className="muted">Inside an object</span>
            ) : (
              <div className="row-flex" style={{ gap: 10, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                <Rose e8={readout.e8} />
                <div className="stack" style={{ gap: 3 }}>
                  <span>Face (any way) <b>{fmtLux(readout.cyl)}</b> lx</span>
                  <span>Floor <b>{fmtLux(readout.floor)}</b> lx · {fc(readout.floor).toFixed(1)} fc</span>
                  <span className="muted-3 tiny">Best facing {DIR_LABELS[readout.e8.indexOf(Math.max(...readout.e8))]} · {fmtLux(Math.max(...readout.e8))} lx</span>
                  {readout.uv > 1 && <span className="tiny" style={{ color: '#c9a2ff' }}>UV-A {readout.uv.toFixed(0)} µW/cm²</span>}
                  <span className="muted-3 tiny mono">{fmtFt(hover.x)} , {fmtFt(hover.y)}</span>
                </div>
              </div>
            )}
          </div>
        )}
        {sel && !selProbe && (
          <div className="tool-strip bl" style={{ bottom: heat !== 'none' ? (heat === 'photo' ? 130 : 78) : 12 }}>
            <span className="small" style={{ padding: '0 6px' }}><b>{sel.name}</b> <span className="muted">· {TYPES[sel.type]?.label}</span></span>
            {sel.type === 'drape' && <span className="pill">{drapeCounts(sel).length.toFixed(0)} ft · {drapeCounts(sel).uprights} uprights</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ——— helpers ———
function footPoly(i: Item) {
  return i.points ? absPts(i) : itemFootprint(i);
}
function nearPolyline(p: V2, pts: V2[], tol: number) {
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1], b = pts[k];
    const dx = b.x - a.x, dy = b.y - a.y;
    const L2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2));
    if (Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t)) < tol) return true;
  }
  return false;
}
function alongPath(pts: V2[], n: number): V2[] {
  if (pts.length < 2 || n < 1) return pts;
  const segs: number[] = [];
  let L = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    segs.push(l);
    L += l;
  }
  const out: V2[] = [];
  for (let k = 0; k < n; k++) {
    let d = n === 1 ? 0 : (k / (n - 1)) * L;
    let i = 0;
    while (i < segs.length - 1 && d > segs[i]) {
      d -= segs[i];
      i++;
    }
    const t = segs[i] ? Math.min(1, d / segs[i]) : 0;
    out.push({ x: pts[i].x + (pts[i + 1].x - pts[i].x) * t, y: pts[i].y + (pts[i + 1].y - pts[i].y) * t });
  }
  return out;
}
function handleRadius(it: Item) {
  const p = itemParams(it);
  return Math.max(3, (Math.max(p.w || 4, p.d || 2) / 2) + 2.5);
}
function shortName(it: Item) {
  return it.name.replace(/^Node (\d) — /, 'N$1 · ').replace(/ \(.*\)$/, '').slice(0, 34);
}
/** beam footprint polygon (plan) on the target plane */
function beamFoot(pos: { x: number; y: number; z: number }, aim: { x: number; y: number; z: number }, fullAngleDeg: number): V2[] {
  const d = { x: aim.x - pos.x, y: aim.y - pos.y, z: aim.z - pos.z };
  const L = Math.hypot(d.x, d.y, d.z) || 1;
  const D = { x: d.x / L, y: d.y / L, z: d.z / L };
  const half = Math.min(80, fullAngleDeg / 2) * DEG;
  const ax = Math.abs(D.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 };
  let t1 = { x: D.y * ax.z - D.z * ax.y, y: D.z * ax.x - D.x * ax.z, z: D.x * ax.y - D.y * ax.x };
  const tl = Math.hypot(t1.x, t1.y, t1.z);
  t1 = { x: t1.x / tl, y: t1.y / tl, z: t1.z / tl };
  const t2 = { x: D.y * t1.z - D.z * t1.y, y: D.z * t1.x - D.x * t1.z, z: D.x * t1.y - D.y * t1.x };
  const steep = Math.abs(D.z) > 0.6;
  // plane: horizontal through aim (steep), else vertical through aim with normal = horizontal D
  const hn = Math.hypot(D.x, D.y) || 1;
  const N = steep ? { x: 0, y: 0, z: 1 } : { x: D.x / hn, y: D.y / hn, z: 0 };
  const pts: V2[] = [];
  for (let k = 0; k < 28; k++) {
    const ph = (k / 28) * Math.PI * 2;
    const r = { x: D.x * Math.cos(half) + Math.sin(half) * (Math.cos(ph) * t1.x + Math.sin(ph) * t2.x), y: D.y * Math.cos(half) + Math.sin(half) * (Math.cos(ph) * t1.y + Math.sin(ph) * t2.y), z: D.z * Math.cos(half) + Math.sin(half) * (Math.cos(ph) * t1.z + Math.sin(ph) * t2.z) };
    const den = r.x * N.x + r.y * N.y + r.z * N.z;
    if (Math.abs(den) < 1e-4) continue;
    const t = ((aim.x - pos.x) * N.x + (aim.y - pos.y) * N.y + (aim.z - pos.z) * N.z) / den;
    if (t <= 0 || t > 200) continue;
    let x = pos.x + r.x * t, y = pos.y + r.y * t;
    const z = pos.z + r.z * t;
    if (z < 0 && r.z < 0) {
      // clip to floor
      const tf = -pos.z / r.z;
      x = pos.x + r.x * tf;
      y = pos.y + r.y * tf;
    }
    pts.push({ x, y });
  }
  if (!steep && pts.length > 2) {
    // vertical plane projects to a segment: draw a thin wedge from the fixture to the spread
    let mn = pts[0], mx = pts[0];
    const ux = -N.y, uy = N.x;
    for (const p of pts) {
      const s = (p.x - aim.x) * ux + (p.y - aim.y) * uy;
      if (s < (mn.x - aim.x) * ux + (mn.y - aim.y) * uy) mn = p;
      if (s > (mx.x - aim.x) * ux + (mx.y - aim.y) * uy) mx = p;
    }
    return [{ x: pos.x, y: pos.y }, mn, mx];
  }
  return pts;
}

function FrontTick({ it, color }: { it: Item; color: string }) {
  const p = itemParams(it);
  const f = facingVec(it.rot);
  const dd = (p.d || (it.type === 'posterStand' ? 0.3 : 1)) / 2;
  const cx = it.x + f.x * (dd + 0.3), cy = it.y + f.y * (dd + 0.3);
  const ux = -f.y, uy = f.x;
  return <path d={`M${cx + ux * 0.7} ${cy + uy * 0.7}L${cx + f.x * 0.9} ${cy + f.y * 0.9}L${cx - ux * 0.7} ${cy - uy * 0.7}`} fill="none" stroke={color} strokeWidth={1.2} vectorEffect="non-scaling-stroke" pointerEvents="none" />;
}

function HouseInterior({ it }: { it: Item }) {
  // simplified interior outlines from the solids (top-down)
  const solids = TYPES.house.solids!(it).filter((s) => s.mat !== 'fabricSheer');
  return (
    <g pointerEvents="none">
      {solids.map((s, k) => {
        const c = Math.cos(s.yaw * DEG), sn = Math.sin(s.yaw * DEG);
        const hx = s.s.x / 2, hy = s.s.y / 2;
        const pts = [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]].map(([a, b]) => `${s.c.x + a * c - b * sn},${s.c.y + a * sn + b * c}`).join(' ');
        const wall = s.mat === 'drywall';
        return <polygon key={k} points={pts} fill={wall ? '#cdbfb2' : '#9fb6a4'} fillOpacity={wall ? 0.55 : 0.28} stroke={wall ? '#e6d9cc' : '#9fb6a4'} strokeWidth={0.6} vectorEffect="non-scaling-stroke" />;
      })}
    </g>
  );
}

function Rose({ e8 }: { e8: number[] }) {
  const mx = Math.max(60, ...e8);
  const R = 30;
  const pts = e8.map((v, k) => {
    const a = (k * 45 * Math.PI) / 180;
    const r = (Math.sqrt(v / mx) * R);
    return `${R + 4 + Math.cos(a) * r},${R + 4 - Math.sin(a) * r}`;
  });
  return (
    <svg className="rose" width={R * 2 + 8} height={R * 2 + 8}>
      <circle cx={R + 4} cy={R + 4} r={R} fill="none" stroke="#3f3936" />
      <circle cx={R + 4} cy={R + 4} r={R * Math.sqrt(150 / mx)} fill="none" stroke="#3f3936" strokeDasharray="2 2" />
      <polygon points={pts.join(' ')} fill="#d69e7a55" stroke="#d69e7a" />
      <text x={R + 4} y={9} fontSize={8} fill="#7a6f69" textAnchor="middle">N</text>
    </svg>
  );
}

export { beamFoot, alongPath };
void uid;
