'use client';
// KDC (kids / carnival side of the east strip): the inflatables, the Kids Diwali steps, the open activity space, the corner pocket,
// the Rath turnaround ring, the route line and barricades. Layout comes from the client's KDC drawing (editable in Campus plan).
// Models are built in local plan feet (x = front, y = right when you face the item, z up), inside a group that is placed + yawed.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import { useCE, KDC_KINDS, EX_KINDS, type ExItem } from '@/lib/campusEdits';
import { FTm } from './materials';
import { std, canvasTex, Inst, NearHtml } from './CampusModel';
import { Bx, Cyl, L, place, type V3 } from './CampusFestival';
import { Pic } from './CampusSets';
import { Stanchions } from './CampusExhibits';
import type { Seg } from './CampusExtras';

export function KdcActivities() {
  const ex = useCE((s) => s.e.exItems);
  return (
    <>
      {ex.filter((e) => KDC_KINDS.has(e.kind)).map((e) => (
        <group key={e.id} {...place(e.x, e.y, e.yaw)}><KdcModel e={e} /></group>
      ))}
    </>
  );
}

/** the 24.6 × 25.4 ft slot each activity gets on the client's KDC drawing (back flush with the wall) */
export const KDC_SLOT = { depth: 24.6, width: 25.4 };
const SLOT_KINDS = new Set(['shootout', 'steps', 'quest', 'moonwalker', 'castle']);

function KdcModel({ e }: { e: ExItem }) {
  const name = EX_KINDS[e.kind].label.replace('KDC · ', '');
  if (SLOT_KINDS.has(e.kind)) {
    const cx = -e.w / 2 + KDC_SLOT.depth / 2;
    return (
      <>
        <Ground w={KDC_SLOT.depth} d={KDC_SLOT.width} color="#ffffff" op={0.06} z={0.05} x={cx} />
        {[1, -1].map((sy) => <Ground key={sy} w={KDC_SLOT.depth} d={0.18} color="#ffffff" op={0.35} z={0.06} x={cx} y={(sy * KDC_SLOT.width) / 2} />)}
        <Ground w={0.18} d={KDC_SLOT.width} color="#ffffff" op={0.35} z={0.06} x={cx + KDC_SLOT.depth / 2} />
        <KdcBody e={e} name={name} />
      </>
    );
  }
  return <KdcBody e={e} name={name} />;
}

function KdcBody({ e, name }: { e: ExItem; name: string }) {
  switch (e.kind) {
    case 'shootout': return <><SportsShootout /><Chip z={15} t={name} /></>;
    case 'quest': return <><QuestChallenge /><Chip z={19} t={name} /></>;
    case 'moonwalker': return <><Moonwalker /><Chip z={14} t={name} /></>;
    case 'castle': return <><Castle /><Chip z={21} t={name} /></>;
    case 'steps': return <><DiwaliSteps /><Chip z={15} t="Kids Diwali activity · steps" /></>;
    case 'actSpace': return <ActivitySpace w={e.w} d={e.d} />;
    case 'pocket': return <Pocket w={e.w} d={e.d} />;
    case 'rath': return <Rath r={e.w / 2} />;
    case 'path': return <Ground w={e.w} d={e.d} color="#d4a62a" op={0.9} z={0.09} />;
    case 'fence': return <Barricade len={e.w} />;
    default: return null;
  }
}
const Chip = ({ z, t }: { z: number; t: string }) => <NearHtml pos={L(0, 0, z)} max={110}><div className="label3d sec">{t}</div></NearHtml>;

/* ───────────────────────── primitives ───────────────────────── */
/** puffy inflated block */
export function Puff({ p, s, m, r = 0.5 }: { p: V3; s: V3; m: THREE.Material; r?: number }) {
  const rr = Math.min(r, s[0] / 2, s[1] / 2, s[2] / 2) * 0.98 * FTm;
  return <RoundedBox args={[s[0] * FTm, s[2] * FTm, s[1] * FTm]} radius={rr} smoothness={3} position={L(...p)} material={m} />;
}
/** inflated tube between two points */
export function Tube({ a, b, r, m }: { a: V3; b: V3; r: number; m: THREE.Material }) {
  const A = new THREE.Vector3(...L(...a)), B = new THREE.Vector3(...L(...b));
  const d = B.clone().sub(A), len = d.length();
  if (len < 1e-6) return null;
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const mid = A.clone().add(B).multiplyScalar(0.5);
  return (
    <mesh position={mid} quaternion={q} material={m}>
      <capsuleGeometry args={[r * FTm, Math.max(1e-3, len - 2 * r * FTm), 5, 12]} />
    </mesh>
  );
}
/** extruded polygon: profile points are (plan y, plan z); extruded along plan x from x0 to x0 + w */
export function Prism({ pts, x0, w, m }: { pts: [number, number][]; x0: number; w: number; m: THREE.Material }) {
  const g = useMemo(() => {
    const sh = new THREE.Shape(pts.map(([y, z]) => new THREE.Vector2(y * FTm, z * FTm)));
    return new THREE.ExtrudeGeometry(sh, { depth: w * FTm, bevelEnabled: false });
  }, [pts, w]);
  return <mesh geometry={g} material={m} position={L(x0, 0, 0)} rotation={[0, Math.PI / 2, 0]} />;
}
/** arch lying in the plan x–z plane (spans across the item), centred at (0, y, zc) */
function ArchX({ y, zc, R, r, m, x = 0 }: { y: number; zc: number; R: number; r: number; m: THREE.Material; x?: number }) {
  return <mesh position={L(x, y, zc)} material={m}><torusGeometry args={[R * FTm, r * FTm, 8, 28, Math.PI]} /></mesh>;
}
const Cone = ({ p, r, h, m }: { p: V3; r: number; h: number; m: THREE.Material }) => (
  <mesh position={L(p[0], p[1], p[2] + h / 2)} material={m}><coneGeometry args={[r * FTm, h * FTm, 18]} /></mesh>
);
/** tilted slab: length along plan x (descending toward +x by `ang`), centred at p */
const SlopeX = ({ p, len, wid, th = 0.35, ang, m }: { p: V3; len: number; wid: number; th?: number; ang: number; m: THREE.Material }) => (
  <mesh position={L(...p)} rotation={[0, 0, -ang]} material={m}><boxGeometry args={[len * FTm, th * FTm, wid * FTm]} /></mesh>
);
/** tilted slab: length along plan y (rising toward −y by `ang`), centred at p */
const SlopeY = ({ p, len, wid, th = 0.35, ang, m }: { p: V3; len: number; wid: number; th?: number; ang: number; m: THREE.Material }) => (
  <mesh position={L(...p)} rotation={[-ang, 0, 0]} material={m}><boxGeometry args={[wid * FTm, th * FTm, len * FTm]} /></mesh>
);
export function Ground({ w, d, color, op, z = 0.06, x = 0, y = 0 }: { w: number; d: number; color: string; op: number; z?: number; x?: number; y?: number }) {
  return (
    <mesh position={L(x, y, z)} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
      <planeGeometry args={[w * FTm, d * FTm]} />
      <meshBasicMaterial color={color} transparent opacity={op} depthWrite={false} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} toneMapped={false} />
    </mesh>
  );
}
export const inf = (c: string, o: THREE.MeshStandardMaterialParameters = {}) => std(c, { roughness: 0.38, metalness: 0.02, ...o });

/* ───────────────────────── ground pieces ───────────────────────── */
function Pocket({ w, d }: { w: number; d: number }) {
  const t = 0.35, c = '#e0282e';
  return (
    <>
      <Ground w={w} d={d} color={c} op={0.07} z={0.05} />
      <Ground w={w} d={t} color={c} op={0.7} z={0.07} y={d / 2 - t / 2} /><Ground w={w} d={t} color={c} op={0.7} z={0.07} y={-d / 2 + t / 2} />
      <Ground w={t} d={d} color={c} op={0.7} z={0.07} x={w / 2 - t / 2} /><Ground w={t} d={d} color={c} op={0.7} z={0.07} x={-w / 2 + t / 2} />
      <NearHtml pos={L(w / 2 - 3, 0, 1)} max={150}><div className="label3d sec">KDC pocket · {d} × {w} ft</div></NearHtml>
    </>
  );
}
function Rath({ r }: { r: number }) {
  return (
    <>
      <mesh position={L(0, 0, 0.08)} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
        <ringGeometry args={[(r - 0.3) * FTm, r * FTm, 56]} />
        <meshBasicMaterial color="#e0282e" transparent opacity={0.9} depthWrite={false} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} toneMapped={false} />
      </mesh>
      <Ground w={r * 2} d={r * 2} color="#e0282e" op={0.04} z={0.05} />
      <NearHtml pos={L(0, 0, 1)} max={100}><div className="label3d sec">Rath turnaround · ~{Math.round(r * 2)} ft</div></NearHtml>
    </>
  );
}
function ActivitySpace({ w, d }: { w: number; d: number }) {
  // yellow stanchion line along the +y edge (the side next to booth 10) + a faint reserved floor
  const { posts, ropes } = useMemo(() => {
    const n = Math.max(2, Math.round(w / 3.2) + 1), y = d / 2 - 0.4;
    const posts = Array.from({ length: n }, (_, i) => ({ x: -w / 2 + 1 + (i * (w - 2)) / (n - 1), y }));
    const ropes: Seg[] = posts.slice(0, -1).map((p, i) => ({ a: [p.x, y, 2.7], b: [posts[i + 1].x, y, 2.7], t: 0.12, t2: 0.12 }));
    return { posts, ropes };
  }, [w, d]);
  return (
    <>
      <Ground w={w} d={d} color="#f2d230" op={0.1} z={0.05} />
      <Stanchions posts={posts} ropes={ropes} rope="#f2c230" />
      <NearHtml pos={L(0, 0, 1)} max={100}><div className="label3d sec">Space for activity (open)</div></NearHtml>
    </>
  );
}
function Barricade({ len }: { len: number }) {
  const wood = useMemo(() => std('#8a5a3a', { roughness: 0.85 }), []);
  const n = Math.max(2, Math.round(len / 6) + 1);
  return (
    <>
      {Array.from({ length: n }, (_, i) => <Bx key={i} p={[-len / 2 + (i * len) / (n - 1), 0, 1.9]} s={[0.35, 0.5, 3.8]} m={wood} />)}
      {[1.0, 2.0, 3.0].map((z) => <Bx key={z} p={[0, 0, z]} s={[len, 0.25, 0.35]} m={wood} />)}
    </>
  );
}

/* ───────────────────────── Sports shootout ───────────────────────── */
function ballTex(kind: 'base' | 'basket' | 'soccer' | 'foot') {
  return canvasTex(512, 256, (g, w, h) => {
    const cx = w / 2, cy = h / 2;
    if (kind === 'base') {
      g.fillStyle = '#f4f0e6'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#c8282c'; g.lineWidth = 4;
      for (const s of [-1, 1]) {
        g.beginPath(); g.moveTo(cx + s * 70, 20); g.bezierCurveTo(cx + s * 25, 80, cx + s * 25, 176, cx + s * 70, 236); g.stroke();
        for (let i = 0; i <= 14; i++) { const t = i / 14, x = cx + s * (70 - 45 * Math.sin(Math.PI * t)), y = 20 + 216 * t; g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + s * 14, y + 4); g.stroke(); }
      }
    } else if (kind === 'basket') {
      g.fillStyle = '#e46f22'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#1c1410'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, h); g.moveTo(0, cy); g.lineTo(w, cy); g.stroke();
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * 90, 0); g.bezierCurveTo(cx + s * 20, 70, cx + s * 20, 186, cx + s * 90, h); g.stroke(); }
    } else if (kind === 'soccer') {
      g.fillStyle = '#f6f6f2'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#1b1b1b';
      const pent = (x: number, y: number, r: number, rot = 0) => { g.beginPath(); for (let i = 0; i < 5; i++) { const a = rot + (i * 2 * Math.PI) / 5 - Math.PI / 2; g.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); } g.closePath(); g.fill(); };
      pent(cx, cy, 34);
      for (let i = 0; i < 5; i++) { const a = (i * 2 * Math.PI) / 5 - Math.PI / 2; pent(cx + 100 * Math.cos(a), cy + 100 * Math.sin(a), 24, a + Math.PI / 2); }
      g.strokeStyle = '#555'; g.lineWidth = 2;
      for (let i = 0; i < 5; i++) { const a = (i * 2 * Math.PI) / 5 - Math.PI / 2; g.beginPath(); g.moveTo(cx + 34 * Math.cos(a), cy + 34 * Math.sin(a)); g.lineTo(cx + 78 * Math.cos(a), cy + 78 * Math.sin(a)); g.stroke(); }
    } else {
      g.fillStyle = '#8a4520'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#f4efe4'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(cx - 60, cy); g.lineTo(cx + 60, cy); g.stroke();
      for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(cx + i * 16, cy - 12); g.lineTo(cx + i * 16, cy + 12); g.stroke(); }
      g.lineWidth = 8; g.beginPath(); g.moveTo(cx - 150, 40); g.lineTo(cx - 150, 216); g.moveTo(cx + 150, 40); g.lineTo(cx + 150, 216); g.stroke();
    }
  });
}
function panelTex(kind: 'base' | 'basket' | 'soccer' | 'foot') {
  return canvasTex(264, 400, (g, w, h) => {
    const hole = (x: number, y: number, r: number) => { g.fillStyle = '#e8e0d0'; g.beginPath(); g.arc(x, y, r + 5, 0, 7); g.fill(); g.fillStyle = '#0a0a0a'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
    if (kind === 'base') {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6a2a34'); gr.addColorStop(0.45, '#8a3a40'); gr.addColorStop(0.55, '#3f8a46'); gr.addColorStop(1, '#2d6a3a');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = '#b97a4a'; g.beginPath(); g.ellipse(w / 2, h * 0.86, 110, 50, 0, 0, 7); g.fill();
      g.fillStyle = '#f2ece0'; for (let i = 0; i < 60; i++) g.fillRect((i * 37) % w, 30 + ((i * 53) % 120), 4, 4);
      g.fillStyle = '#1b2a4a'; g.fillRect(30, 205, 60, 140);
      hole(w * 0.52, h * 0.4, 28);
    } else if (kind === 'basket') {
      g.fillStyle = '#1d2a4a'; g.fillRect(0, 0, w, h * 0.6);
      g.fillStyle = '#d6a064'; g.fillRect(0, h * 0.6, w, h * 0.4);
      g.fillStyle = '#c42a2a'; g.fillRect(70, h * 0.55, 90, h * 0.4);
      g.fillStyle = '#f4f2ec'; for (let i = 0; i < 70; i++) g.fillRect((i * 41) % w, 20 + ((i * 29) % 140), 3, 3);
      g.fillStyle = '#f2f0ea'; g.fillRect(68, 40, 128, 84); g.strokeStyle = '#c42a2a'; g.lineWidth = 6; g.strokeRect(100, 70, 64, 40);
      g.fillStyle = '#e8e8e8'; g.fillRect(26, 150, 26, 170); g.fillStyle = '#c42a2a'; g.fillRect(190, 150, 26, 170);
    } else if (kind === 'soccer') {
      g.fillStyle = '#4a6a52'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2;
      for (let x = 0; x <= w; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      for (let y = 0; y <= h; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.fillStyle = '#3fae5a'; g.beginPath(); g.ellipse(70, 130, 46, 86, -0.4, 0, 7); g.fill();
      hole(w * 0.72, h * 0.27, 26); hole(w * 0.8, h * 0.45, 26); hole(w * 0.6, h * 0.66, 26);
    } else {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7a4a52'); gr.addColorStop(0.4, '#8a6a6a'); gr.addColorStop(0.5, '#3d8a46'); gr.addColorStop(1, '#2d6a38');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = '#d8d8d0'; for (let i = 0; i < 80; i++) g.fillRect((i * 31) % w, 24 + ((i * 47) % 150), 3, 3);
      g.fillStyle = '#c42a2a'; g.fillRect(40, 230, 70, 110); g.fillStyle = '#f2f2f2'; g.fillRect(150, 250, 60, 100);
      g.strokeStyle = '#f2f2f2'; g.lineWidth = 3; for (let y = 240; y < h; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      hole(w * 0.62, h * 0.3, 24); hole(w * 0.3, h * 0.57, 24);
    }
  });
}
function matTex(kind: 'base' | 'basket' | 'soccer' | 'foot') {
  return canvasTex(256, 512, (g, w, h) => {
    if (kind === 'base') { g.fillStyle = '#c4564a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f4efe4'; g.lineWidth = 6; g.strokeRect(20, 20, w - 40, h - 40); g.beginPath(); g.moveTo(w / 2, h - 20); g.lineTo(20, h - 150); g.moveTo(w / 2, h - 20); g.lineTo(w - 20, h - 150); g.stroke(); }
    else if (kind === 'basket') { g.fillStyle = '#d9a56e'; g.fillRect(0, 0, w, h); g.fillStyle = '#c9562a'; g.fillRect(70, 0, 116, 200); g.strokeStyle = '#f4efe4'; g.lineWidth = 5; g.strokeRect(70, 0, 116, 200); g.beginPath(); g.arc(w / 2, 200, 58, 0, Math.PI); g.stroke(); }
    else if (kind === 'soccer') { g.fillStyle = '#3a9a44'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f4efe4'; g.lineWidth = 5; g.strokeRect(14, 14, w - 28, h - 28); g.beginPath(); g.arc(w / 2, h * 0.7, 60, 0, 7); g.moveTo(14, h * 0.7); g.lineTo(w - 14, h * 0.7); g.stroke(); }
    else { g.fillStyle = '#2f8a3a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f4efe4'; g.lineWidth = 4; for (let y = 40; y < h; y += 60) { g.beginPath(); g.moveTo(10, y); g.lineTo(w - 10, y); g.stroke(); } g.strokeRect(10, 10, w - 20, h - 20); }
  });
}

function SportsShootout() {
  const M = useMemo(() => ({
    red: inf('#c0262c'), gray: inf('#8b9099'), blue: inf('#2a52d0'), dark: std('#23262c'), rim: inf('#d4262c'),
  }), []);
  const kinds = ['base', 'basket', 'soccer', 'foot'] as const;
  const T = useMemo(() => kinds.map((k) => ({ ball: ballTex(k), panel: panelTex(k), mat: matTex(k) })), []);
  const lanes = [-9, -3, 3, 9];
  return (
    <group>
      <Puff p={[0.2, 0, 1.5]} s={[12.4, 23.6, 3]} m={M.red} r={1.1} />
      {/* gray rails around the lanes */}
      <Tube a={[5.8, -11.6, 3.4]} b={[5.8, 11.6, 3.4]} r={0.95} m={M.gray} />
      <Tube a={[-5.6, -11.6, 3.4]} b={[-5.6, 11.6, 3.4]} r={0.95} m={M.gray} />
      {[-11.7, -6, 0, 6, 11.7].map((y) => <Tube key={y} a={[5.8, y, 3.4]} b={[-5.6, y, 3.4]} r={0.95} m={M.gray} />)}
      {/* backing wall + 4 printed lane panels + domes */}
      <Bx p={[-6.2, 0, 6.6]} s={[0.5, 23.2, 6.8]} m={M.dark} />
      {lanes.map((y, i) => (
        <group key={y}>
          <mesh position={L(0.1, y, 3.12)} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[10.6 * FTm, 4.2 * FTm]} /><meshBasicMaterial map={T[i].mat} toneMapped={false} /></mesh>
          <Pic p={[-5.9, y, 6.8]} w={4.5} h={6.6} tex={T[i].panel} face="x" />
          <mesh position={L(-5.6, y, 10.9)} scale={i === 3 ? [0.8, 0.8, 1.4] : [1, 1, 1]}>
            <sphereGeometry args={[2.55 * FTm, 24, 16]} /><meshStandardMaterial map={T[i].ball} roughness={0.5} />
          </mesh>
        </group>
      ))}
      <Puff p={[-5.2, -3, 8.3]} s={[1.6, 2.2, 0.7]} m={M.rim} r={0.3} />
      {/* blue arch columns */}
      {[-11.7, -6, 0, 6, 11.7].map((y) => (
        <group key={y}>
          <Tube a={[5.0, y, 3.6]} b={[4.0, y, 8.8]} r={0.85} m={M.blue} />
          <Tube a={[4.0, y, 8.8]} b={[-5.3, y, 9.8]} r={0.8} m={M.blue} />
        </group>
      ))}
    </group>
  );
}

/* ───────────────────────── Quest challenge ───────────────────────── */
function QuestChallenge() {
  const M = useMemo(() => ({
    red: inf('#d02a2a'), green: inf('#2fa84a'), purple: inf('#5a3ca8'), blue: inf('#2a52c8'), yellow: inf('#f2d02a'), floor: std('#6b6f78'),
    mesh: new THREE.MeshStandardMaterial({ color: '#1c1c22', transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
  }), []);
  const sign = useMemo(() => canvasTex(512, 400, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#4a3ab0'; g.beginPath(); g.moveTo(10, h); g.lineTo(10, h * 0.5); g.arc(w / 2, h * 0.5, w / 2 - 10, Math.PI, 0); g.lineTo(w - 10, h); g.closePath(); g.fill();
    g.lineWidth = 14; g.strokeStyle = '#2a52c8'; g.stroke();
    g.fillStyle = '#f2d02a'; g.textAlign = 'center'; g.font = '900 78px Impact, Arial Black, sans-serif'; g.fillText('THE', w / 2, h * 0.52); g.font = '900 96px Impact, Arial Black, sans-serif'; g.fillText('QUEST', w / 2, h * 0.8);
  }), []);
  const cols: [number, THREE.Material][] = [[0.85, M.red], [2.55, M.green], [4.25, M.purple]];
  return (
    <group>
      <Bx p={[0, 0, 0.05]} s={[12.6, 23.6, 0.1]} m={M.floor} />
      {/* three-tier perimeter tubes: red / green / purple */}
      {cols.map(([z, m]) => (
        <group key={z}>
          <Tube a={[-5.9, -11.2, z]} b={[-5.9, 11.2, z]} r={0.85} m={m} />
          <Tube a={[-5.9, -11.2, z]} b={[5.9, -11.2, z]} r={0.85} m={m} />
          <Tube a={[-5.9, 11.2, z]} b={[5.9, 11.2, z]} r={0.85} m={m} />
          <Tube a={[5.9, -11.2, z]} b={[5.9, 1.6, z]} r={0.85} m={m} />
        </group>
      ))}
      <Tube a={[5.9, 1.6, 0.85]} b={[5.9, 11.2, 0.85]} r={0.85} m={M.red} />
      {/* big slide: sloped double lane, purple/green rails, tall blue arch frame at the top */}
      <SlopeY p={[-1.2, -4.3, 7.3]} len={13.7} wid={2.5} ang={0.58} m={M.yellow} />
      <SlopeY p={[1.3, -4.3, 7.3]} len={13.7} wid={2.5} ang={0.58} m={M.blue} />
      {[-2.9, 2.9].map((x) => (
        <group key={x}>
          <Tube a={[x, -10.2, 11.4]} b={[x, 1.6, 3.8]} r={0.8} m={M.purple} />
          <Tube a={[x, -10.2, 10.0]} b={[x, 1.6, 2.4]} r={0.8} m={M.green} />
          <Tube a={[x, -10.5, 0.8]} b={[x, -10.5, 13.8]} r={0.85} m={M.blue} />
        </group>
      ))}
      <Tube a={[-2.9, -10.5, 14.1]} b={[2.9, -10.5, 14.1]} r={0.85} m={M.blue} />
      <Prism pts={[[-12, 0], [-12, 7.6], [-6.4, 0]]} x0={-2.6} w={5.2} m={M.red} />
      {/* entrance arch with the sign, tunnel, round portholes, little front slide */}
      {[3.3, 10.2].map((y) => <Tube key={y} a={[6.2, y, 0.8]} b={[6.2, y, 4.4]} r={0.85} m={M.blue} />)}
      <ArchX y={6.75} zc={4.4} R={3.45} r={0.85} m={M.blue} x={6.2} />
      <Pic p={[6.75, 6.75, 4.6]} w={6} h={4.8} tex={sign} face="x" alpha />
      <SlopeX p={[7.9, 6.75, 1.15]} len={4.2} wid={4.6} th={0.2} ang={0.3} m={M.yellow} />
      <Bx p={[6.1, 6.75, 2.2]} s={[0.3, 6.1, 4.4]} m={M.mesh} />
    </group>
  );
}

/* ───────────────────────── Moonwalker challenge ───────────────────────── */
function Moonwalker() {
  const M = useMemo(() => ({
    red: inf('#d83a2e'), yellow: inf('#f4d430'), green: inf('#2fa84a'), blue: inf('#2a6ad0'), sky: inf('#3aa9e0'), purple: inf('#6a4ab8'), dark: std('#202226'),
    net: new THREE.MeshStandardMaterial({ color: '#2a2c33', transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
  }), []);
  const post = (x: number, y: number, h = 3.6, k = 0) => (
    <group key={`${x}_${y}_${k}`}>
      <Cyl p={[x, y, 1.1]} r={0.85} h={h} m={M.red} /><Cyl p={[x, y, 1.1 + h]} r={0.9} h={0.7} m={M.yellow} />
    </group>
  );
  return (
    <group>
      <Puff p={[0, 0, 0.55]} s={[12, 25, 1.1]} m={M.red} r={0.5} />
      {/* left section: green / blue tube walls, nested red + yellow end arches, red posts */}
      {[[1.9, M.green], [3.6, M.blue]].map(([z, m]) => (
        <group key={z as number}>{[-5.5, 5.5].map((x) => <Tube key={x} a={[x, -11.2, z as number]} b={[x, -4.4, z as number]} r={0.85} m={m as THREE.Material} />)}</group>
      ))}
      <ArchX y={-11.7} zc={3.0} R={5.1} r={0.9} m={M.red} />
      <ArchX y={-9.9} zc={3.0} R={4.6} r={0.8} m={M.yellow} />
      {[[-2, -7.6], [2, -6.6], [0, -5.4], [-3.4, -4.9], [3.4, -8.8]].map(([x, y]) => post(x, y))}
      {/* middle: tall blue arches with netted windows, purple wedges, yellow beam */}
      <ArchX y={-3.4} zc={3.0} R={5.2} r={0.95} m={M.blue} />
      <ArchX y={4.0} zc={3.0} R={5.2} r={0.95} m={M.blue} />
      <Tube a={[0, -3.4, 8.4]} b={[0, 4.0, 8.4]} r={0.7} m={M.yellow} />
      {[-5.9, 5.9].map((x) => <mesh key={x} position={L(x, 0.3, 5.4)} rotation={[0, Math.PI / 2, 0]} material={M.net}><planeGeometry args={[6.4 * FTm, 5.2 * FTm]} /></mesh>)}
      <Prism pts={[[-3.4, 1.1], [0.4, 1.1], [-1.5, 4.8]]} x0={-5.2} w={10.4} m={M.purple} />
      <Prism pts={[[0.5, 1.1], [4.0, 1.1], [3.0, 3.6]]} x0={-5.2} w={10.4} m={M.green} />
      {post(-2, 1.5, 3.2, 1)}{post(2.4, -0.6, 3.2, 1)}
      {/* right section: yellow end wall + yellow tubes, blue cross tube on posts, red posts, red target */}
      <Puff p={[0, 11.8, 3.6]} s={[11.6, 1.6, 6.4]} m={M.yellow} r={0.6} />
      {[[1.9, M.yellow], [3.6, M.yellow]].map(([z]) => (
        <group key={z as number}>{[-5.5, 5.5].map((x) => <Tube key={x} a={[x, 5.0, z as number]} b={[x, 11.0, z as number]} r={0.85} m={M.yellow} />)}</group>
      ))}
      {[-5.5, 5.5].map((x) => <Tube key={x} a={[x, 7.4, 1.2]} b={[x, 7.4, 6.6]} r={0.8} m={M.blue} />)}
      <Tube a={[-5.5, 7.4, 6.8]} b={[5.5, 7.4, 6.8]} r={0.85} m={M.blue} />
      {post(-2.4, 9.4, 3.4, 2)}{post(2.2, 10.2, 3.4, 2)}{post(0, 6.2, 3.4, 2)}
      <mesh position={L(0, 10.9, 4.2)} rotation={[0, Math.PI, 0]}><circleGeometry args={[1.6 * FTm, 18]} /><meshStandardMaterial color="#d83a2e" side={THREE.DoubleSide} /></mesh>
      {/* blower + hose at the back */}
      <Bx p={[-7.4, -3, 0.9]} s={[1.8, 1.8, 1.8]} m={M.dark} />
      <Tube a={[-6.4, -3, 0.7]} b={[-5.9, -3, 0.7]} r={0.35} m={M.red} />
    </group>
  );
}

/* ───────────────────────── 7-in-1 castle ───────────────────────── */
function Castle() {
  const M = useMemo(() => ({
    blue: inf('#2540b0'), yellow: inf('#f6dc3c'), red: inf('#cc2c2a'), cyan: inf('#3ab0e6'), white: inf('#f2f2ee'), black: std('#0c0c0e'),
    net: new THREE.MeshStandardMaterial({ color: '#1e1f24', transparent: true, opacity: 0.6, side: THREE.DoubleSide }),
  }), []);
  const towers = [-10.2, 2.6];
  return (
    <group>
      {/* blue base + yellow facade */}
      <Puff p={[0, -3.6, 1.2]} s={[14.6, 13.8, 2.4]} m={M.blue} r={1} />
      <Puff p={[0.2, -3.6, 7.2]} s={[13.2, 12.4, 9.6]} m={M.yellow} r={0.5} />
      {/* big mesh window + door arch on the front */}
      <Bx p={[6.85, -3.8, 8.1]} s={[0.2, 8.4, 4.8]} m={M.net} />
      {[[6.9, -3.8, 10.6, 8.6, 0.3], [6.9, -3.8, 5.6, 8.6, 0.3]].map((q, i) => <Bx key={i} p={[q[0], q[1], q[2]]} s={[0.25, q[3], q[4]]} m={M.red} />)}
      <Bx p={[6.85, -3.6, 3.6]} s={[0.3, 3.2, 2.4]} m={M.red} /><Bx p={[6.95, -3.6, 3.4]} s={[0.3, 2.3, 2.0]} m={M.black} />
      {/* red roof: sloped band + ridge, yellow window blocks */}
      <mesh position={L(4.6, -3.6, 12.6)} rotation={[0, 0, -0.45]} material={M.red}><boxGeometry args={[4.6 * FTm, 1.4 * FTm, 13.2 * FTm]} /></mesh>
      <Puff p={[-2.2, -3.6, 13.2]} s={[7.4, 12.8, 1.8]} m={M.red} r={0.6} />
      {[-9, -6.6, -4.2, -1.8, 0.6].map((y) => <Bx key={y} p={[6.4, y, 12.6]} s={[0.6, 1.3, 0.9]} m={M.yellow} />)}
      {/* two blue towers with red bands and conical roofs */}
      {towers.map((y) => (
        <group key={y}>
          <Cyl p={[6.4, y, 2.2]} r={1.55} h={9.6} m={M.blue} />
          <Cyl p={[6.4, y, 11.7]} r={1.95} h={1.1} m={M.red} />
          <Cone p={[6.4, y, 12.8]} r={1.95} h={3.9} m={M.blue} />
        </group>
      ))}
      {/* side slide: white chute between blue / cyan walls, yellow bumpers, red mesh nook */}
      <Tube a={[7.9, 3.7, 1.0]} b={[7.9, 10.3, 1.0]} r={1.0} m={M.blue} />
      <SlopeX p={[2.0, 7.0, 5.7]} len={12.6} wid={3.8} ang={0.65} m={M.white} />
      <Puff p={[7.2, 4.1, 2.6]} s={[3.2, 1.8, 2.4]} m={M.yellow} r={0.8} /><Puff p={[7.2, 9.9, 2.6]} s={[3.2, 1.8, 2.4]} m={M.yellow} r={0.8} />
      {[4.1, 9.9].map((y) => <mesh key={y} position={L(6.0, y, 4.5)} material={M.cyan}><sphereGeometry args={[1.0 * FTm, 14, 10]} /></mesh>)}
      <Puff p={[-1.2, 10.9, 5.8]} s={[6.8, 1.2, 9.6]} m={M.cyan} r={0.5} />
      <Puff p={[-1.2, 3.8, 5.2]} s={[6.8, 1.2, 8.4]} m={M.yellow} r={0.5} />
      <Puff p={[-3.4, 7.0, 10.8]} s={[2.6, 4.6, 2.2]} m={M.red} r={0.4} />
      <Bx p={[-2.1, 7.0, 10.8]} s={[0.2, 3.6, 1.6]} m={M.net} />
    </group>
  );
}

/* ───────────────────────── Kids Diwali activity · steps ───────────────────────── */
const DIYA = ['#1fa7b0', '#e53b3b', '#f2b632', '#f08a2c', '#6a3fb0', '#2fa05a'];
function DiwaliSteps() {
  const M = useMemo(() => ({ orange: std('#f07a1c', { roughness: 0.55 }), gold: std('#e4b83a', { metalness: 0.6, roughness: 0.35 }), cream: std('#f3e0ad') }), []);
  const back = useMemo(() => canvasTex(1100, 600, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const f = 50; // px per ft
    const Y = (z: number) => h - z * f;
    // panel silhouettes (x in ft across 22 ft, z in ft up from the floor)
    const sil = (x0: number, x1: number, hBase: number, hBump: number, bw: number) => {
      const mid = (x0 + x1) / 2;
      g.beginPath(); g.moveTo(x0 * f, h);
      g.lineTo(x0 * f, Y(hBase));
      g.lineTo((mid - bw) * f, Y(hBase)); g.quadraticCurveTo((mid - bw * 0.5) * f, Y(hBase + hBump * 0.15), (mid - bw * 0.35) * f, Y(hBase + hBump * 0.55));
      g.quadraticCurveTo(mid * f, Y(hBase + hBump * 1.1), (mid + bw * 0.35) * f, Y(hBase + hBump * 0.55));
      g.quadraticCurveTo((mid + bw * 0.5) * f, Y(hBase + hBump * 0.15), (mid + bw) * f, Y(hBase));
      g.lineTo(x1 * f, Y(hBase)); g.lineTo(x1 * f, h); g.closePath();
      g.fillStyle = '#f3e0ad'; g.fill(); g.lineWidth = 7; g.strokeStyle = '#d9a82e'; g.stroke();
    };
    const arch = (x0: number, x1: number, zTop: number, zBot: number) => {
      const mid = (x0 + x1) / 2, rr = (x1 - x0) / 2;
      g.beginPath(); g.moveTo(x0 * f, Y(zBot)); g.lineTo(x0 * f, Y(zTop - rr)); g.quadraticCurveTo(x0 * f, Y(zTop - rr * 0.3), mid * f, Y(zTop));
      g.quadraticCurveTo(x1 * f, Y(zTop - rr * 0.3), x1 * f, Y(zTop - rr)); g.lineTo(x1 * f, Y(zBot)); g.closePath();
      const gr = g.createLinearGradient(0, Y(zTop), 0, Y(zBot)); gr.addColorStop(0, '#f6a23a'); gr.addColorStop(1, '#ee7a18');
      g.fillStyle = gr; g.fill(); g.lineWidth = 6; g.strokeStyle = '#d9a82e'; g.stroke();
    };
    sil(0, 7.6, 8.4, 1.6, 2.6); sil(7.6, 14.4, 10.2, 1.8, 2.6); sil(14.4, 22, 8.4, 1.6, 2.6);
    arch(1.2, 6.4, 7.7, 1.6); arch(8.9, 13.1, 9.9, 1.6); arch(15.6, 20.8, 7.7, 1.6);
    // marigold garlands
    const bead = (x: number, y: number) => { g.fillStyle = Math.random() > 0.5 ? '#f08a1c' : '#f6b030'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); };
    const swg = (xa: number, xb: number, z: number, sag: number) => { for (let i = 0; i <= 26; i++) { const t = i / 26; bead((xa + (xb - xa) * t) * f, Y(z - sag * 4 * t * (1 - t))); } };
    swg(0.6, 3.8, 7.6, 1.6); swg(3.8, 7.0, 7.6, 1.6); swg(15.0, 18.2, 7.6, 1.6); swg(18.2, 21.4, 7.6, 1.6);
    for (let i = 0; i < 18; i++) bead(11 * f, Y(9.6 - i * 0.38));
    g.fillStyle = '#e8a020'; g.beginPath(); g.arc(11 * f, Y(2.6), 11, 0, 7); g.fill();
  }), []);
  const tiers = useMemo(() => Array.from({ length: 7 }, (_, k) => ({ k, W: 19.4 - 1.75 * k, xf: 4.5 - 1.25 * k, z: 0.95 * (k + 1) })), []);
  const diyas = useMemo(() => {
    const out: { x: number; y: number; z: number; c: string }[] = [];
    let n = 0;
    for (const t of tiers) {
      const cnt = Math.floor(t.W / 0.95);
      for (let i = 0; i < cnt; i++) for (const dx of [0.45, 1.1]) out.push({ x: t.xf - dx, y: -t.W / 2 + 0.5 + (i * (t.W - 1)) / Math.max(1, cnt - 1), z: t.z, c: DIYA[n++ % DIYA.length] });
    }
    return out;
  }, [tiers]);
  const diyaG = useMemo(() => new THREE.CylinderGeometry(0.3 * FTm, 0.16 * FTm, 0.28 * FTm, 8).translate(0, 0.14 * FTm, 0), []);
  const diyaM = useMemo(() => std('#ffffff', { roughness: 0.5 }), []);
  return (
    <group>
      <Pic p={[-5.2, 0, 6.2]} w={22} h={12} tex={back} face="x" alpha />
      <Bx p={[-5.0, 0, 0.5]} s={[0.6, 22, 1.0]} m={M.orange} />
      {tiers.map((t) => (
        <group key={t.k}>
          <Bx p={[(t.xf - 4.7) / 2, 0, t.z / 2]} s={[t.xf + 4.7, t.W, t.z]} m={M.orange} />
          <Bx p={[t.xf + 0.02, 0, t.z - 0.1]} s={[0.12, t.W + 0.1, 0.22]} m={M.gold} />
        </group>
      ))}
      <Inst geo={diyaG} mat={diyaM} n={diyas.length} colored deps={[diyas]} fill={(i, d, c) => { const q = diyas[i]; d.position.set(...L(q.x, q.y, q.z)); c.set(q.c); }} />
    </group>
  );
}
