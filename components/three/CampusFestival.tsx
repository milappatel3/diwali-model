'use client';
// Festival set-pieces: the 10 KDC festival booths, the carnival gate ("Welcome to Utsavpur") and the Mandir Hall annakut layout.
// Everything is built in local PLAN coordinates (feet: x forward/east, y left/north, z up) inside a group that is moved + yawed.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useCE, type Booth, type CarnivalGate, type Annakut, type Display } from '@/lib/campusEdits';
import { FTm } from './materials';
import { std, canvasTex, Inst, NearHtml } from './CampusModel';
import { swag } from './campusGeo';

export type V3 = [number, number, number];
/** local plan feet -> three metres */
export const L = (x: number, y: number, z: number): V3 => [x * FTm, z * FTm, -y * FTm];
export const rad = (d: number) => (d * Math.PI) / 180;

export function Bx({ p, s, m, yaw = 0 }: { p: V3; s: V3; m: THREE.Material; yaw?: number }) {
  return (
    <mesh position={L(...p)} rotation={[0, rad(yaw), 0]} material={m}>
      <boxGeometry args={[s[0] * FTm, s[2] * FTm, s[1] * FTm]} />
    </mesh>
  );
}
export function Cyl({ p, r, h, m, r2 }: { p: V3; r: number; h: number; m: THREE.Material; r2?: number }) {
  return (
    <mesh position={L(p[0], p[1], p[2] + h / 2)} material={m}>
      <cylinderGeometry args={[(r2 ?? r) * FTm, r * FTm, h * FTm, 14]} />
    </mesh>
  );
}
export const place = (x: number, y: number, yaw: number): { position: V3; rotation: V3 } => ({ position: L(x, y, 0), rotation: [0, rad(yaw), 0] });

export function Bunting({ pts, colors, ang }: { pts: V3[]; colors: string[]; ang: number }) {
  const g = useMemo(() => {
    const t = new THREE.BufferGeometry();
    t.setAttribute('position', new THREE.Float32BufferAttribute([-0.55, 0, 0, 0.55, 0, 0, 0, -1.3, 0].map((v) => v * FTm), 3));
    t.computeVertexNormals();
    return t;
  }, []);
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide, roughness: 0.8 }), []);
  return <Inst geo={g} mat={m} n={pts.length} colored deps={[pts, ang]} fill={(i, d, c) => { d.position.set(...L(...pts[i])); d.rotation.y = rad(ang); c.set(colors[i % colors.length]); }} />;
}
export function Beads({ pts, color, r = 0.28, glow = 0 }: { pts: V3[]; color: string | string[]; r?: number; glow?: number }) {
  const g = useMemo(() => new THREE.SphereGeometry(r * FTm, 7, 5), [r]);
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, emissive: new THREE.Color(glow ? '#ffc766' : '#000000'), emissiveIntensity: glow }), [glow]);
  const cols = Array.isArray(color) ? color : [color];
  return <Inst geo={g} mat={m} n={pts.length} colored deps={[pts, color]} fill={(i, d, c) => { d.position.set(...L(...pts[i])); c.set(cols[i % cols.length]); }} />;
}

/* ───────────────────────── festival booth (16 × 16 ft) ───────────────────────── */
export function KdcBooths() {
  const booths = useCE((s) => s.e.booths);
  return <>{booths.map((b, i) => <BoothModel key={b.id} b={b} n={i + 1} />)}</>;
}

function BoothModel({ b, n }: { b: Booth; n: number }) {
  const M = useMemo(() => ({
    steel: std('#262c33', { metalness: 0.5, roughness: 0.5 }), accent: std(b.color), gold: std('#d4a63a', { metalness: 0.7, roughness: 0.35 }),
    cloth: std('#e9a45a'), clothD: std('#cc8636'), top: std('#f3ead6'), bead: std('#f4c542'), pad: std('#9a9ea4'),
    spool: std('#2a8a9a'), leg: std('#3a3f46'),
  }), [b.color]);
  const poster = useMemo(() => canvasTex(1024, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#fbf6ea'); gr.addColorStop(1, '#f1e2c4');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = b.color; g.globalAlpha = 0.16; g.fillRect(0, h * 0.72, w, h * 0.28); g.globalAlpha = 1;
    g.fillStyle = '#2b2b33'; g.textBaseline = 'alphabetic';
    g.font = '600 64px Georgia, serif'; g.fillText(b.title.charAt(0) + b.title.slice(1).toLowerCase(), 70, 150);
    g.font = '500 28px Georgia, serif'; g.fillStyle = '#6a5d4a'; g.fillText(b.sub, 70, 200);
    g.fillStyle = b.color; g.fillRect(70, 226, 120, 6);
    g.fillStyle = '#2b2b33'; g.font = '500 40px Georgia, serif';
    g.fillText('Add the story and the ask for this', 70, 300); g.fillText('festival here.', 70, 350);
    g.fillStyle = '#7b6f5e'; g.font = '500 26px Georgia, serif'; g.fillText('Utsavpur · Diwali Exhibition 2026', 70, 430);
  }), [b.title, b.sub, b.color]);
  const sign = useMemo(() => canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = b.color; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#e9d9a8'; g.lineWidth = 3; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#f6efd8'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = 54; g.font = `600 ${fs}px Georgia, serif`;
    while (g.measureText(b.title).width > w - 40 && fs > 18) { fs -= 2; g.font = `600 ${fs}px Georgia, serif`; }
    g.fillText(b.title, w / 2, h / 2 + 3);
  }), [b.title, b.color]);

  const flags = useMemo(() => {
    const out: V3[] = [];
    const a: V3 = [-8, -8, 10], c: V3 = [-8, 8, 10], d: V3 = [8, 8, 10], e: V3 = [8, -8, 10];
    for (const [p, q] of [[a, e], [c, d], [a, c]] as [V3, V3][]) out.push(...swag(p, q, 0.9, 10));
    return out;
  }, []);
  const lights = useMemo(() => swag([-8, 0, 10], [8, 0, 10], 1.2, 12), []);

  const tableTop = (x: number, y: number, len = 6, wid = 2.5, valance: 'x' | 'y' = 'y') => (
    <group key={`${x}_${y}`}>
      <Bx p={[x, y, 2.6]} s={[len, wid, 0.18]} m={M.top} />
      <Bx p={[x, y, 1.7]} s={[len - 0.2, wid - 0.2, 1.8]} m={M.cloth} />
      <Bx p={[x, y + (valance === 'y' ? wid / 2 : 0) - 0.05, 1.5]} s={[len - 0.1, 0.1, 2.2]} m={M.clothD} />
      <Bx p={[x, y - wid / 2 + 0.05, 1.5]} s={[len - 0.1, 0.1, 2.2]} m={M.clothD} />
    </group>
  );

  return (
    <group {...place(b.x, b.y, b.yaw)}>
      {/* frame */}
      {[[-8, -8], [8, -8], [-8, 8], [8, 8]].map(([x, y], i) => (
        <group key={i}><Bx p={[x, y, 5]} s={[0.35, 0.35, 10]} m={M.steel} /><Bx p={[x, y, 0.25]} s={[1.3, 1.3, 0.5]} m={M.pad} /></group>
      ))}
      <Bx p={[-8, 0, 10]} s={[0.3, 16, 0.3]} m={M.steel} /><Bx p={[8, 0, 10]} s={[0.3, 16, 0.3]} m={M.steel} />
      <Bx p={[0, -8, 10]} s={[16, 0.3, 0.3]} m={M.steel} /><Bx p={[0, 8, 10]} s={[16, 0.3, 0.3]} m={M.steel} />
      {/* back poster, 8 ft tall, 16 ft wide */}
      <mesh position={L(-7.75, 0, 4.2)} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[15.6 * FTm, 8 * FTm]} />
        <meshBasicMaterial map={poster} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <Bx p={[-7.95, 0, 4.2]} s={[0.25, 15.8, 8.2]} m={M.steel} />
      {/* craft table at the back + four work tables */}
      {tableTop(-6, 0, 2.2, 6.5, 'x')}
      {[-5.2, 5.2].flatMap((y) => [-2.2, 3].map((x) => tableTop(x, y)))}
      {/* spools on the craft table */}
      {[-2.2, -0.7, 0.8, 2.2].map((y, i) => <Cyl key={i} p={[-6, y, 2.7]} r={0.32} h={0.5} m={i % 2 ? M.gold : M.spool} />)}
      {/* 8 ft gate at the front */}
      {[-4.4, 4.4].map((y) => (
        <group key={y}>
          <Bx p={[8.6, y, 3.2]} s={[1, 1.3, 6.4]} m={M.accent} />
          <Bx p={[8.6, y, 0.2]} s={[1.3, 1.6, 0.4]} m={M.gold} />
          {[0.8, 2, 3.2, 4.4, 5.6].map((z) => <Bx key={z} p={[9.15, y + 0.3, z]} s={[0.2, 0.28, 0.28]} m={M.bead} />)}
        </group>
      ))}
      <Bx p={[8.6, 0, 7.2]} s={[0.9, 11.4, 1.6]} m={M.accent} />
      <mesh position={L(9.08, 0, 7.2)} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[10.8 * FTm, 1.35 * FTm]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
      <Bx p={[8.6, 0, 8.1]} s={[1.2, 11.8, 0.18]} m={M.gold} />
      {/* kite and bunting */}
      <mesh position={L(0, 0, 8.6)} rotation={[0, Math.PI / 2, Math.PI / 4]}>
        <planeGeometry args={[2.4 * FTm, 2.4 * FTm]} />
        <meshStandardMaterial color={b.color} side={THREE.DoubleSide} roughness={0.7} />
      </mesh>
      <Bunting pts={flags} colors={[b.color, '#f2b632', '#e8620a', '#f4efe0', '#2a8a9a']} ang={0} />
      <Beads pts={lights} color="#fff0c8" r={0.16} glow={0.5} />
      <NearHtml pos={L(0, 0, 12.5)} max={170}>
        <div className="label3d sec" style={{ background: b.color, color: '#fff', borderColor: '#fff' }}>{n}. {b.title}</div>
      </NearHtml>
    </group>
  );
}

/* ───────────────────────── carnival gate: "Welcome to Utsavpur" ───────────────────────── */
export function CarnivalGates() {
  const list = useCE((s) => s.e.carnival);
  return <>{list.filter((g) => g.style !== 'utsavpur').map((g) => (g.style === 'towers' ? <GateModel key={g.id} g={g} /> : <ArchGate key={g.id} g={g} />))}</>;
}

/** crescent moon (outer radius R, inner cut-out radius r offset d to +x), extruded `depth` */
function crescentGeo(R: number, r: number, d: number, depth: number) {
  const xi = (d * d + R * R - r * r) / (2 * d), yi = Math.sqrt(R * R - xi * xi);
  const a = Math.atan2(yi, xi), N = 28;
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= N; i++) { const t = a + ((2 * Math.PI - 2 * a) * i) / N; pts.push(new THREE.Vector2(R * Math.cos(t), R * Math.sin(t))); }
  const pu = Math.atan2(yi, xi - d), pl = Math.atan2(-yi, xi - d);
  for (let i = 1; i < N; i++) { const t = pl + (pu - 2 * Math.PI - pl) * (i / N); pts.push(new THREE.Vector2(d + r * Math.cos(t), r * Math.sin(t))); }
  return new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth, bevelEnabled: false });
}
/** lotus-scalloped band, flat bottom, round petals on top; x = across the gate */
function scallopBand(W: number, body: number, petals: number, depth: number) {
  const s = new THREE.Shape();
  const pw = W / petals;
  s.moveTo(-W / 2, 0); s.lineTo(W / 2, 0); s.lineTo(W / 2, body);
  for (let i = petals - 1; i >= 0; i--) s.absarc(-W / 2 + (i + 0.5) * pw, body, pw / 2, 0, Math.PI, false);
  s.lineTo(-W / 2, 0);
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 10 });
}

/** side-entrance gate: two crescent pillars and a scalloped pink arch (no horizontal truss) */
function ArchGate({ g }: { g: CarnivalGate }) {
  const half = g.w / 2, py = half - 4; // pole offset from centre
  const span = py * 2;
  const M = useMemo(() => ({
    pole: std('#2a2e35', { metalness: 0.5, roughness: 0.45 }), teal: std('#17a3a8', { roughness: 0.6, side: THREE.DoubleSide }), yellow: std('#f2c230', { roughness: 0.6, side: THREE.DoubleSide }), pink: std('#e0407f'),
    mag: std('#a81c63'), gold: std('#e0a92c', { metalness: 0.65, roughness: 0.35 }), orange: std('#f28c0f'), cream: std('#f6efd8'),
  }), []);
  const cres = useMemo(() => ({ a: crescentGeo(4.4, 3.7, 2.1, 0.5), b: crescentGeo(5.1, 3.5, 2.5, 0.5) }), []);
  const petals = Math.max(5, Math.round(span / 1.9));
  const band = useMemo(() => ({ a: scallopBand(span + 1.2, 2.6, petals, 0.5), b: scallopBand((span + 1.2) * 0.9, 1.9, petals - 1, 0.5) }), [span, petals]);
  const sign = useMemo(() => canvasTex(512, 96, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#7a1448'; c.beginPath(); c.roundRect(4, 4, w - 8, h - 8, 18); c.fill();
    c.strokeStyle = '#f0c14a'; c.lineWidth = 3; c.stroke();
    c.fillStyle = '#f7c548'; c.textAlign = 'center'; c.textBaseline = 'middle';
    let fs = 50; c.font = `700 ${fs}px Georgia, serif`;
    while (c.measureText(g.title).width > w - 50 && fs > 16) { fs -= 2; c.font = `700 ${fs}px Georgia, serif`; }
    c.fillText(g.title, w / 2, h / 2 + 3);
  }), [g.title]);
  const dots = useMemo(() => Array.from({ length: petals + 1 }, (_, i): V3 => [0.5, -(span + 1.2) / 2 + (i * (span + 1.2)) / petals, 15.6 + 2.6]), [span, petals]);
  const garland = useMemo(() => swag([0.8, -py, 15.2], [0.8, py, 15.2], 2.2, 22), [py]);
  return (
    <group {...place(g.x, g.y, g.yaw)}>
      {[-1, 1].map((sd) => (
        <group key={sd}>
          <Cyl p={[0, sd * py, 0]} r={0.4} h={19} m={M.pole} />
          <Bx p={[0, sd * py, 0.7]} s={[2.4, 2.4, 1.4]} m={M.gold} />
          <mesh position={L(0, sd * py, 19.6)} material={M.gold}><sphereGeometry args={[0.75 * FTm, 12, 8]} /></mesh>
          <mesh position={L(0, sd * py, 21.2)} material={M.gold}><coneGeometry args={[0.35 * FTm, 2.2 * FTm, 8]} /></mesh>
          {/* crescents bulge outward and cradle inward; teal face over a yellow rim */}
          <mesh geometry={cres.b} position={L(-0.3, sd * py, 8.4)} rotation={[0, Math.PI / 2, 0]} scale={[-sd * FTm, 1.55 * FTm, FTm]} material={M.yellow} />
          <mesh geometry={cres.a} position={L(0.2, sd * py, 8.4)} rotation={[0, Math.PI / 2, 0]} scale={[-sd * FTm, 1.55 * FTm, FTm]} material={M.teal} />
          <Beads pts={Array.from({ length: 9 }, (_, k): V3 => [0.9, sd * (py + 0.2), 14 - k * 1.2])} color={['#f28c0f', '#ffc94a']} r={0.32} />
        </group>
      ))}
      {/* scalloped arch across the top */}
      <mesh geometry={band.a} position={L(0, 0, 15.6)} rotation={[0, Math.PI / 2, 0]} scale={FTm} material={M.mag} />
      <mesh geometry={band.b} position={L(0.4, 0, 16.1)} rotation={[0, Math.PI / 2, 0]} scale={FTm} material={M.pink} />
      <Beads pts={dots} color="#f4c542" r={0.3} />
      <Bx p={[0.55, 0, 21.4]} s={[0.3, 1.5, 1.5]} m={M.gold} yaw={0} />
      <mesh position={L(0.95, 0, 16.9)} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[Math.min(span * 0.72, 14) * FTm, 2.2 * FTm]} />
        <meshBasicMaterial map={sign} transparent toneMapped={false} />
      </mesh>
      <Beads pts={garland} color={['#f28c0f', '#ffb81c', '#e8620a', '#ffc94a']} r={0.4} />
      <NearHtml pos={L(0, 0, 25)} max={240}><div className="label3d sec" style={{ background: '#a81c63', color: '#fff', borderColor: '#fff' }}>{g.title}</div></NearHtml>
    </group>
  );
}

function figureTex(girl: boolean) {
  return canvasTex(256, 600, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    // arched purple niche with a gold border
    const arch = (inset: number, fill: string) => {
      c.beginPath(); c.moveTo(inset, h - inset); c.lineTo(inset, w / 2 + inset); c.arc(w / 2, w / 2 + 6, w / 2 - inset, Math.PI, 0); c.lineTo(w - inset, h - inset); c.closePath();
      c.fillStyle = fill; c.fill();
    };
    arch(6, '#e8b84a'); arch(20, girl ? '#7a2f90' : '#6b2f8a');
    // diya
    c.fillStyle = '#f7a21b'; c.beginPath(); c.ellipse(w / 2, 100, 10, 18, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e8b84a'; c.beginPath(); c.ellipse(w / 2, 130, 26, 9, 0, 0, Math.PI); c.fill();
    // figure
    const cx = w / 2, skin = '#d9a06b';
    c.fillStyle = girl ? '#3a2418' : '#2a1a12'; c.beginPath(); c.arc(cx, 235, 46, 0, Math.PI * 2); c.fill();
    c.fillStyle = skin; c.beginPath(); c.arc(cx, 245, 38, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#2a1a12'; c.beginPath(); c.arc(cx - 13, 242, 4, 0, 7); c.arc(cx + 13, 242, 4, 0, 7); c.fill();
    c.strokeStyle = '#7a2a1a'; c.lineWidth = 3; c.beginPath(); c.arc(cx, 256, 12, 0.2, Math.PI - 0.2); c.stroke();
    c.fillStyle = girl ? '#d6246f' : '#2aa39a';
    c.beginPath(); c.moveTo(cx - 52, 440); c.lineTo(cx - 34, 290); c.lineTo(cx + 34, 290); c.lineTo(cx + 52, 440); c.closePath(); c.fill();
    c.fillStyle = girl ? '#e8b84a' : '#f4efe0'; c.fillRect(cx - 60, 440, 120, girl ? 60 : 90);
    if (girl) { c.fillStyle = '#d6246f'; c.fillRect(cx - 60, 440, 120, 30); }
    c.fillStyle = skin; c.fillRect(cx - 74, 310, 20, 70); c.fillRect(cx + 54, 310, 20, 70);
  });
}
function scallopTex(title: string) {
  return canvasTex(1024, 480, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const path = () => {
      g.beginPath(); g.moveTo(10, h - 10);
      g.lineTo(10, 150);
      g.quadraticCurveTo(10, 90, 90, 90);
      g.bezierCurveTo(150, 90, 200, 60, 260, 30);
      g.bezierCurveTo(330, 0, 400, 14, w / 2, 14);
      g.bezierCurveTo(w - 400, 14, w - 330, 0, w - 260, 30);
      g.bezierCurveTo(w - 200, 60, w - 150, 90, w - 90, 90);
      g.quadraticCurveTo(w - 10, 90, w - 10, 150);
      g.lineTo(w - 10, h - 10); g.closePath();
    };
    path(); g.fillStyle = '#1f9aa6'; g.fill();
    g.save(); g.translate(w / 2, h / 2); g.scale(0.95, 0.9); g.translate(-w / 2, -h / 2); path(); g.fillStyle = '#b3226e'; g.fill(); g.restore();
    g.fillStyle = '#f4b73a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const [a, ...rest] = title.split(' ');
    const last = rest.pop() || '';
    const small = [a, ...rest].join(' ');
    g.font = '700 70px Georgia, serif'; g.fillText(small, w / 2, 170);
    let fs = 190; g.font = `800 ${fs}px Georgia, serif`;
    while (g.measureText(last).width > w - 120 && fs > 60) { fs -= 6; g.font = `800 ${fs}px Georgia, serif`; }
    g.fillStyle = '#f7b733'; g.fillText(last, w / 2, 310);
    g.fillStyle = '#e8d08a'; g.beginPath(); g.arc(w / 2, 62, 10, 0, 7); g.fill();
  });
}

function GateModel({ g }: { g: CarnivalGate }) {
  const half = 20; // designed 40 ft wide, then scaled to g.w
  const ty = half - 5; // tower centre offset
  const sc = g.w / 40;
  const M = useMemo(() => ({
    pink: std('#c2255f'), teal: std('#1d9aa5'), gold: std('#e0a92c', { metalness: 0.65, roughness: 0.35 }), purple: std('#7a2f90'),
    sign: std('#b3226e'), marigold: std('#f28c0f'), carpet: std('#e8b84a'), blue: std('#3a7bd5'), green: std('#2fae5a'), red: std('#d63a3a'),
    orange: std('#f0842a'), clay: std('#c0552b'), pole: std('#444a52', { metalness: 0.5 }), dhol: std('#c98a4a'), skin: std('#f2d9b3'),
    cream: std('#f6efd8'), leaf: std('#2f9a6a'),
  }), []);
  const boyTex = useMemo(() => figureTex(false), []);
  const girlTex = useMemo(() => figureTex(true), []);
  const sign = useMemo(() => scallopTex(g.title), [g.title]);
  const garlands = useMemo(() => {
    const a: V3[] = [];
    const y0 = -(half - 9.5), y1 = half - 9.5;
    a.push(...swag([-0, y0, 21], [0, y1, 21], 3.2, 26).map((p): V3 => [p[0] + 0.6, p[1], p[2]]));
    a.push(...swag([0, y0, 19.5], [0, y1, 19.5], 3.8, 26).map((p): V3 => [p[0] + 0.6, p[1], p[2]]));
    for (const s of [-1, 1]) for (let k = 0; k < 14; k++) a.push([4, s * (ty - 4.4), 24 - k * 1.5]);
    return a;
  }, [half, ty]);
  const bunt = useMemo(() => {
    const out: V3[] = [];
    out.push(...swag([0.8, -(half - 9.5), 23.5], [0.8, half - 9.5, 23.5], 2.2, 22));
    return out;
  }, [half]);
  const strings = useMemo(() => {
    const out: V3[] = [];
    for (const s of [-1, 1]) {
      out.push(...swag([0, s * ty, 31], [34, s * 20, 15], 3, 18));
      out.push(...swag([0, s * ty, 31], [-26, s * 20, 15], 3, 14));
    }
    out.push(...swag([34, -20, 15], [34, 20, 15], 3, 16));
    out.push(...swag([66, -20, 15], [66, 20, 15], 3, 16));
    for (const s of [-1, 1]) out.push(...swag([34, s * 20, 15], [66, s * 20, 15], 2.4, 12));
    return out;
  }, [ty]);
  const flagsB = useMemo(() => swag([34, -20, 14.5], [34, 20, 14.5], 3, 16), []);
  const cols = ['#3a7bd5', '#2fae5a', '#d63a3a', '#f0842a', '#7a2f90'];
  const lane = useMemo(() => {
    const out: { x: number; y: number; c: string }[] = [];
    for (let i = 0; i < 8; i++) for (const s of [-1, 1]) out.push({ x: 7 + i * 8, y: s * 9.5, c: cols[(i + (s > 0 ? 2 : 0)) % cols.length] });
    return out;
  }, []);
  const feathers = useMemo(() => canvasTex(128, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#1f9a6a'; c.beginPath(); c.ellipse(w / 2, h / 2, w / 2 - 6, h / 2 - 6, 0, 0, 7); c.fill();
    c.fillStyle = '#2a6fd0'; c.beginPath(); c.ellipse(w / 2, h * 0.38, 26, 36, 0, 0, 7); c.fill();
    c.fillStyle = '#f2c230'; c.beginPath(); c.ellipse(w / 2, h * 0.38, 12, 18, 0, 0, 7); c.fill();
    c.fillStyle = '#1a3a7a'; c.beginPath(); c.ellipse(w / 2, h * 0.38, 5, 8, 0, 0, 7); c.fill();
  }), []);

  const tower = (s: -1 | 1) => (
    <group key={s}>
      {/* body */}
      <mesh position={L(0, s * ty, 12)} material={M.pink}><boxGeometry args={[7 * FTm, 24 * FTm, 9 * FTm]} /></mesh>
      <Bx p={[0, s * ty, 0.5]} s={[8, 10, 1]} m={M.gold} />
      <Bx p={[0, s * ty, 24.2]} s={[8, 10, 0.5]} m={M.gold} />
      {/* niche with the child figure */}
      <mesh position={L(3.56, s * ty, 11)} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[6.4 * FTm, 15 * FTm]} />
        <meshBasicMaterial map={s < 0 ? boyTex : girlTex} transparent toneMapped={false} />
      </mesh>
      {/* teal upper stage with three arched windows */}
      <Bx p={[0, s * ty, 27.7]} s={[6.4, 8.4, 6.6]} m={M.teal} />
      {[-2.4, 0, 2.4].map((o) => (
        <group key={o}>
          <Bx p={[3.25, s * ty + o, 27.4]} s={[0.2, 1.5, 3.2]} m={M.cream} />
          <mesh position={L(3.25, s * ty + o, 29)} rotation={[Math.PI / 2, 0, 0]} material={M.cream}><cylinderGeometry args={[0.75 * FTm, 0.75 * FTm, 0.2 * FTm, 12, 1, false, 0, Math.PI]} /></mesh>
        </group>
      ))}
      <Bx p={[0, s * ty, 31.2]} s={[7.2, 9.2, 0.5]} m={M.gold} />
      {/* golden onion dome + spire */}
      <mesh position={L(0, s * ty, 33.2)} scale={[1, 1.25, 1]} material={M.gold}><sphereGeometry args={[3.4 * FTm, 18, 12]} /></mesh>
      <mesh position={L(0, s * ty, 38.4)} material={M.gold}><coneGeometry args={[0.8 * FTm, 3.4 * FTm, 10]} /></mesh>
      {/* kites on the outer side */}
      {[[20, '#f2b632'], [26, '#2a8a9a']].map(([z, c]) => (
        <mesh key={String(z)} position={L(1.2, s * (ty + 6.2), z as number)} rotation={[0, Math.PI / 2, Math.PI / 4]}>
          <planeGeometry args={[3.6 * FTm, 3.6 * FTm]} /><meshStandardMaterial color={c as string} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* diya bowl, flame, peacock feathers */}
      <mesh position={L(4.6, s * (ty - 2.2), 1.8)} material={M.blue}><sphereGeometry args={[2 * FTm, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /></mesh>
      <mesh position={L(4.6, s * (ty - 2.2), 3.6)} material={M.marigold}><coneGeometry args={[0.7 * FTm, 2.4 * FTm, 8]} /></mesh>
      <mesh position={L(3.8, s * (ty + 3.6), 5)} rotation={[0, Math.PI / 2, s * 0.15]}><planeGeometry args={[2.6 * FTm, 7 * FTm]} /><meshBasicMaterial map={feathers} transparent toneMapped={false} side={THREE.DoubleSide} /></mesh>
    </group>
  );

  return (
    <group {...place(g.x, g.y, g.yaw)} scale={[sc, sc, sc]}>
      {tower(-1)}{tower(1)}
      {/* scalloped welcome sign + backing */}
      <mesh position={L(0.05, 0, 23.5)} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[22 * FTm, 11 * FTm]} />
        <meshBasicMaterial map={sign} transparent alphaTest={0.4} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <Bx p={[-0.3, 0, 16]} s={[0.8, 23, 1.2]} m={M.sign} />
      <Beads pts={garlands} color={['#f28c0f', '#ffb81c', '#e8620a', '#ffc94a']} r={0.4} />
      <Bunting pts={bunt} colors={['#e8620a', '#2a8a9a', '#f2b632', '#d6246f', '#2fae5a']} ang={90} />
      {/* dhol */}
      <mesh position={L(3, ty - 3.4 > 0 ? -(ty - 3.6) : 0, 2)} rotation={[Math.PI / 2, 0, 0]} material={M.dhol}><cylinderGeometry args={[1.5 * FTm, 1.5 * FTm, 3.4 * FTm, 16]} /></mesh>
      <NearHtml pos={L(0, 0, 41)} max={260}><div className="label3d sec" style={{ background: '#b3226e', color: '#fff', borderColor: '#fff' }}>{g.title}</div></NearHtml>
    </group>
  );
}

/* ───────────────────────── Mandir Hall annakut layout ───────────────────────── */
const SWEETS = ['#f2b632', '#e8620a', '#d6246f', '#2fae5a', '#f4efe0', '#a8431e', '#7a2f90', '#ffcf40', '#e04848', '#3a9bd0'];
const RAINBOW = ['#d6246f', '#e8620a', '#f2c230', '#2fae5a', '#2a8ad0', '#7a2f90', '#d6246f', '#e8620a'];
function srand(seed: number) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

export function AnnakutLayouts() {
  const list = useCE((s) => s.e.annakut);
  return <>{list.map((a) => <AnnakutModel key={a.id} a={a} />)}</>;
}

function AnnakutModel({ a }: { a: Annakut }) {
  const { w, d } = a;
  const rd = Math.min(2.2, (d * 0.3) / 7); // depth of each white riser
  const pitch = w * 0.19, br = pitch * 0.43; // shrine bay spacing / arch radius
  const SZ = 3.05; // shrine floor height (it stands on its own platform behind the display)
  const dz = SZ - 7.95;
  const M = useMemo(() => ({
    navy: std('#1b2250'), white: std('#f4f1ea'), purple: std('#6a4a80'), gold: std('#d4a63a', { metalness: 0.7, roughness: 0.3 }), red: std('#b3262e'),
    marble: std('#f4efe6', { roughness: 0.4 }), pink: std('#e86aa0'), back: std('#142048'), cream: std('#ece3d2'), drape: std('#f0ece4'), maroon: std('#7d1d24'),
    marigold: std('#f28c0f'),
  }), []);
  const base = useMemo(() => {
    const s = new THREE.Shape([[-w / 2, d / 2], [w / 2, d / 2], [w / 2, d * 0.05], [w * 0.3, -d / 2], [-w * 0.3, -d / 2], [-w / 2, d * 0.05]].map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.8, bevelEnabled: false });
    // plan (x,y,z) -> three (x, z, -y)
    g.applyMatrix4(new THREE.Matrix4().set(FTm, 0, 0, 0, 0, 0, FTm, 0, 0, -FTm, 0, 0, 0, 0, 0, 1));
    return g;
  }, [w, d]);
  const pts = useMemo(() => {
    const r = srand(5);
    const P: [number, number][] = [[-w * 0.3, -d / 2], [w * 0.3, -d / 2], [w / 2, d * 0.05], [w / 2, d / 2], [-w / 2, d / 2], [-w / 2, d * 0.05]];
    const edges: [number, number, number, number][] = [[P[0][0], P[0][1], P[1][0], P[1][1]], [P[1][0], P[1][1], P[2][0], P[2][1]], [P[2][0], P[2][1], P[3][0] , P[3][1] - 0.3 * d], [P[0][0], P[0][1], P[5][0], P[5][1]], [P[5][0], P[5][1], P[4][0], P[4][1] - 0.3 * d]];
    const cubes: { x: number; y: number; s: number; ang: number; c: string }[] = [];
    const cx = 0, cy = 0;
    for (const [x0, y0, x1, y1] of edges) {
      const L2 = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(L2 / 2.7);
      const ang = Math.atan2(y1 - y0, x1 - x0);
      for (let i = 0; i <= n; i++) {
        const t = n ? i / n : 0.5;
        const mx = x0 + (x1 - x0) * t, my = y0 + (y1 - y0) * t;
        const dx = cx - mx, dy = cy - my, dl = Math.hypot(dx, dy) || 1;
        cubes.push({ x: mx + (dx / dl) * 1.3, y: my + (dy / dl) * 1.3, s: 1.2, ang, c: SWEETS[Math.floor(r() * SWEETS.length)] });
        if ((y0 !== y1) && (x0 !== x1) && i % 2 === 0) cubes.push({ x: mx + (dx / dl) * 4.4, y: my + (dy / dl) * 4.4, s: 2.1, ang, c: SWEETS[Math.floor(r() * SWEETS.length)] });
      }
    }
    // offerings on the stepped risers
    const tiers: { x: number; y: number; z: number; c: string }[] = [];
    for (let k = 1; k < 7; k++) {
      const y = d / 2 - rd * (k + 0.5), z = 0.8 + (7 - k) + 0.3;
      for (let x = -w * 0.34; x <= w * 0.34; x += 2.1) tiers.push({ x, y, z, c: SWEETS[Math.floor(r() * SWEETS.length)] });
    }
    return { cubes, tiers };
  }, [w, d, rd]);
  const cubeG = useMemo(() => new THREE.BoxGeometry(1 * FTm, 1.1 * FTm, 1 * FTm), []);
  const bowlG = useMemo(() => new THREE.CylinderGeometry(0.62 * FTm, 0.5 * FTm, 0.55 * FTm, 10), []);
  const figG = useMemo(() => new THREE.ConeGeometry(0.9 * FTm, 2.7 * FTm, 10).translate(0, 1.35 * FTm, 0), []);
  const headG = useMemo(() => new THREE.SphereGeometry(0.52 * FTm, 10, 8).translate(0, 3.1 * FTm, 0), []);
  const matC = useMemo(() => std('#ffffff'), []);
  const matBowl = useMemo(() => std('#ffffff', { roughness: 0.6 }), []);

  const bays = useMemo(() => [-2, -1, 0, 1, 2].map((i) => ({ x: i * pitch, key: i })), [pitch]);
  const fig: { x: number; y: number; c: string }[] = [];
  bays.forEach((b, bi) => [-1.6, 1.6].forEach((o, oi) => fig.push({ x: b.x + o * (pitch / 7.4), y: d / 2 + 3, c: ['#b3262e', '#e8a417', '#1f3c88', '#2a8a5a', '#d4529a'][(bi * 2 + oi) % 5] })));

  const cones = [[-0.44, 0.12], [0.44, 0.12], [-0.44, -0.12], [0.44, -0.12]].map(([fx, fy]) => ({ x: fx * w, y: fy * d }));
  const hang = [-0.42, -0.25, -0.08, 0.08, 0.25, 0.42].map((f) => f * w);
  const strands = useMemo(() => hang.flatMap((x) => Array.from({ length: 9 }, (_, k): V3 => [x, d / 2 - 6, 20 - k * 0.8])), [hang, d]);
  const cake = [[3, '#f4b6c8'], [2.4, '#f2d36a'], [1.8, '#9fd6c0'], [1.2, '#c9a2e0']] as [number, string][];

  return (
    <group {...place(a.x, a.y, a.yaw)}>
      <mesh geometry={base} position={[0, 0.1 * FTm, 0]} material={M.navy} />
      {/* seven white risers stepping up to the back */}
      {Array.from({ length: 7 }, (_, k) => (
        <Bx key={k} p={[0, d / 2 - rd * (k + 0.5), 0.8 + (7 - k) / 2]} s={[w * 0.72, rd, 7 - k]} m={k === 0 ? M.navy : M.white} />
      ))}
      {[-0.36, -0.18, 0.18, 0.36].map((f) => Array.from({ length: 6 }, (_, k) => <Bx key={`${f}_${k}`} p={[f * w, d / 2 - rd * (k + 1.5), 0.8 + (6 - k) + 0.6]} s={[1.2, 1.2, 1.2]} m={M.purple} />))}
      {/* shrine: its own gilded platform along the north wall, behind the annakut */}
      <Bx p={[0, d / 2 + 3, SZ / 2]} s={[w, 6, SZ]} m={M.maroon} />
      <Bx p={[0, d / 2 + 3, SZ + 0.05]} s={[w - 0.8, 5.2, 0.12]} m={M.gold} />
      <Bx p={[0, d / 2 + 5.8, 12.5 + dz]} s={[w * 0.92, 0.5, 9]} m={M.back} />
      {[-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].map((i) => <Bx key={i} p={[i * pitch, d / 2 + 3, 12.3 + dz]} s={[0.7, 0.7, 9]} m={M.gold} />)}
      {bays.map((b) => (
        <group key={b.key}>
          <mesh position={L(b.key * pitch, d / 2 + 3, 16.9 + dz)} material={M.red}><torusGeometry args={[br * FTm, 0.38 * FTm, 8, 24, Math.PI]} /></mesh>
          <mesh position={L(b.key * pitch, d / 2 + 3, 19.6 + dz)} scale={[1, 1.3, 1]} material={M.gold}><sphereGeometry args={[br * 0.66 * FTm, 14, 10]} /></mesh>
          <mesh position={L(b.key * pitch, d / 2 + 3, 22.6 + dz)} material={M.gold}><coneGeometry args={[0.5 * FTm, 2.2 * FTm, 8]} /></mesh>
          <Bx p={[b.key * pitch, d / 2 + 3, SZ + 0.1]} s={[pitch * 0.86, 3, 0.3]} m={M.gold} />
        </group>
      ))}
      <Inst geo={figG} mat={matC} n={fig.length} colored deps={[fig]} fill={(i, dd, c) => { dd.position.set(...L(fig[i].x, fig[i].y, SZ + 0.2)); c.set(fig[i].c); }} />
      <Inst geo={headG} mat={M.marble} n={fig.length} deps={[fig]} fill={(i, dd) => dd.position.set(...L(fig[i].x, fig[i].y, SZ + 0.2))} />
      {/* perimeter stands with offerings */}
      <Inst geo={cubeG} mat={M.purple} n={pts.cubes.length} deps={[pts]} fill={(i, dd) => { const q = pts.cubes[i]; dd.position.set(...L(q.x, q.y, 1.4)); dd.scale.set(q.s, q.s, q.s); dd.rotation.y = q.ang; }} />
      <Inst geo={bowlG} mat={matBowl} n={pts.cubes.length} colored deps={[pts]} fill={(i, dd, c) => { const q = pts.cubes[i]; dd.position.set(...L(q.x, q.y, 1.4 + 0.55 * q.s + 0.2)); dd.scale.set(q.s, 1, q.s); c.set(q.c); }} />
      <Inst geo={bowlG} mat={matBowl} n={pts.tiers.length} colored deps={[pts]} fill={(i, dd, c) => { const q = pts.tiers[i]; dd.position.set(...L(q.x, q.y, q.z)); c.set(q.c); }} />
      {/* rainbow sweet pyramids */}
      {cones.map((c, i) => RAINBOW.map((col, k) => (
        <mesh key={`${i}_${k}`} position={L(c.x, c.y, 1 + k * 0.85)} material={std(col)}><cylinderGeometry args={[(2.3 - k * 0.24) * FTm, (2.45 - k * 0.24) * FTm, 0.8 * FTm, 16]} /></mesh>
      )))}
      {/* centre display platform with a tiered cake */}
      <Bx p={[0, -d * 0.12, 1.4]} s={[15, 10, 1.2]} m={M.pink} />
      <Bx p={[0, -d * 0.12, 2.1]} s={[13.4, 8.4, 0.4]} m={M.purple} />
      {cake.map(([r, c], k) => <mesh key={k} position={L(0, -d * 0.12, 2.7 + k * 1.25)} material={std(c)}><cylinderGeometry args={[r * FTm, (r + 0.15) * FTm, 1.2 * FTm, 18]} /></mesh>)}
      {/* hanging marigold strands with diyas */}
      <Beads pts={strands} color={['#f28c0f', '#ffc94a']} r={0.32} />
      {hang.map((x, i) => <mesh key={i} position={L(x, d / 2 - 6, 12.6)} material={std(i % 2 ? '#e86aa0' : '#2fae5a')}><coneGeometry args={[0.6 * FTm, 0.9 * FTm, 8]} /></mesh>)}
      <NearHtml pos={L(0, 0, 14)} max={120}><div className="label3d sec">Annakut · Mandir Hall</div></NearHtml>
    </group>
  );
}

/* ───────────────────────── decorated display (last year's annakut photo style) ───────────────────────── */
export function Displays() {
  const list = useCE((s) => s.e.displays);
  return <>{list.map((d) => <DisplayModel key={d.id} a={d} />)}</>;
}

function DisplayModel({ a }: { a: Display }) {
  const { w, d } = a;
  const M = useMemo(() => ({
    base: std('#8a1f2a'), cream: std('#efe2bd'), wall: std('#b9733f'), white: std('#f6f1e6'), tile: std('#a63f27'), ridge: std('#f1eadb'),
    candle: std('#f4f0e2', { emissive: new THREE.Color('#ffd27a'), emissiveIntensity: 0.5 }), leaf: std('#2f7a3f'),
  }), []);
  const tiers = useMemo(() => Array.from({ length: 5 }, (_, k) => {
    const tw = w * (0.94 - 0.15 * k), td = (d - 3) * (1 - 0.16 * k);
    return { k, tw, td, cy: d / 2 - 1.2 - td / 2, z0: 1.2 + k * 1.5 };
  }), [w, d]);
  const bowls = useMemo(() => {
    const r = srand(11);
    const out: { x: number; y: number; z: number; c: string; s: number }[] = [];
    for (const t of tiers) {
      const nx = Math.floor(t.tw / 1.5), ny = Math.max(1, Math.floor(t.td / 1.6));
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) out.push({ x: -t.tw / 2 + (i + 0.5) * (t.tw / nx), y: t.cy - t.td / 2 + (j + 0.5) * (t.td / ny), z: t.z0 + 1.5 + 0.28, c: SWEETS[Math.floor(r() * SWEETS.length)], s: 0.85 + r() * 0.4 });
    }
    return out;
  }, [tiers]);
  const bowlG = useMemo(() => new THREE.CylinderGeometry(0.62 * FTm, 0.46 * FTm, 0.55 * FTm, 10), []);
  const candleG = useMemo(() => new THREE.CylinderGeometry(0.26 * FTm, 0.26 * FTm, 1.7 * FTm, 8).translate(0, 0.85 * FTm, 0), []);
  const matBowl = useMemo(() => std('#ffffff', { roughness: 0.6 }), []);
  const candles = useMemo(() => Array.from({ length: Math.floor(w / 2.4) }, (_, i) => -w / 2 + 1 + i * 2.4), [w]);
  const swagPts = useMemo(() => swag([-w / 2, d / 2 - 1, 19], [w / 2, d / 2 - 1, 19], 1.8, Math.round(w / 1.6)), [w, d]);
  const diam = useMemo(() => { const n = Math.max(3, Math.round(w / 9)); return Array.from({ length: n }, (_, i) => -w / 2 + ((i + 0.5) * w) / n); }, [w]);
  return (
    <group {...place(a.x, a.y, a.yaw)}>
      {/* red base with candle posts along the front */}
      <Bx p={[0, 0, 0.6]} s={[w, d - 0.4, 1.2]} m={M.base} />
      <Inst geo={candleG} mat={M.candle} n={candles.length} deps={[candles]} fill={(i, dd) => dd.position.set(...L(candles[i], -d / 2 + 0.5, 1.2))} />
      {/* five stepped tiers of food, packed with colourful bowls */}
      {tiers.map((t) => <Bx key={t.k} p={[0, t.cy, t.z0 + 0.75]} s={[t.tw, t.td, 1.5]} m={M.cream} />)}
      <Inst geo={bowlG} mat={matBowl} n={bowls.length} colored deps={[bowls]} fill={(i, dd, c) => { const q = bowls[i]; dd.position.set(...L(q.x, q.y, q.z)); dd.scale.set(q.s, 1.3, q.s); c.set(q.c); }} />
      {/* terracotta backdrop with white diamonds, pilasters, and a tiled roof */}
      <Bx p={[0, d / 2 - 0.3, 8.6]} s={[w + 1, 0.5, 14.8]} m={M.wall} />
      {Array.from({ length: 6 }, (_, i) => <Bx key={i} p={[-w / 2 + (i * w) / 5, d / 2 - 0.65, 8.6]} s={[0.5, 0.3, 14.8]} m={M.white} />)}
      {diam.map((x) => (
        <mesh key={x} position={L(x, d / 2 - 0.62, 10.2)} rotation={[0, 0, Math.PI / 4]}><planeGeometry args={[2.3 * FTm, 2.3 * FTm]} /><meshStandardMaterial color="#f6f1e6" roughness={0.8} /></mesh>
      ))}
      <Bx p={[0, d / 2 - 0.9, 16.2]} s={[w + 2, 3, 1]} m={M.tile} />
      <Bx p={[0, d / 2 - 0.9, 17]} s={[w + 2.2, 0.8, 0.6]} m={M.ridge} />
      <Bunting pts={swagPts} colors={['#e8620a', '#f2b632', '#2a8a9a', '#d6246f', '#f4efe0']} ang={0} />
      <NearHtml pos={L(0, 0, 20)} max={150}><div className="label3d sec">Decorated side room · display</div></NearHtml>
    </group>
  );
}
