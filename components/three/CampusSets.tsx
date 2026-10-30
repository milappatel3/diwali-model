'use client';
// Purpose-built exhibit sets from the client's reference images: CAPA booth, the three centerpiece pillar bays,
// the Neelkanth Varni mandala room and the lotus-activity props. Local plan frame: +x = the way the set faces, +y = its left.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { FTm } from './materials';
import { std, canvasTex, Inst, NearHtml } from './CampusModel';
import { Bx, Cyl, L, type V3 } from './CampusFestival';

/** a flat picture on a vertical plane. face: 'x' looks +x, '-x' looks −x, 'y' looks +y, '-y' looks −y (local plan) */
export function Pic({ p, w, h, tex, face = 'x', alpha = false, lit = true }: { p: V3; w: number; h: number; tex: THREE.Texture; face?: 'x' | '-x' | 'y' | '-y'; alpha?: boolean; lit?: boolean }) {
  const ry = { x: Math.PI / 2, '-x': -Math.PI / 2, y: Math.PI, '-y': 0 }[face];
  return (
    <mesh position={L(...p)} rotation={[0, ry, 0]}>
      <planeGeometry args={[w * FTm, h * FTm]} />
      {lit ? <meshBasicMaterial map={tex} transparent={alpha} alphaTest={alpha ? 0.3 : 0} toneMapped={false} side={THREE.DoubleSide} /> : <meshStandardMaterial map={tex} transparent={alpha} side={THREE.DoubleSide} />}
    </mesh>
  );
}
const Ball = ({ p, r, m, s = [1, 1, 1] }: { p: V3; r: number; m: THREE.Material; s?: V3 }) => (
  <mesh position={L(...p)} scale={s} material={m}><sphereGeometry args={[r * FTm, 14, 10]} /></mesh>
);
const Cone = ({ p, r, h, m, seg = 12 }: { p: V3; r: number; h: number; m: THREE.Material; seg?: number }) => (
  <mesh position={L(p[0], p[1], p[2] + h / 2)} material={m}><coneGeometry args={[r * FTm, h * FTm, seg]} /></mesh>
);
function Plant({ p, s = 1 }: { p: V3; s?: number }) {
  const M = useMemo(() => ({ pot: std('#b98a52'), leaf: std('#2f8a3c', { side: THREE.DoubleSide }) }), []);
  return (
    <group>
      <Cyl p={[p[0], p[1], p[2]]} r={0.7 * s} r2={0.55 * s} h={1.1 * s} m={M.pot} />
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2;
        return <mesh key={i} position={L(p[0] + Math.cos(a) * 0.35 * s, p[1] + Math.sin(a) * 0.35 * s, p[2] + 1.1 * s + 1.0 * s)} rotation={[Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45]} material={M.leaf}><coneGeometry args={[0.2 * s * FTm, 2.0 * s * FTm, 5]} /></mesh>;
      })}
    </group>
  );
}

/* ───────────────────────── CAPA — BAPS Charities booth (image 2) ───────────────────────── */
export function CapaBooth() {
  const M = useMemo(() => ({
    carpet: std('#b8946a'), red: std('#8e1e26'), redD: std('#6f151c'), cream: std('#f6efe0'), frame: std('#efe9dc'), black: std('#14161a'), gold: std('#d9a53a'), steel: std('#c6cbd2', { metalness: 0.5 }),
  }), []);
  const T = useMemo(() => {
    const logo = (g: CanvasRenderingContext2D, x: number, y: number, s: number, col = '#8e1e26') => { g.fillStyle = col; g.font = `700 ${s}px Georgia, serif`; g.textAlign = 'left'; g.fillText('BAPS', x, y); g.font = `400 ${s}px Georgia, serif`; g.fillText('CHARITIES', x + s * 2.35, y); };
    const flame = (g: CanvasRenderingContext2D, cx: number, cy: number, s: number, col: string) => {
      g.fillStyle = col; g.beginPath(); g.moveTo(cx, cy - s); g.bezierCurveTo(cx + s * 0.9, cy - s * 0.2, cx + s * 0.5, cy + s * 0.8, cx, cy + s * 0.9);
      g.bezierCurveTo(cx - s * 0.7, cy + s * 0.7, cx - s * 0.6, cy, cx - s * 0.1, cy - s * 0.35); g.closePath(); g.fill();
    };
    const mid = canvasTex(1024, 819, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#fffaf0'); gr.addColorStop(1, '#f6e7c8'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      logo(g, 380, 70, 26);
      for (const [x, y] of [[100, 150], [920, 150]]) { g.strokeStyle = '#b88a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, y - 20); g.stroke(); flame(g, x, y, 24, '#e8620a'); }
      g.fillStyle = '#a32a2a'; g.textAlign = 'center'; g.font = '700 92px Georgia, serif'; g.fillText('Light Beyond', w / 2, 270); g.fillText('the Celebration', w / 2, 370);
      g.fillStyle = '#e0892a'; g.font = '400 38px Georgia, serif'; g.fillText('When Compassion Becomes Action.', w / 2, 425);
      g.fillStyle = '#7a6a5a'; for (let i = 0; i < 7; i++) g.fillRect(560, 480 + i * 22, 330 - (i % 3) * 30, 8);
    });
    const left = canvasTex(768, 819, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#a63a2e'); gr.addColorStop(1, '#7a1c22'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      logo(g, 70, 90, 28, '#fff'); g.fillStyle = '#fff'; g.textAlign = 'left'; g.font = '700 110px Georgia, serif'; g.fillText('Service', 60, 300); g.fillText('in Action', 60, 410);
      g.fillStyle = '#f2c86a'; g.font = '400 30px Georgia, serif'; g.fillText('A Year of Compassion, Health,', 60, 480); g.fillText('Education, Relief, and Opportunity', 60, 520);
      flame(g, 220, 660, 110, '#fff'); g.fillStyle = '#f2c86a'; g.font = '700 38px Georgia, serif'; g.fillText('Areas of Service', 440, 220);
      ['Health & Wellness', 'Education', 'Environment', 'Humanitarian Relief', 'Community Service'].forEach((t, i) => { g.fillStyle = '#f0b24a'; g.beginPath(); g.arc(470, 300 + i * 105, 26, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '600 26px Georgia, serif'; g.fillText(t, 515, 308 + i * 105); });
    });
    const table = canvasTex(768, 256, (g, w, h) => {
      g.fillStyle = '#8e1e26'; g.fillRect(0, 0, w, h); g.fillStyle = '#d9a53a'; g.fillRect(0, h - 24, w, 5);
      logo(g, 200, 120, 46, '#fff'); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '400 26px Georgia, serif'; g.fillText('Service  |  Harmony  |  Stronger Communities', w / 2, 190);
    });
    const monitor = canvasTex(512, 288, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#5a1018'); gr.addColorStop(1, '#a8431e'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      flame(g, 130, 150, 60, '#fff'); g.fillStyle = '#fff'; g.textAlign = 'left'; g.font = '700 40px Georgia, serif'; g.fillText('Light Beyond', 230, 130); g.fillText('the Celebration', 230, 180);
    });
    const roll1 = canvasTex(256, 640, (g, w, h) => {
      g.fillStyle = '#f7efdc'; g.fillRect(0, 0, w, h); logo(g, 40, 50, 16);
      g.fillStyle = '#8e1e26'; g.textAlign = 'left'; g.font = '700 46px Georgia, serif'; g.fillText('Our Impact', 30, 120);
      ['50,000+', '1,200+', '125+', '3,000+', '50+', '12+'].forEach((t, i) => { g.fillStyle = '#e8923a'; g.beginPath(); g.arc(48, 180 + i * 62, 18, 0, 7); g.fill(); g.fillStyle = '#8e1e26'; g.font = '700 30px Georgia, serif'; g.fillText(t, 80, 190 + i * 62); });
      g.fillStyle = '#8e1e26'; g.fillRect(0, h - 90, w, 90); flame(g, w / 2, h - 45, 24, '#fff');
    });
    const roll2 = canvasTex(256, 640, (g, w, h) => {
      g.fillStyle = '#f7efdc'; g.fillRect(0, 0, w, h); logo(g, 40, 50, 16);
      g.fillStyle = '#8e1e26'; g.textAlign = 'center'; g.font = '700 46px Georgia, serif'; g.fillText('A Global', w / 2, 130); g.fillText('Family', w / 2, 182);
      g.fillStyle = '#e0b060'; for (let i = 0; i < 30; i++) { g.beginPath(); g.ellipse(60 + (i % 6) * 28, 260 + Math.floor(i / 6) * 22, 18, 10, 0, 0, 7); g.fill(); }
      g.fillStyle = '#8e1e26'; g.font = '400 24px Georgia, serif'; g.fillText('Active in', w / 2, 420); g.font = '700 30px Georgia, serif'; g.fillText('12 countries', w / 2, 460); g.font = '400 24px Georgia, serif'; g.fillText('across', w / 2, 490); g.font = '700 30px Georgia, serif'; g.fillText('5 continents', w / 2, 525);
      g.fillStyle = '#8e1e26'; g.fillRect(0, h - 90, w, 90); flame(g, w / 2, h - 45, 24, '#fff');
    });
    return { mid, left, table, monitor, roll1, roll2 };
  }, []);
  return (
    <group>
      <Bx p={[-1.5, 2, 0.06]} s={[15, 24, 0.12]} m={M.carpet} />
      {/* back panel, 10 × 8 ft, and the return panel on the south side */}
      <Bx p={[-6.55, 0, 4.2]} s={[0.2, 10.2, 8.4]} m={M.frame} />
      <Pic p={[-6.43, 0, 4.2]} w={10} h={8} tex={T.mid} face="x" />
      <Bx p={[-3.5, -5.1, 4.2]} s={[6.2, 0.2, 8.4]} m={M.frame} />
      <Pic p={[-3.5, -4.98, 4.2]} w={6} h={8} tex={T.left} face="y" />
      {/* skirted table, monitor and diyas */}
      <Bx p={[-4.1, 0, 1.3]} s={[2.6, 6, 2.6]} m={M.red} />
      <Bx p={[-4.1, 0, 2.66]} s={[2.7, 6.1, 0.1]} m={M.redD} />
      <Pic p={[-2.78, 0, 1.3]} w={5.8} h={2.4} tex={T.table} face="x" />
      <Bx p={[-4.4, 0, 3.2]} s={[0.3, 0.3, 1.1]} m={M.black} />
      <Bx p={[-4.4, 0, 4.4]} s={[0.25, 3.1, 1.8]} m={M.black} />
      <Pic p={[-4.25, 0, 4.4]} w={2.9} h={1.65} tex={T.monitor} face="x" />
      {[-1.8, 1.9].map((y) => <Cyl key={y} p={[-3.6, y, 2.7]} r={0.28} r2={0.2} h={0.2} m={M.gold} />)}
      {/* two roll-up banners on the north side */}
      {[[T.roll1, 5.8], [T.roll2, 8.8]].map(([t, y], i) => (
        <group key={i}>
          <Bx p={[-4.2, y as number, 0.15]} s={[1, 3, 0.3]} m={M.steel} />
          <Pic p={[-4.05, y as number, 3.95]} w={2.8} h={7} tex={t as THREE.Texture} face="x" />
        </group>
      ))}
      <Plant p={[-5.6, -3.4, 0]} /><Plant p={[-3.6, 3.7, 0]} />
      <NearHtml pos={L(-1, 0, 11)} max={120}><div className="label3d sec" style={{ background: '#8e1e26', color: '#fff', borderColor: '#fff' }}>CAPA · BAPS Charities</div></NearHtml>
    </group>
  );
}

/* ───────────────────────── centerpiece: Mandir · Shastra · Sant bays (images 11–12) ───────────────────────── */
const SAND = '#c8946a', SAND_L = '#dcb083', SAND_D = '#a8774e';
export function PillarBay({ kind, w, d }: { kind: 'mandir' | 'shastra' | 'sant'; w: number; d: number }) {
  const H = 11;
  const M = useMemo(() => ({
    sand: std(SAND), sandL: std(SAND_L), sandD: std(SAND_D), ply: std('#d9b779'), cream: std('#f1e2bb'), gold: std('#e0a92c', { metalness: 0.6, roughness: 0.4 }),
    green: std('#3a7a3a'), trunk: std('#5b4430'), saff: std('#ee7a1f', { side: THREE.DoubleSide }), glow: std('#ffd98a', { emissive: new THREE.Color('#ffb44a'), emissiveIntensity: 0.9 }),
    orange: std('#e07a1f'), skin: std('#d9a070'), white: std('#f4efe6'), rock: std('#7a7466'), brass: std('#c9962c', { metalness: 0.7, roughness: 0.35 }),
  }), []);
  const title = { mandir: ['Mandir (Temple)', 'Connects us with the Divine'], shastra: ['Shastra (Scripture)', 'Guides us with Wisdom'], sant: ['Sant (Guru)', 'Shows us the Path'] }[kind];
  const plaque = useMemo(() => canvasTex(768, 112, (g, W, Hh) => {
    g.fillStyle = '#a8774e'; g.fillRect(0, 0, W, Hh); g.strokeStyle = '#e6c58f'; g.lineWidth = 4; g.strokeRect(6, 6, W - 12, Hh - 12);
    g.fillStyle = '#f6e7c3'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 34px Georgia, serif'; g.fillText(`${title[0]} — ${title[1]}`, W / 2, Hh / 2 + 2);
  }), [title[0]]);
  const tag = useMemo(() => canvasTex(128, 192, (g, W, Hh) => {
    g.fillStyle = '#a8774e'; g.fillRect(0, 0, W, Hh); g.strokeStyle = '#e6c58f'; g.lineWidth = 4; g.strokeRect(5, 5, W - 10, Hh - 10);
    g.fillStyle = '#f6e7c3'; g.textAlign = 'center'; g.font = '700 28px Georgia, serif';
    const t = { mandir: ['MANDIR'], shastra: ['SHASTRA'], sant: ['SANT'] }[kind][0];
    t.split('').forEach((c, i) => g.fillText(c, W / 2, 46 + i * 24));
  }), [kind]);
  const scene = useMemo(() => canvasTex(768, 512, (g, W, Hh) => {
    const sky = g.createLinearGradient(0, 0, 0, Hh); sky.addColorStop(0, '#6fa6d8'); sky.addColorStop(1, '#dfeaf2'); g.fillStyle = sky; g.fillRect(0, 0, W, Hh);
    g.fillStyle = '#6a84a0'; g.beginPath(); g.moveTo(0, 330); g.lineTo(150, 250); g.lineTo(260, 320); g.lineTo(420, 230); g.lineTo(600, 330); g.lineTo(768, 270); g.lineTo(768, 512); g.lineTo(0, 512); g.fill();
    g.fillStyle = '#3d6a2e'; g.beginPath(); g.ellipse(300, 150, 300, 150, 0, 0, 7); g.fill(); g.fillStyle = '#2f5a24'; g.beginPath(); g.ellipse(200, 120, 160, 90, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(430, 100, 150, 80, 0, 0, 7); g.fill();
    g.fillStyle = '#5a4630'; g.fillRect(240, 180, 70, 280);
  }), []);
  const books = useMemo(() => ['Vedas', 'Upanishads', 'Bhagavad Gita', 'Ramayana', 'Mahabharata'].map((t, i) => canvasTex(256, 56, (g, W, Hh) => {
    g.fillStyle = ['#6a2a1a', '#2a5a3a', '#2a3f7a', '#b4531e', '#4a2a2a'][i]; g.fillRect(0, 0, W, Hh); g.fillStyle = '#f2dca0'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 30px Georgia, serif'; g.fillText(t, W / 2, Hh / 2);
  })), []);
  const bw = w - 2.6; // clear width between the pillars
  const pil = [-1, 1].map((sd) => (
    <group key={sd}>
      <Bx p={[0, sd * (w / 2 - 0.9), 1.6]} s={[1.9, 1.9, 0.9]} m={M.sandD} />
      <Bx p={[0, sd * (w / 2 - 0.9), 1.2 + (H - 3) / 2 + 0.4]} s={[1.2, 1.2, H - 3]} m={M.sand} />
      {[3.2, 5.2, 7.2].map((z) => <Bx key={z} p={[0.05, sd * (w / 2 - 0.9), z]} s={[1.45, 1.45, 0.16]} m={M.sandL} />)}
      <Bx p={[0, sd * (w / 2 - 0.9), H - 1.5]} s={[1.9, 1.9, 0.7]} m={M.sandD} />
      <Bx p={[0, sd * (w / 2 - 0.9), H - 0.8]} s={[2.4, 2.4, 0.5]} m={M.sandL} />
      <Bx p={[0.5, sd * (w / 2 - 0.9), H - 1.1]} s={[0.8, 0.9, 1.0]} m={M.sandL} />
      <Pic p={[0.62, sd * (w / 2 - 0.9), 6.2]} w={0.9} h={1.4} tex={tag} face="x" />
    </group>
  ));
  return (
    <group>
      <Bx p={[0, 0, 0.6]} s={[d, w, 1.2]} m={M.ply} />
      <Bx p={[d / 2 - 0.15, 0, 0.45]} s={[0.3, w, 0.9]} m={M.sandL} />
      <Pic p={[d / 2 + 0.02, 0, 0.62]} w={Math.min(8, w - 2)} h={0.85} tex={plaque} face="x" />
      {pil}
      {/* back wall */}
      <Bx p={[-1.2, 0, 1.2 + (H - 3) / 2]} s={[0.4, bw, H - 3]} m={kind === 'sant' ? M.sandL : M.sand} />
      {kind === 'mandir' && (
        <group>
          <Bx p={[-0.3, 0, 1.8]} s={[3.6, 3.6, 0.6]} m={M.cream} />
          {[0, 1, 2].map((k) => <Bx key={k} p={[0.9 + 0.4 * k, 0, 1.45 + 0.1 * k]} s={[0.5, 1.8 - 0.1 * k, 0.15]} m={M.cream} />)}
          <Bx p={[-0.3, 0, 3.4]} s={[2.4, 2.4, 2.6]} m={M.cream} />
          <mesh position={L(0.92, 0, 3.2)} rotation={[0, Math.PI / 2, 0]} material={M.glow}><planeGeometry args={[0.9 * FTm, 1.3 * FTm]} /></mesh>
          {[0, 1, 2, 3, 4].map((k) => <Bx key={k} p={[-0.3, 0, 5.1 + k * 0.85]} s={[2.1 - k * 0.38, 2.1 - k * 0.38, 0.85]} m={M.cream} />)}
          <Cyl p={[-0.3, 0, 9.4]} r={0.3} r2={0.12} h={0.9} m={M.gold} />
          <Cyl p={[-2.7, 3.1, 1.2]} r={0.08} h={6.5} m={M.trunk} />
          <mesh position={L(-2.7, 3.7, 7.1)} rotation={[0, 0, 0]} material={M.saff}><planeGeometry args={[1.2 * FTm, 0.9 * FTm]} /></mesh>
          {[[-0.6, -3.3], [-0.3, 3.4]].map(([x, y], i) => <group key={i}><Cyl p={[x, y, 1.2]} r={0.18} h={1.6} m={M.trunk} /><Ball p={[x, y, 3.2]} r={1} m={M.green} /></group>)}
        </group>
      )}
      {kind === 'shastra' && (
        <group>
          <Bx p={[-1.0, 0, 6.4]} s={[0.2, 4.6, 6.6]} m={M.glow} />
          <mesh position={L(-0.9, 0, 9.6)} rotation={[0, Math.PI / 2, Math.PI / 2]} material={M.glow}><cylinderGeometry args={[2.3 * FTm, 2.3 * FTm, 0.2 * FTm, 20, 1, false, 0, Math.PI]} /></mesh>
          <Bx p={[0, 1.7, 1.55]} s={[2.9, 3.7, 0.7]} m={M.sand} />
          {books.map((t, i) => <group key={i}><Bx p={[0.05, 1.7, 2.2 + i * 0.55]} s={[2.4, 3.3, 0.52]} m={std(['#6a2a1a', '#2a5a3a', '#2a3f7a', '#b4531e', '#4a2a2a'][i])} /><Pic p={[1.27, 1.7, 2.2 + i * 0.55]} w={3} h={0.5} tex={t} face="x" /></group>)}
          <Bx p={[0.4, -2.4, 1.8]} s={[0.4, 1.9, 1.2]} m={M.trunk} />
          <mesh position={L(0.4, -2.4, 2.55)} rotation={[0, 0, 0]} material={M.cream}><boxGeometry args={[1.5 * FTm, 0.12 * FTm, 2.8 * FTm]} /></mesh>
        </group>
      )}
      {kind === 'sant' && (
        <group>
          <Pic p={[-0.98, 0, 1.2 + (H - 3) / 2]} w={bw - 0.3} h={H - 3.2} tex={scene} face="x" />
          <Ball p={[0.1, 0.6, 1.9]} r={1.7} m={M.rock} s={[1.3, 1.5, 0.55]} />
          <Cone p={[0.1, 0.2, 2.5]} r={1.05} h={2.0} m={M.orange} />
          <Ball p={[0.1, 0.2, 4.8]} r={0.5} m={M.skin} />
          <Bx p={[0.55, 0.2, 4.4]} s={[0.15, 0.5, 0.7]} m={M.white} />
          <Bx p={[0.25, 1.15, 4.0]} s={[0.4, 0.3, 1.0]} m={M.skin} yaw={0} />
          <Bx p={[0.6, -2.4, 1.5]} s={[0.9, 1.4, 0.5]} m={M.trunk} />
          <Cyl p={[0.5, -1.8, 1.2]} r={0.3} r2={0.22} h={0.6} m={M.gold} />
        </group>
      )}
    </group>
  );
}

/* ───────────────────────── Neelkanth Varni — mandala wall + abhishek murti (images 13–14) ───────────────────────── */
export function NeelkanthRoom({ w, d }: { w: number; d: number }) {
  const M = useMemo(() => ({
    navy: std('#1b3566'), brass: std('#cf9a2e', { metalness: 0.75, roughness: 0.3 }), red: std('#c0392b'), gold: std('#e8b330', { metalness: 0.7, roughness: 0.3 }),
    wood: std('#c99a5e'), planter: std('#8a5a2e'), leaf: std('#3f8a4a'), cream: std('#f2e3c8'),
  }), []);
  const mandala = useMemo(() => {
    const draw = (col: string, ink: string) => canvasTex(1024, 1024, (g, W, Hh) => {
      g.clearRect(0, 0, W, Hh); const c = W / 2;
      const ring = (n: number, r0: number, r1: number, wid: number, ph = 0) => { for (let i = 0; i < n; i++) { const a = ph + (i / n) * Math.PI * 2; g.save(); g.translate(c, c); g.rotate(a); g.beginPath(); g.moveTo(0, -r0); g.bezierCurveTo(wid, -(r0 + r1) / 2, wid * 0.6, -r1 * 0.95, 0, -r1); g.bezierCurveTo(-wid * 0.6, -r1 * 0.95, -wid, -(r0 + r1) / 2, 0, -r0); g.fillStyle = col; g.fill(); g.strokeStyle = ink; g.lineWidth = 5; g.stroke(); g.restore(); } };
      ring(24, 380, 505, 70); ring(16, 300, 440, 105, 0.1); ring(8, 190, 380, 150); ring(16, 110, 220, 50, 0.2);
      g.beginPath(); g.arc(c, c, 120, 0, 7); g.fillStyle = col; g.fill(); g.strokeStyle = ink; g.lineWidth = 6; g.stroke();
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.beginPath(); g.arc(c + Math.cos(a) * 80, c + Math.sin(a) * 80, 22, 0, 7); g.strokeStyle = ink; g.lineWidth = 4; g.stroke(); }
      g.beginPath(); g.arc(c, c, 34, 0, 7); g.fillStyle = '#e9d8b4'; g.fill(); g.stroke();
    });
    return { top: draw('#ecd7ae', '#a97a45'), under: draw('#7a5230', '#4a3018') };
  }, []);
  const bell = useMemo(() => canvasTex(128, 160, (g, W, Hh) => {
    g.clearRect(0, 0, W, Hh); g.fillStyle = '#d6aa6c'; g.beginPath(); g.moveTo(W / 2, 8); g.bezierCurveTo(W * 0.85, 20, W * 0.95, 80, W - 6, Hh - 36); g.lineTo(6, Hh - 36); g.bezierCurveTo(W * 0.05, 80, W * 0.15, 20, W / 2, 8); g.fill(); g.fillRect(6, Hh - 40, W - 12, 12);
    g.beginPath(); g.arc(W / 2, Hh - 18, 14, 0, 7); g.fill(); g.strokeStyle = '#8a5f30'; g.lineWidth = 3; g.stroke();
    for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(34 + i * 30, 96, 13, Math.PI, 0); g.stroke(); }
  }), []);
  const flowers = useMemo(() => {
    const out: { p: V3; c: string }[] = [];
    for (const y of [-5.6, -3.4, 3.4, 5.6]) for (let i = 0; i < 14; i++) out.push({ p: [-3.2 + (Math.sin(i * 7.3 + y) * 0.35), y + (Math.cos(i * 3.1) * 1.6), 1.5 + Math.abs(Math.sin(i * 2.7)) * 0.4], c: ['#f6efe6', '#f4c6b5', '#f2a7a0', '#ffffff'][i % 4] });
    return out;
  }, []);
  const flowerG = useMemo(() => new THREE.SphereGeometry(0.3 * FTm, 7, 5), []);
  const flowerM = useMemo(() => std('#ffffff'), []);
  const bx = -d / 2 + 0.4;
  return (
    <group>
      <Bx p={[bx - 0.2, 0, 5.4]} s={[0.3, w - 1, 10.8]} m={M.navy} />
      {/* CNC mandala, 8 ft across, with a darker layer behind for depth */}
      <Pic p={[bx + 0.16, 0.1, 6.0]} w={8.2} h={8.2} tex={mandala.under} face="x" alpha />
      <Pic p={[bx + 0.3, 0, 6.1]} w={8} h={8} tex={mandala.top} face="x" alpha />
      {[[-6.4, 9.2, 2.4], [-5.2, 8.0, 3.8], [-4.4, 9.4, 2.2], [4.4, 8.9, 2.6], [5.3, 7.8, 3.9], [6.5, 9.3, 2.3]].map(([y, z, len], i) => (
        <group key={i}>
          <Bx p={[bx + 0.2, y, 10.4 - len / 2 + (10.8 - 10.4) / 2]} s={[0.03, 0.03, len]} m={M.cream} />
          <Pic p={[bx + 0.25, y, 10.4 - len - 0.9]} w={1.3} h={1.6} tex={bell} face="x" alpha />
        </group>
      ))}
      {/* brass bowl on an ornate pedestal with the golden murti */}
      <Cyl p={[0, 0, 0]} r={0.95} r2={0.8} h={0.5} m={M.gold} />
      <Cyl p={[0, 0, 0.5]} r={0.55} h={1.9} m={M.red} />
      <Cyl p={[0, 0, 1.4]} r={0.7} h={0.18} m={M.gold} />
      <Cyl p={[0, 0, 2.4]} r={0.9} r2={0.6} h={0.5} m={M.gold} />
      <Cyl p={[0, 0, 2.9]} r={2.4} r2={0.9} h={0.55} m={M.brass} />
      <Cyl p={[0, 0, 3.45]} r={0.6} h={0.12} m={M.gold} />
      <Cone p={[0, 0, 3.55]} r={0.5} h={2.1} m={M.gold} seg={14} />
      <Ball p={[0, 0, 5.85]} r={0.3} m={M.gold} />
      <Cone p={[0, 0, 6.05]} r={0.2} h={0.5} m={M.gold} seg={8} />
      {/* planter boxes with greenery and flowers */}
      {[-5, 5].map((y) => (
        <group key={y}>
          <Bx p={[-3.1, y, 0.6]} s={[1.3, 5.2, 1.2]} m={M.planter} />
          {[-1.8, -0.6, 0.6, 1.8].map((o) => <Cone key={o} p={[-3.1, y + o, 1.2]} r={0.7} h={1.5} m={M.leaf} seg={7} />)}
        </group>
      ))}
      <Inst geo={flowerG} mat={flowerM} n={flowers.length} colored deps={[flowers]} fill={(i, dd, c) => { dd.position.set(...L(...flowers[i].p)); c.set(flowers[i].c); }} />
      <NearHtml pos={L(0, 0, 12.5)} max={120}><div className="label3d sec">Neelkanth Varni</div></NearHtml>
    </group>
  );
}
