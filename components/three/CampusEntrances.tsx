'use client';
// Gate + facility-front layer: the Utsavpur carnival gate (at the KDC gate marker), the welcome peacock pillars, the wooden entrance art
// panel on the island, the 4 + 4 wall-wash lights on the facility wings, and the white pick-up / drop-off barricades.
// Models are built in local plan feet (front = +x, local y = right when facing the item, z up) inside a placed + yawed group.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useCE, SITE_KINDS, type ExItem, type CarnivalGate } from '@/lib/campusEdits';
import { FTm } from './materials';
import { std, canvasTex } from './CampusModel';
import { Bx, Cyl, L, place, rad } from './CampusFestival';
import { Prism, Puff } from './CampusKdc';

export function SiteExtras() {
  const ex = useCE((s) => s.e.exItems);
  return (
    <>
      {ex.filter((e) => SITE_KINDS.has(e.kind)).map((e) => (
        <group key={e.id} {...place(e.x, e.y, e.yaw)}>
          {e.kind === 'peacock' && <Peacock side={e.t === 'R' ? 1 : -1} s={e.w / 4.6} />}
          {e.kind === 'woodArt' && <WoodArt w={e.d} />}
          {e.kind === 'washRow' && <WashRow len={e.w} color={e.t || '#3b6cff'} />}
          {e.kind === 'barrier' && <BarrierRun len={e.w} />}
        </group>
      ))}
    </>
  );
}

/* ───────────────────────── Utsavpur gate ───────────────────────── */
// cloud-topped carnival gate (image 1 outline), body colours from the real gate (image 2)
const CLOUD: [number, number][] = [[419, 60], [385, 63], [355, 78], [342, 96], [318, 100], [280, 100], [248, 108], [230, 126], [218, 144], [190, 146], [160, 156], [150, 178], [166, 208], [210, 226], [270, 233], [340, 238], [419, 241]];
const GATE = { body: '#16a3a8', trim: '#f2b632', pink: '#d63a78', cream: '#fff1d6', navy: '#1c3d6b' };

export function UtsavpurGates() {
  const list = useCE((s) => s.e.carnival);
  return <>{list.filter((g) => g.style === 'utsavpur').map((g) => <group key={g.id} {...place(g.x, g.y, g.yaw)}><UtsavpurGate g={g} /></group>)}</>;
}

function UtsavpurGate({ g }: { g: CarnivalGate }) {
  const k = g.w / 24;
  const m = useMemo(() => ({
    body: std(GATE.body, { roughness: 0.55 }), trim: std(GATE.trim, { roughness: 0.35, metalness: 0.3 }), pink: std(GATE.pink, { roughness: 0.55 }),
    cream: std(GATE.cream, { roughness: 0.7 }),
  }), []);
  const half = 12 * k, pillarW = 3.4 * k, H = 11 * k, cloudH = 8.5 * k, T = 1.6 * k;
  // cloud outline scaled to gate: y across, z up (left half from the list, mirrored for the right)
  const pts = useMemo(() => {
    const sy = (half + 0.2 * k) / (419 - 150), sz = cloudH / (241 - 60);
    const left = CLOUD.map(([px, py]) => [-(419 - px) * sy * -1 * -1, (241 - py) * sz + H] as [number, number]).map(([y, z]) => [y, z] as [number, number]);
    const right = [...left].reverse().map(([y, z]) => [-y, z] as [number, number]);
    // left half runs top-centre -> bottom-centre with y ≤ 0; mirrored half runs bottom-centre -> top-centre
    return [...left, ...right.slice(1, -1)];
  }, [half, k, H, cloudH]);
  const tex = useMemo(() => canvasTex(1024, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = GATE.cream; c.font = '800 112px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('WELCOME TO', w / 2, h * 0.3); c.fillStyle = GATE.trim; c.font = '800 138px Georgia, serif'; c.fillText('UTSAVPUR', w / 2, h * 0.72);
  }), []);
  return (
    <>
      {[-1, 1].map((s) => (
        <group key={s}>
          <Bx p={[0, s * (half - pillarW / 2), H / 2]} s={[T + 0.8, pillarW, H]} m={m.body} />
          <Bx p={[0, s * (half - pillarW / 2), 0.7]} s={[T + 1.6, pillarW + 0.8, 1.4]} m={m.trim} />
          <Bx p={[0, s * (half - pillarW / 2), H + 0.15]} s={[T + 1.2, pillarW + 0.5, 0.5]} m={m.trim} />
          <Bx p={[0, s * (half - pillarW / 2), H * 0.55]} s={[T + 1.0, pillarW - 0.2, 0.8]} m={m.pink} />
        </group>
      ))}
      <Prism pts={pts} x0={-T / 2} w={T} m={m.body} />
      <mesh position={L(T / 2 + 0.05, 0, H + cloudH * 0.52)} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[half * 1.5 * FTm, half * 0.375 * FTm]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} />
      </mesh>
      <mesh position={L(-T / 2 - 0.05, 0, H + cloudH * 0.52)} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[half * 1.5 * FTm, half * 0.375 * FTm]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} />
      </mesh>
    </>
  );
}

/* ───────────────────────── welcome peacock pillar ───────────────────────── */
function Peacock({ side, s = 1 }: { side: number; s?: number }) {
  const m = useMemo(() => ({
    stone: std('#efe3c8', { roughness: 0.8 }), gold: std('#d9a21b', { roughness: 0.3, metalness: 0.5 }), blue: std('#0f5fae', { roughness: 0.4, metalness: 0.15 }),
    teal: std('#12a39a', { roughness: 0.45 }), green: std('#1f7a4a', { roughness: 0.5 }), navy: std('#0b2f63', { roughness: 0.5 }), beak: std('#e9a21a'),
  }), []);
  const eyes = useMemo(() => Array.from({ length: 9 }, (_, i) => { const a = rad(-72 + i * 18); return [Math.sin(a) * 3.0, 6.9 + Math.cos(a) * 3.0] as [number, number]; }), []);
  return (
    <group scale={[s, s, s]} rotation={[0, rad(side * -14), 0]}>
      {/* plinth */}
      <Bx p={[0, 0, 0.45]} s={[4.6, 4.6, 0.9]} m={m.stone} />
      <Bx p={[0, 0, 1.9]} s={[3.6, 3.6, 2.2]} m={m.stone} />
      <Bx p={[0, 0, 3.1]} s={[4.0, 4.0, 0.35]} m={m.gold} />
      {/* body */}
      <Puff p={[0.3, 0, 5.1]} s={[2.5, 1.6, 2.0]} m={m.blue} r={0.8} />
      <Puff p={[0.9, 0, 6.2]} s={[1.0, 0.9, 2.1]} m={m.blue} r={0.4} />
      <Puff p={[1.25, 0, 7.4]} s={[0.9, 0.7, 0.85]} m={m.navy} r={0.4} />
      <mesh position={L(1.8, 0, 7.4)} rotation={[0, 0, -Math.PI / 2]} material={m.beak}><coneGeometry args={[0.13 * FTm, 0.45 * FTm, 8]} /></mesh>
      {[-0.22, 0, 0.22].map((y, i) => <Cyl key={i} p={[1.1, y, 7.78]} r={0.04} h={0.65 + (i === 1 ? 0.15 : 0)} m={m.gold} />)}
      {/* tail fan behind, in the plan y–z plane */}
      {[[3.4, m.green, 0], [2.7, m.teal, 0.06], [2.0, m.blue, 0.12], [1.25, m.navy, 0.18]].map(([r, mat, dx], i) => (
        <mesh key={i} position={L(-0.9 - (dx as number), 0, 6.9)} rotation={[0, 0, Math.PI / 2]} material={mat as THREE.Material}>
          <cylinderGeometry args={[(r as number) * FTm, (r as number) * FTm, 0.1 * FTm, 36, 1, false, 0, Math.PI]} />
        </mesh>
      ))}
      {eyes.map(([y, z], i) => <mesh key={i} position={L(-1.2, y, z)} rotation={[0, Math.PI / 2, 0]} material={m.gold}><circleGeometry args={[0.2 * FTm, 12]} /></mesh>)}
      {/* legs */}
      {[-0.35, 0.35].map((y) => <Cyl key={y} p={[0.5, y, 3.3]} r={0.06} h={1.2} m={m.gold} />)}
    </group>
  );
}

/* ───────────────────────── wooden entrance art panel (Golden Gate board) ───────────────────────── */
function WoodArt({ w }: { w: number }) {
  const H = 7;
  const tex = useMemo(() => canvasTex(512, 448, (c, W, Hh) => {
    const g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#b0753a'); g.addColorStop(0.5, '#c58a4a'); g.addColorStop(1, '#a96d33');
    c.fillStyle = g; c.fillRect(0, 0, W, Hh);
    c.strokeStyle = 'rgba(70,35,10,.35)'; c.lineWidth = 2; for (let y = 10; y < Hh; y += 18) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y + 4); c.stroke(); }
    c.strokeStyle = '#f5d27a'; c.lineWidth = 8; c.strokeRect(14, 14, W - 28, Hh - 28);
    c.fillStyle = '#f5d27a';
    c.beginPath(); c.moveTo(W * 0.28, Hh * 0.9); c.lineTo(W * 0.28, Hh * 0.42); c.quadraticCurveTo(W * 0.5, Hh * 0.04, W * 0.72, Hh * 0.42); c.lineTo(W * 0.72, Hh * 0.9); c.lineTo(W * 0.64, Hh * 0.9);
    c.lineTo(W * 0.64, Hh * 0.46); c.quadraticCurveTo(W * 0.5, Hh * 0.18, W * 0.36, Hh * 0.46); c.lineTo(W * 0.36, Hh * 0.9); c.closePath(); c.fill();
    c.font = '700 40px Georgia, serif'; c.textAlign = 'center'; c.fillText('DIWALI EXHIBITION', W / 2, Hh * 0.12);
  }), []);
  const wood = useMemo(() => std('#8f5a28', { roughness: 0.8 }), []);
  const stone = useMemo(() => std('#cfc3a8', { roughness: 0.9 }), []);
  return (
    <>
      <Bx p={[0, 0, 0.3]} s={[2.6, w + 1.2, 0.6]} m={stone} />
      <Bx p={[0, 0, 0.6 + H / 2]} s={[0.5, w, H]} m={wood} />
      <mesh position={L(0.3, 0, 0.6 + H / 2)} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[w * FTm, H * FTm]} /><meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </>
  );
}

/* ───────────────────────── wall-wash light row (4 lights) ───────────────────────── */
function WashRow({ len, color }: { len: number; color: string }) {
  const n = 4, WALL = 4.1, Hh = 22;
  const body = useMemo(() => std('#2a2e36', { roughness: 0.5, metalness: 0.4 }), []);
  const lens = useMemo(() => new THREE.MeshBasicMaterial({ color, toneMapped: false }), [color]);
  const xs = Array.from({ length: n }, (_, i) => -len / 2 + (len * (i + 0.5)) / n);
  const tex = useMemo(() => canvasTex(512, 256, (c, W, Hh2) => {
    c.clearRect(0, 0, W, Hh2);
    for (let i = 0; i < n; i++) {
      const cx = ((i + 0.5) / n) * W, gr = c.createRadialGradient(cx, Hh2, 4, cx, Hh2, Hh2 * 0.95);
      gr.addColorStop(0, color + 'ee'); gr.addColorStop(0.45, color + '66'); gr.addColorStop(1, color + '00');
      c.fillStyle = gr; c.fillRect(cx - W / n, 0, (2 * W) / n, Hh2);
    }
  }), [color]);
  return (
    <>
      {xs.map((x, i) => (
        <group key={i}>
          <Cyl p={[x, 0, 0]} r={0.7} h={0.4} m={body} />
          <Cyl p={[x, 0, 0.4]} r={0.45} h={0.8} m={body} />
          <Cyl p={[x, 0, 1.2]} r={0.4} h={0.12} m={lens as unknown as THREE.Material} />
        </group>
      ))}
      <mesh position={L(0, WALL, Hh / 2)}>
        <planeGeometry args={[len * FTm, Hh * FTm]} />
        <meshBasicMaterial map={tex} transparent depthWrite={false} side={THREE.DoubleSide} toneMapped={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </>
  );
}

/* ───────────────────────── white barricade run ───────────────────────── */
const _bar = std('#f2f2f2', { roughness: 0.5 });
function BarrierRun({ len }: { len: number }) {
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const box = (x: number, z: number, sx: number, sy: number, sz: number) => { const b = new THREE.BoxGeometry(sx * FTm, sz * FTm, sy * FTm); b.translate(x * FTm, z * FTm, 0); parts.push(b); };
    const n = Math.max(2, Math.round(len / 8) + 1);
    for (let i = 0; i < n; i++) box(-len / 2 + (i * len) / (n - 1), 1.75, 0.3, 0.3, 3.5);
    box(0, 3.3, len, 0.22, 0.28); box(0, 2.1, len, 0.22, 0.28); box(0, 0.9, len, 0.22, 0.28);
    return mergeGeometries(parts)!;
  }, [len]);
  return <mesh geometry={geo} material={_bar} position={L(0, 0, 0)} />;
}

export type { ExItem };
