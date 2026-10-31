'use client';
// The Assembly Hall exhibition as laid out in the client's pipe-and-drape drawing (editable in Campus plan).
// Existing exhibit models (India map, 16 stages, house, kiosks, mirrors, dioramas, fibre-optic box, lotus wall) are reused through
// Items3D; the CAPA booth, centerpiece bays, Neelkanth Varni room, queue line, photo booth and tables are built here.
import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useStore } from '@/lib/store';
import { useCE, EX_KINDS, KDC_KINDS, SITE_KINDS, type ExItem, type DrapeRun } from '@/lib/campusEdits';
import type { Item } from '@/lib/types';
import { FTm } from './materials';
import { std, canvasTex, Inst, NearHtml } from './CampusModel';
import { Items3D } from './Items3D';
import { Bx, Cyl, L, place, rad, type V3 } from './CampusFestival';
import { Beams, type Seg } from './CampusExtras';
import { CapaBooth, PillarBay, NeelkanthRoom, Pic } from './CampusSets';

const mk = (id: string, type: string, name: string, x: number, y: number, rot: number, params: Record<string, any>, extra: Partial<Item> = {}): Item => ({ id, type, name, section: 'infra', x, y, rot, params, ...extra });
const LILY: [number, number][] = [[90, 8.6], [93.5, 8.6], [98.5, 9.8], [103.9, 8.6], [108.3, 12], [109.8, 18.2], [109.2, 25], [111.2, 32.1]];

function legacyItems(ex: ExItem[], drapes: DrapeRun[]): Item[] {
  const out: Item[] = [];
  for (const e of ex) {
    const id = 'ex_' + e.id;
    switch (e.kind) {
      case 'indiaMap': out.push(mk(id, 'mapDeck', 'Interactive India map', e.x, e.y, e.yaw, { w: 12, d: 12, h: 3, divos: 44 })); break;
      case 'stages': {
        out.push(mk(id, 'lwall', 'Game of Life — 16 Sacred Steps', e.x, e.y, 90, { runA: 24, corner: 4, runB: 32, depth: 2, h: 8, mirror: false }));
        const pts = LILY.map(([x, y]) => [x - 87.77 + e.x, y - 1 + e.y]);
        out.push(mk(id + 'l', 'lilyPath', 'Lily pads (16)', pts[0][0], pts[0][1], 0, { n: 16, r: 1.1 }, { points: pts.map(([x, y]) => ({ x: x - pts[0][0], y: y - pts[0][1] })) }));
        break;
      }
      case 'house': out.push(mk(id, 'house', 'Hindu House (walk-through)', e.x, e.y, e.yaw, { w: 24, d: 24, h: 8, wall: 2, entry: [10.5, 13.5], exit: [1.5, 4.5], tau: 0.55 })); break;
      case 'tv': out.push(mk(id, 'kiosk', 'Touch-screen kiosk', e.x, e.y, e.yaw, { nits: 300 })); break;
      case 'mirror': out.push(mk(id, 'mirrors', 'Mirror activity', e.x, e.y, e.yaw, { w: e.w, d: e.d, n: 4 })); break;
      case 'dioramaGod': out.push(mk(id, 'diorama', 'Diaroma 1 — Who is God?', e.x, e.y, e.yaw, { w: 8, h: 8, d: 2, art: 'god', nits: 110, cct: 2900 })); break;
      case 'dioramaGuru': out.push(mk(id, 'diorama', 'Diaroma 2 — Why is a Guru important?', e.x, e.y, e.yaw, { w: 8, h: 8, d: 2, art: 'guru', nits: 110, cct: 2900 })); break;
      case 'nvBox': out.push(mk(id, 'fiberTower', 'Nilkanth Varni box', e.x, e.y, e.yaw, {})); break;
      case 'lotus': out.push(mk(id, 'nailWall', 'Lotus activity', e.x, e.y, e.yaw, { w: e.w, h: 8, d: e.d, table: false, poster: true })); break;
    }
  }
  for (const r of drapes) out.push(mk('ex_' + r.id, 'drape', 'Pipe & drape', r.a[0], r.a[1], 0, { h: r.h, color: 'black', fullness: 0.5 }, { points: [{ x: 0, y: 0 }, { x: r.b[0] - r.a[0], y: r.b[1] - r.a[1] }] }));
  return out;
}

export function ExhibitLayout() {
  const project = useStore((s) => s.project);
  const exAll = useCE((s) => s.e.exItems);
  const ex = useMemo(() => exAll.filter((e) => !KDC_KINDS.has(e.kind) && !SITE_KINDS.has(e.kind)), [exAll]);
  const drapes = useCE((s) => s.e.drapes);
  const { scene, invalidate } = useThree();
  const ev = useMemo(() => ({ onSelect: () => {}, onHover: () => {} }), []);
  const items = useMemo(() => legacyItems(ex, drapes), [ex, drapes]);
  const proj = useMemo(() => ({ ...project, items }), [project, items]);
  // exhibit materials are authored in physical units; clamp their emissive while this plain-lit view is mounted
  useEffect(() => {
    const saved = new Map<THREE.Material, number>();
    const pass = () => scene.traverse((o: any) => {
      const ms: any[] = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of ms) if (m.emissiveIntensity > 4 && !saved.has(m)) { saved.set(m, m.emissiveIntensity); m.emissiveIntensity = m.emissiveMap ? 1 : 2; }
    });
    pass();
    invalidate();
    const t = setTimeout(() => { pass(); invalidate(); }, 400);
    return () => { clearTimeout(t); saved.forEach((v, m) => ((m as any).emissiveIntensity = v)); };
  }, [scene, items, invalidate]);
  const LEGACY = new Set(['indiaMap', 'stages', 'house', 'tv', 'mirror', 'dioramaGod', 'dioramaGuru', 'nvBox', 'lotus']);
  return (
    <>
      <Items3D project={proj} ev={ev} selected={null} />
      {ex.map((e) => (
        <group key={e.id} {...place(e.x, e.y, e.yaw)}>
          <ExModel e={e} />
          {LEGACY.has(e.kind) && <NearHtml pos={L(0, 0, e.kind === 'house' ? 12 : e.kind === 'stages' ? 12 : 10)} max={16}><div className="label3d sec">{EX_KINDS[e.kind].label}</div></NearHtml>}
        </group>
      ))}
    </>
  );
}

function ExModel({ e }: { e: ExItem }) {
  switch (e.kind) {
    case 'capa': return <CapaBooth />;
    case 'mandir': case 'shastra': case 'sant': return <PillarBay kind={e.kind} w={e.w} d={e.d} />;
    case 'nvVarni': return <NeelkanthRoom w={e.w} d={e.d} />;
    case 'line': return <QueueLine w={e.w} d={e.d} />;
    case 'photo': return <PhotoBooth w={e.w} d={e.d} />;
    case 'calendar': return <CalendarTables w={e.w} d={e.d} />;
    case 'santMilan': return <SantMilan w={e.w} d={e.d} />;
    case 'arrow': return <FlowArrow len={e.w} />;
    case 'label': return <NearHtml pos={L(0, 0, 1)} max={30}><div className="label3d sec" style={{ background: '#2a5db0', color: '#fff', borderColor: '#fff' }}>{e.t || 'Label'}</div></NearHtml>;
    default: return null;
  }
}

/* ───────────── stanchion queue ───────────── */
export function Stanchions({ posts, ropes, rope = '#c4252d' }: { posts: { x: number; y: number }[]; ropes: Seg[]; rope?: string }) {
  const M = useMemo(() => ({ chrome: std('#d9dde2', { metalness: 0.85, roughness: 0.25 }), rope: std(rope) }), [rope]);
  const poleG = useMemo(() => new THREE.CylinderGeometry(0.1 * FTm, 0.1 * FTm, 2.9 * FTm, 8).translate(0, 1.45 * FTm, 0), []);
  const baseG = useMemo(() => new THREE.CylinderGeometry(0.42 * FTm, 0.46 * FTm, 0.1 * FTm, 14).translate(0, 0.05 * FTm, 0), []);
  const f = (i: number, d: THREE.Object3D) => d.position.set(...L(posts[i].x, posts[i].y, 0));
  return (
    <>
      <Inst geo={poleG} mat={M.chrome} n={posts.length} deps={[posts]} fill={f} />
      <Inst geo={baseG} mat={M.chrome} n={posts.length} deps={[posts]} fill={f} />
      <Beams segs={ropes} mat={M.rope} />
    </>
  );
}
function QueueLine({ w, d }: { w: number; d: number }) {
  const { posts, ropes } = useMemo(() => {
    const posts: { x: number; y: number }[] = [], ropes: Seg[] = [];
    const rows = Math.max(2, Math.floor((d - 4) / 6.5) + 1), n = Math.max(2, Math.floor(w / 4.5) + 1);
    const rowPosts: { x: number; y: number }[][] = [];
    for (let r = 0; r < rows; r++) {
      const y = -d / 2 + 3 + r * 6.5;
      const rp = Array.from({ length: n }, (_, i) => ({ x: -w / 2 + 1 + (i * (w - 2)) / (n - 1), y }));
      rowPosts.push(rp); posts.push(...rp);
      for (let i = 0; i < n - 1; i++) ropes.push({ a: [rp[i].x, y, 2.7], b: [rp[i + 1].x, y, 2.7], t: 0.12, t2: 0.12 });
    }
    for (let r = 0; r < rows - 1; r++) { const k = r % 2 === 0 ? n - 1 : 0; ropes.push({ a: [rowPosts[r][k].x, rowPosts[r][k].y, 2.7], b: [rowPosts[r + 1][k].x, rowPosts[r + 1][k].y, 2.7], t: 0.12, t2: 0.12 }); }
    return { posts, ropes };
  }, [w, d]);
  return <><Stanchions posts={posts} ropes={ropes} /><NearHtml pos={L(0, 0, 6)} max={140}><div className="label3d sec">Line</div></NearHtml></>;
}

function PhotoBooth({ w, d }: { w: number; d: number }) {
  const M = useMemo(() => ({ wall: std('#1d6f7a'), frame: std('#e0a92c', { metalness: 0.6, roughness: 0.4 }), black: std('#1a1c20'), rug: ['#e8620a', '#f2b632', '#d6246f', '#2a8a9a', '#7a2f90'].map((c) => std(c)) }), []);
  const bx = -w / 2 + 0.5;
  return (
    <group>
      <Bx p={[bx, 0, 4.5]} s={[0.3, 11, 9]} m={M.wall} />
      <Bx p={[bx + 0.25, 0, 9.1]} s={[0.4, 11.6, 0.5]} m={M.frame} />
      {[-5.6, 5.6].map((y) => <Bx key={y} p={[bx + 0.25, y, 4.5]} s={[0.4, 0.5, 9]} m={M.frame} />)}
      <mesh position={L(bx + 0.2, 0, 5)} rotation={[0, Math.PI / 2, 0]} material={M.frame}><torusGeometry args={[3.4 * FTm, 0.22 * FTm, 8, 32]} /></mesh>
      {M.rug.map((m, i) => <mesh key={i} position={L(bx + 6, 0, 0.04 + i * 0.015)} material={m}><cylinderGeometry args={[(4.4 - i * 0.8) * FTm, (4.4 - i * 0.8) * FTm, 0.04 * FTm, 28]} /></mesh>)}
      {[0, 1, 2].map((i) => { const a = (i / 3) * Math.PI * 2; return <Bx key={i} p={[w / 2 - 2 + Math.cos(a) * 0.5, Math.sin(a) * 0.5, 2.2]} s={[0.12, 0.12, 4.4]} m={M.black} />; })}
      <Bx p={[w / 2 - 2, 0, 4.7]} s={[0.8, 1.1, 0.7]} m={M.black} />
      <NearHtml pos={L(0, 0, 11)} max={140}><div className="label3d sec">Photo booth</div></NearHtml>
    </group>
  );
}

function CalendarTables({ w, d }: { w: number; d: number }) {
  const M = useMemo(() => ({ cloth: std('#7d1d24'), top: std('#f3ead6'), colors: ['#e8620a', '#f2b632', '#d6246f', '#2a8a9a'].map((c) => std(c)) }), []);
  return (
    <group>
      {[-3.5, 3.5].map((x) => (
        <group key={x}>
          <Bx p={[x, 0, 1.3]} s={[2.5, 10, 2.6]} m={M.cloth} />
          <Bx p={[x, 0, 2.66]} s={[2.6, 10.1, 0.1]} m={M.top} />
          {[-3.6, -1.2, 1.2, 3.6].map((y, i) => <Bx key={y} p={[x, y, 3.15]} s={[1.4, 1.9, 0.9]} m={M.colors[i % 4]} />)}
        </group>
      ))}
      <NearHtml pos={L(0, 0, 7)} max={120}><div className="label3d sec">Calendar distribution</div></NearHtml>
    </group>
  );
}

function SantMilan({ w, d }: { w: number; d: number }) {
  const M = useMemo(() => ({ cloth: std('#7d1d24'), top: std('#f3ead6'), chair: std('#5a3a22'), rug: std('#b8946a') }), []);
  return (
    <group>
      <Bx p={[0, 0, 0.05]} s={[d, w - 1, 0.1]} m={M.rug} />
      <Bx p={[0.2, 0, 1.3]} s={[2.4, 8, 2.6]} m={M.cloth} />
      <Bx p={[0.2, 0, 2.66]} s={[2.5, 8.1, 0.1]} m={M.top} />
      {[-3, -1, 1, 3].map((y) => <group key={y}><Bx p={[-1.9, y, 0.9]} s={[1.1, 1.1, 0.12]} m={M.chair} /><Bx p={[-2.4, y, 1.6]} s={[0.12, 1.1, 1.4]} m={M.chair} /></group>)}
      <NearHtml pos={L(0, 0, 7)} max={110}><div className="label3d sec">Sant Milan</div></NearHtml>
    </group>
  );
}

function FlowArrow({ len }: { len: number }) {
  const geo = useMemo(() => {
    const L2 = len, s = new THREE.Shape();
    s.moveTo(-L2 / 2, -0.25); s.lineTo(L2 / 2 - 1.1, -0.25); s.lineTo(L2 / 2 - 1.1, -0.8); s.lineTo(L2 / 2, 0); s.lineTo(L2 / 2 - 1.1, 0.8); s.lineTo(L2 / 2 - 1.1, 0.25); s.lineTo(-L2 / 2, 0.25); s.closePath();
    return new THREE.ShapeGeometry(s);
  }, [len]);
  return <mesh geometry={geo} position={[0, 0.05 * FTm, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={FTm}><meshBasicMaterial color="#2a5db0" toneMapped={false} side={THREE.DoubleSide} /></mesh>;
}
