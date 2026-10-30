'use client';
// Site structures added from photos: the solar-panel canopy over the food court, shoe stands and the Mandir Hall visitor ramp.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useCE, type Canopy, type ShoeRow, type Ramp } from '@/lib/campusEdits';
import { FTm } from './materials';
import { std, canvasTex, Inst, NearHtml } from './CampusModel';

type V3 = [number, number, number];
const L = (x: number, y: number, z: number): V3 => [x * FTm, z * FTm, -y * FTm];
const rad = (d: number) => (d * Math.PI) / 180;
const place = (x: number, y: number, yaw: number) => ({ position: L(x, y, 0), rotation: [0, rad(yaw), 0] as V3 });

/** straight members between two plan points (feet). t = thickness across the beam's local Y, t2 = across local Z */
export interface Seg { a: V3; b: V3; t: number; t2: number }
export function Beams({ segs, mat }: { segs: Seg[]; mat: THREE.Material }) {
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const X = useMemo(() => new THREE.Vector3(1, 0, 0), []);
  return (
    <Inst geo={geo} mat={mat} n={segs.length} deps={[segs]} fill={(i, d) => {
      const s = segs[i];
      const a = new THREE.Vector3(...L(...s.a)), b = new THREE.Vector3(...L(...s.b));
      const dir = b.clone().sub(a);
      const len = dir.length();
      d.position.copy(a.clone().add(b).multiplyScalar(0.5));
      if (len > 1e-6) d.quaternion.setFromUnitVectors(X, dir.normalize());
      d.scale.set(len, s.t * FTm, s.t2 * FTm);
    }} />
  );
}

/* ───────────────────────── solar canopy ───────────────────────── */
export function SolarCanopies({ on = true }: { on?: boolean }) {
  const list = useCE((s) => s.e.canopies);
  if (!on) return null;
  return <>{list.map((c) => <CanopyModel key={c.id} c={c} />)}</>;
}

function CanopyModel({ c }: { c: Canopy }) {
  const [x0, x1, y0, y1] = c.r;
  const zS = c.h + 4, zN = c.h; // south edge high, north edge low
  const zAt = (y: number) => zS + ((zN - zS) * (y - y0)) / (y1 - y0);
  const M = useMemo(() => ({
    steel: std('#c9ced4', { metalness: 0.5, roughness: 0.45 }), dark: std('#3a4048', { metalness: 0.5, roughness: 0.5 }),
    post: std('#d8dce0', { metalness: 0.4, roughness: 0.5 }), foot: std('#8c9096'),
  }), []);
  const tex = useMemo(() => {
    const t = canvasTex(256, 128, (g, w, h) => {
      g.fillStyle = '#b9bfc8'; g.fillRect(0, 0, w, h); // aluminium frame
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#16275a'); gr.addColorStop(1, '#0d1a40');
      g.fillStyle = gr; g.fillRect(4, 4, w - 8, h - 8);
      g.strokeStyle = 'rgba(160,185,235,0.5)'; g.lineWidth = 1;
      for (let i = 1; i < 10; i++) { g.beginPath(); g.moveTo(4 + (i * (w - 8)) / 10, 4); g.lineTo(4 + (i * (w - 8)) / 10, h - 4); g.stroke(); }
      for (let j = 1; j < 6; j++) { g.beginPath(); g.moveTo(4, 4 + (j * (h - 8)) / 6); g.lineTo(w - 4, 4 + (j * (h - 8)) / 6); g.stroke(); }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    const slope = Math.hypot(y1 - y0, zS - zN);
    t.repeat.set(Math.max(1, (x1 - x0) / 6.6), Math.max(1, slope / 3.3));
    return t;
  }, [x0, x1, y0, y1, zS, zN]);
  const deck = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const P = [L(x0, y0, zS), L(x1, y0, zS), L(x1, y1, zN), L(x0, y1, zN)];
    g.setAttribute('position', new THREE.Float32BufferAttribute(P.flat(), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    g.setIndex([0, 2, 1, 0, 3, 2]);
    g.computeVertexNormals();
    return g;
  }, [x0, x1, y0, y1, zS, zN]);

  const { cols, beams, purl, fascia } = useMemo(() => {
    const nx = Math.max(2, Math.ceil((x1 - x0) / 40) + 1), ny = Math.max(2, Math.ceil((y1 - y0) / 60) + 1);
    const xs = Array.from({ length: nx }, (_, i) => x0 + 4 + ((x1 - x0 - 8) * i) / (nx - 1));
    const ys = Array.from({ length: ny }, (_, j) => y0 + 4 + ((y1 - y0 - 8) * j) / (ny - 1));
    const cols: { x: number; y: number; z: number }[] = [];
    const beams: Seg[] = [], purl: Seg[] = [], fascia: Seg[] = [];
    for (const y of ys) {
      for (const x of xs) cols.push({ x, y, z: zAt(y) - 1.4 });
      beams.push({ a: [x0, y, zAt(y) - 1.1], b: [x1, y, zAt(y) - 1.1], t: 1.0, t2: 0.7 });
    }
    // purlins run up-slope every ~6.6 ft, tucked under the panels
    const np = Math.round((x1 - x0) / 6.6);
    for (let i = 0; i <= np; i++) {
      const x = x0 + ((x1 - x0) * i) / np;
      purl.push({ a: [x, y0, zS - 0.45], b: [x, y1, zN - 0.45], t: 0.5, t2: 0.4 });
    }
    // white fascia round the edge
    fascia.push({ a: [x0, y0, zS - 0.5], b: [x1, y0, zS - 0.5], t: 1.1, t2: 0.4 }, { a: [x0, y1, zN - 0.5], b: [x1, y1, zN - 0.5], t: 1.1, t2: 0.4 },
      { a: [x0, y0, zS - 0.5], b: [x0, y1, zN - 0.5], t: 1.1, t2: 0.4 }, { a: [x1, y0, zS - 0.5], b: [x1, y1, zN - 0.5], t: 1.1, t2: 0.4 });
    return { cols, beams, purl, fascia };
  }, [x0, x1, y0, y1, zS, zN]);
  const colG = useMemo(() => new THREE.CylinderGeometry(0.4 * FTm, 0.45 * FTm, 1, 10).translate(0, 0.5, 0), []);
  const footG = useMemo(() => new THREE.BoxGeometry(1.6 * FTm, 0.4 * FTm, 1.6 * FTm).translate(0, 0.2 * FTm, 0), []);
  const lampG = useMemo(() => new THREE.BoxGeometry(1.2 * FTm, 0.5 * FTm, 0.8 * FTm), []);
  const lampM = useMemo(() => std('#eef2f6', { emissive: new THREE.Color('#fff2cf'), emissiveIntensity: 0.4 }), []);
  return (
    <group>
      <mesh geometry={deck}><meshStandardMaterial map={tex} side={THREE.DoubleSide} roughness={0.35} metalness={0.25} /></mesh>
      <Inst geo={colG} mat={M.post} n={cols.length} deps={[cols]} fill={(i, d) => { d.position.set(...L(cols[i].x, cols[i].y, 0)); d.scale.set(1, cols[i].z * FTm, 1); }} />
      <Inst geo={footG} mat={M.foot} n={cols.length} deps={[cols]} fill={(i, d) => d.position.set(...L(cols[i].x, cols[i].y, 0))} />
      <Beams segs={beams} mat={M.steel} />
      <Beams segs={purl} mat={M.dark} />
      <Beams segs={fascia} mat={M.post} />
      {/* floodlights on the south edge columns */}
      <Inst geo={lampG} mat={lampM} n={cols.length} deps={[cols]} fill={(i, d) => { d.position.set(...L(cols[i].x, cols[i].y - 0.8, cols[i].z + 0.2)); }} />
      <NearHtml pos={L((x0 + x1) / 2, (y0 + y1) / 2, zS + 4)} max={220}><div className="label3d sec">Solar canopy · food stalls</div></NearHtml>
    </group>
  );
}

/* ───────────────────────── shoe stands ───────────────────────── */
export function ShoeRows() {
  const list = useCE((s) => s.e.shoes);
  return <>{list.map((r) => <ShoeRowModel key={r.id} r={r} />)}</>;
}
const MOD = 6, RH = 6.5, RD = 1.5, SHELVES = 12;
function ShoeRowModel({ r }: { r: ShoeRow }) {
  const wood = useMemo(() => std('#a2432a', { roughness: 0.8 }), []);
  const white = useMemo(() => std('#ffffff'), []);
  const { boards, ups, diags, signs } = useMemo(() => {
    const boards: Seg[] = [], ups: Seg[] = [], diags: Seg[] = [], signs: Seg[] = [];
    for (let m = 0; m < r.n; m++) {
      for (let k = 0; k < SHELVES; k++) boards.push({ a: [m * MOD, 0, 0.45 + k * 0.5], b: [(m + 1) * MOD, 0, 0.45 + k * 0.5], t: 0.12, t2: RD });
      if (m % 2 === 0) {
        diags.push({ a: [m * MOD + 0.2, -RD / 2 - 0.05, 0.3], b: [m * MOD + MOD / 2, -RD / 2 - 0.05, RH - 0.2], t: 0.22, t2: 0.12 }, { a: [m * MOD + MOD - 0.2, -RD / 2 - 0.05, 0.3], b: [m * MOD + MOD / 2, -RD / 2 - 0.05, RH - 0.2], t: 0.22, t2: 0.12 });
      }
      signs.push({ a: [m * MOD + 2.6, -RD / 2 - 0.1, RH - 0.9], b: [m * MOD + 3.4, -RD / 2 - 0.1, RH - 0.9], t: 0.8, t2: 0.03 });
    }
    for (let i = 0; i <= r.n; i++) ups.push({ a: [i * MOD, 0, 0], b: [i * MOD, 0, RH], t: 0.3, t2: RD });
    return { boards, ups, diags, signs };
  }, [r.n]);
  return (
    <group {...place(r.x, r.y, r.yaw)}>
      <Beams segs={boards} mat={wood} /><Beams segs={ups} mat={wood} /><Beams segs={diags} mat={wood} /><Beams segs={signs} mat={white} />
      <NearHtml pos={L(r.n * MOD / 2, 0, RH + 2)} max={110}><div className="label3d sec">Shoe stands</div></NearHtml>
    </group>
  );
}

/* ───────────────────────── Mandir Hall visitor ramp ───────────────────────── */
export function Ramps() {
  const list = useCE((s) => s.e.ramps);
  return <>{list.map((r) => <RampModel key={r.id} r={r} />)}</>;
}
function RampModel({ r }: { r: Ramp }) {
  const { len, w, h, lane } = r;
  const M = useMemo(() => ({
    deck: std('#4a4f57', { roughness: 0.6, metalness: 0.2 }), skirt: std('#b3262e'), chrome: std('#d9dde2', { metalness: 0.85, roughness: 0.25 }),
    rope: std('#c4252d'), lane: new THREE.MeshBasicMaterial({ color: '#d63a45', transparent: true, opacity: 0.28, depthWrite: false, toneMapped: false }),
    edge: new THREE.MeshBasicMaterial({ color: '#f4efe0', toneMapped: false }),
  }), []);
  const tri = (depth: number) => {
    const s = new THREE.Shape(r.flat
      ? [new THREE.Vector2(0, 0), new THREE.Vector2(len, 0), new THREE.Vector2(len, h), new THREE.Vector2(0, h)]
      : [new THREE.Vector2(0, 0), new THREE.Vector2(len, 0), new THREE.Vector2(len, h)]);
    return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }).translate(0, 0, -depth / 2);
  };
  const deckG = useMemo(() => tri(w - 0.5), [len, w, h, r.flat]);
  const skirtG = useMemo(() => tri(0.25), [len, w, h, r.flat]);
  const nP = Math.max(1, Math.ceil(len / 5));
  const sideY = w / 2 - 0.2;
  const rail = useMemo(() => {
    const posts: { x: number; y: number; z: number }[] = [];
    const ropes: Seg[] = [];
    for (const sd of [-1, 1]) {
      for (let i = 0; i <= nP; i++) posts.push({ x: (len * i) / nP, y: sd * sideY, z: (r.flat ? h : (h * i) / nP) + 0.1 });
      for (let i = 0; i < nP; i++) {
        const a = posts[posts.length - nP - 1 + i], b = posts[posts.length - nP + i];
        ropes.push({ a: [a.x, a.y, a.z + 2.7], b: [b.x, b.y, b.z + 2.7], t: 0.14, t2: 0.14 });
      }
    }
    // ground lane: stanchions along its outer edge
    const laneY = lane === 0 ? 0 : Math.sign(lane) * (w / 2 + Math.abs(lane));
    if (lane !== 0) {
      const nl = Math.max(1, Math.ceil(len / 5));
      const start = posts.length;
      for (let i = 0; i <= nl; i++) posts.push({ x: (len * i) / nl, y: laneY, z: 0 });
      for (let i = 0; i < nl; i++) { const a = posts[start + i], b = posts[start + i + 1]; ropes.push({ a: [a.x, a.y, 2.7], b: [b.x, b.y, 2.7], t: 0.14, t2: 0.14 }); }
    }
    return { posts, ropes, laneY };
  }, [len, w, h, lane, nP, r.flat]);
  const poleG = useMemo(() => new THREE.CylinderGeometry(0.1 * FTm, 0.1 * FTm, 2.9 * FTm, 8).translate(0, 1.45 * FTm, 0), []);
  const baseG = useMemo(() => new THREE.CylinderGeometry(0.42 * FTm, 0.46 * FTm, 0.1 * FTm, 14).translate(0, 0.05 * FTm, 0), []);
  const capG = useMemo(() => new THREE.SphereGeometry(0.17 * FTm, 8, 6).translate(0, 2.95 * FTm, 0), []);
  const fillP = (i: number, d: THREE.Object3D) => d.position.set(...L(rail.posts[i].x, rail.posts[i].y, rail.posts[i].z));
  const laneYc = lane === 0 ? 0 : Math.sign(lane) * (w / 2 + Math.abs(lane) / 2);
  return (
    <group {...place(r.x, r.y, r.yaw)}>
      <mesh geometry={deckG} scale={FTm} position={[0, 0.08 * FTm, 0]} material={M.deck} />
      {[-1, 1].map((sd) => <mesh key={sd} geometry={skirtG} scale={FTm} position={L(0, sd * (w / 2 - 0.12), 0)} material={M.skirt} />)}
      <Inst geo={poleG} mat={M.chrome} n={rail.posts.length} deps={[rail]} fill={fillP} />
      <Inst geo={baseG} mat={M.chrome} n={rail.posts.length} deps={[rail]} fill={fillP} />
      <Inst geo={capG} mat={M.chrome} n={rail.posts.length} deps={[rail]} fill={fillP} />
      <Beams segs={rail.ropes} mat={M.rope} />
      {lane !== 0 && (
        <>
          <mesh position={L(len / 2, laneYc, 0.04)} rotation={[-Math.PI / 2, 0, 0]} material={M.lane}><planeGeometry args={[len * FTm, Math.abs(lane) * FTm]} /></mesh>
          <mesh position={L(len / 2, laneYc, 0.06)} rotation={[-Math.PI / 2, 0, 0]} material={M.edge}><planeGeometry args={[len * FTm, 0.3 * FTm]} /></mesh>
        </>
      )}
      <NearHtml pos={L(len / 2, 0, h + 5)} max={110}><div className="label3d sec">Visitor ramp</div></NearHtml>
    </group>
  );
}
