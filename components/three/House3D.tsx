'use client';
// Detailed 3D dressing for the walk-through Hindu House: floor & rugs, furniture, Ghar Mandir, kitchen,
// reading corner, carved doorway with toran, rangoli, jharokha windows and exterior trim.
// Everything here is drawn in the house's own "sketch" frame: x = sx (ft, 0 = left looking in),
// z = sy (ft, 0 = entrance wall), y = up — so it follows the house when it is moved, rotated or mirrored.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { Item } from '@/lib/types';
import { houseXY, params as P } from '@/lib/catalog';
import { mats, W, FTm } from './materials';
import { marbleTileTex, rugTex, rangoliTex, jharokhaTex, booksTex, mandirBackTex } from './textures';

type V = [number, number];
const M3 = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.8, ...o });
let LOCAL: Record<string, THREE.Material> | null = null;
function lm() {
  if (LOCAL) return LOCAL;
  LOCAL = {
    marble: M3({ map: marbleTileTex(), roughness: 0.28 }),
    rugLiving: M3({ map: rugTex('rugLiving'), roughness: 1 }),
    rugMandir: M3({ map: rugTex('rugMandir', '#c46a1e', '#5a1410'), roughness: 1 }),
    rugRead: M3({ map: rugTex('rugRead', '#1f4a4a', '#c48a2a'), roughness: 1 }),
    rangoli: new THREE.MeshStandardMaterial({ map: rangoliTex(), transparent: true, roughness: 0.95, depthWrite: false }),
    jharokha: M3({ map: jharokhaTex(), roughness: 0.7 }),
    books: M3({ map: booksTex(), roughness: 0.8 }),
    mandirBack: M3({ map: mandirBackTex(), roughness: 0.6, emissive: new THREE.Color('#ffb860'), emissiveMap: mandirBackTex(), emissiveIntensity: 6 }),
    brass: M3({ color: '#c8a04a', metalness: 0.85, roughness: 0.3 }),
    steel: M3({ color: '#d9d9d9', metalness: 0.95, roughness: 0.22 }),
    cream: M3({ color: '#efe3cc' }),
    white: M3({ color: '#f4efe6' }),
    maroonCloth: M3({ color: '#6e1418', roughness: 0.95 }),
    saffronCloth: M3({ color: '#e07a1f', roughness: 0.95 }),
    mustard: M3({ color: '#c9962a', roughness: 0.95 }),
    teal: M3({ color: '#1f5d5e', roughness: 0.95 }),
    tealDark: M3({ color: '#164546', roughness: 0.95 }),
    leaf: M3({ color: '#3d7a32', roughness: 0.85 }),
    leafDark: M3({ color: '#285a24', roughness: 0.85 }),
    terracotta: M3({ color: '#a4532f', roughness: 0.9 }),
    marigold: M3({ color: '#ff9a1a', roughness: 0.75 }),
    marigoldY: M3({ color: '#ffc42a', roughness: 0.75 }),
    stoneBand: M3({ color: '#b9a383', roughness: 0.95 }),
    trim: M3({ color: '#f1e6cf', roughness: 0.8 }),
    flame: new THREE.MeshStandardMaterial({ color: '#000', emissive: new THREE.Color('#ffb347'), emissiveIntensity: 1500 }),
    lampShade: new THREE.MeshStandardMaterial({ color: '#f3e2c2', emissive: new THREE.Color('#ffcf8a'), emissiveIntensity: 220, side: THREE.DoubleSide }),
    fruitO: M3({ color: '#f08a1c', roughness: 0.5 }),
    fruitY: M3({ color: '#f2d03b', roughness: 0.5 }),
    fruitR: M3({ color: '#b3202a', roughness: 0.45 }),
    shoe: M3({ color: '#2a1d16', roughness: 0.6 }),
  };
  return LOCAL;
}

/** box in sketch feet: x range, y(sketch) range, z (height) range */
function B({ x, y, z, m, cast = true }: { x: V; y: V; z: V; m: THREE.Material; cast?: boolean }) {
  return (
    <mesh position={[((x[0] + x[1]) / 2) * FTm, ((z[0] + z[1]) / 2) * FTm, ((y[0] + y[1]) / 2) * FTm]} castShadow={cast} receiveShadow>
      <boxGeometry args={[Math.abs(x[1] - x[0]) * FTm, Math.abs(z[1] - z[0]) * FTm, Math.abs(y[1] - y[0]) * FTm]} />
      <primitive object={m} attach="material" />
    </mesh>
  );
}
function Cyl({ at, z, r, r2, m, seg = 16 }: { at: V; z: V; r: number; r2?: number; m: THREE.Material; seg?: number }) {
  return (
    <mesh position={[at[0] * FTm, ((z[0] + z[1]) / 2) * FTm, at[1] * FTm]} castShadow receiveShadow>
      <cylinderGeometry args={[(r2 ?? r) * FTm, r * FTm, (z[1] - z[0]) * FTm, seg]} />
      <primitive object={m} attach="material" />
    </mesh>
  );
}
function Ball({ at, z, r, m, sy = 1 }: { at: V; z: number; r: number; m: THREE.Material; sy?: number }) {
  return (
    <mesh position={[at[0] * FTm, z * FTm, at[1] * FTm]} scale={[1, sy, 1]} castShadow>
      <sphereGeometry args={[r * FTm, 14, 10]} />
      <primitive object={m} attach="material" />
    </mesh>
  );
}
/** flat plane lying on the floor (sketch frame) */
function FloorPlane({ x, y, z = 0.02, m, ro = 0 }: { x: V; y: V; z?: number; m: THREE.Material; ro?: number }) {
  return (
    <mesh position={[((x[0] + x[1]) / 2) * FTm, z * FTm, ((y[0] + y[1]) / 2) * FTm]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={ro} receiveShadow>
      <planeGeometry args={[(x[1] - x[0]) * FTm, (y[1] - y[0]) * FTm]} />
      <primitive object={m} attach="material" />
    </mesh>
  );
}
/** vertical picture plane: faces 'out' = which sketch direction its front looks */
function WallPlane({ c, w, h, zc, face, m }: { c: V; w: number; h: number; zc: number; face: '+x' | '-x' | '+y' | '-y'; m: THREE.Material }) {
  const ry = face === '+y' ? 0 : face === '-y' ? Math.PI : face === '+x' ? Math.PI / 2 : -Math.PI / 2;
  return (
    <mesh position={[c[0] * FTm, zc * FTm, c[1] * FTm]} rotation={[0, ry, 0]} receiveShadow>
      <planeGeometry args={[w * FTm, h * FTm]} />
      <primitive object={m} attach="material" />
    </mesh>
  );
}

export function HouseDressing({ it }: { it: Item }) {
  const p = P(it);
  const H = houseXY(it);
  // basis: local x = sketch +x, local z = sketch +y, y up (mirror-safe: a mirrored house gets a reflected basis)
  const matrix = useMemo(() => {
    const O = H(0, 0), X = H(1, 0), Y = H(0, 1);
    const ex = new THREE.Vector3(X.x - O.x, 0, -(X.y - O.y)).normalize();
    const ez = new THREE.Vector3(Y.x - O.x, 0, -(Y.y - O.y)).normalize();
    const m = new THREE.Matrix4().makeBasis(ex, new THREE.Vector3(0, 1, 0), ez);
    m.setPosition(W(O.x, O.y, it.z || 0));
    return m;
  }, [it.x, it.y, it.rot, it.z, p.mirror, p.w, p.d]);
  const L = lm();
  const G = mats();
  const Wd = p.w, D = p.d, t = p.wall, h = p.h;
  const [e0, e1] = p.entry as V;
  const [x0, x1] = p.exit as V;
  return (
    <group matrix={matrix} matrixAutoUpdate={false}>
      {/* ——— floors ——— */}
      <FloorPlane x={[t, Wd - t]} y={[t, D - t]} z={0.03} m={L.marble} />
      <FloorPlane x={[e0, e1]} y={[0, t]} z={0.03} m={L.marble} />
      <FloorPlane x={[0, t]} y={[x0, x1]} z={0.03} m={L.marble} />
      <FloorPlane x={[14.2, 21.2]} y={[10.6, 17.6]} z={0.05} m={L.rugLiving} ro={1} />
      <FloorPlane x={[10, 14]} y={[11.6, 15.2]} z={0.05} m={L.rugMandir} ro={1} />
      <FloorPlane x={[2.3, 6.4]} y={[15.8, 20.4]} z={0.05} m={L.rugRead} ro={1} />

      {/* ——— Ghar Mandir (faces +y, into the house) ——— */}
      <group>
        <B x={[9.6, 14.4]} y={[9.8, 11.4]} z={[0, 2.6]} m={G.woodDark} />
        {[10.8, 13.2].map((cx) => <B key={cx} x={[cx - 1.1, cx + 1.1]} y={[11.4, 11.45]} z={[0.3, 2.3]} m={G.wood} cast={false} />)}
        <WallPlane c={[12, 9.92]} w={4} h={2.4} zc={3.8} face="+y" m={L.mandirBack} />
        {[[9.85, 9.95], [14.15, 9.95], [9.85, 11.2], [14.15, 11.2]].map(([cx, cy], k) => <Cyl key={k} at={[cx, cy]} z={[2.6, 5.0]} r={0.14} m={G.gold} />)}
        <B x={[9.5, 14.5]} y={[9.75, 11.45]} z={[5.0, 5.35]} m={G.woodDark} />
        <B x={[9.7, 14.3]} y={[11.2, 11.5]} z={[4.7, 5.0]} m={G.gold} cast={false} />
        {[10.6, 12, 13.4].map((cx, k) => <Shikhar key={k} at={[cx, 10.6]} z={5.35} r={k === 1 ? 0.62 : 0.46} h={k === 1 ? 1.25 : 0.9} m={G.gold} />)}
        {[11, 12, 13].map((cx, k) => (
          <group key={k}>
            <Cyl at={[cx, 10.4]} z={[2.6, 2.85]} r={0.28} m={G.gold} />
            <Cyl at={[cx, 10.4]} z={[2.85, 3.75]} r={0.2} r2={0.12} m={k === 1 ? L.saffronCloth : L.maroonCloth} />
            <Ball at={[cx, 10.4]} z={3.95} r={0.16} m={G.gold} />
          </group>
        ))}
        {[10.4, 13.6].map((cx) => (
          <group key={cx}>
            <Cyl at={[cx, 11.1]} z={[2.6, 2.72]} r={0.1} r2={0.13} m={L.terracotta} />
            <Ball at={[cx, 11.1]} z={2.82} r={0.035} m={L.flame} sy={1.6} />
          </group>
        ))}
        {/* marigold swag across the mandir front */}
        {Array.from({ length: 22 }, (_, k) => {
          const u = k / 21;
          return <Ball key={k} at={[9.8 + u * 4.4, 11.5]} z={4.7 - Math.sin(u * Math.PI) * 0.5} r={0.09} m={k % 2 ? L.marigold : L.marigoldY} />;
        })}
      </group>

      {/* ——— puja table with arti thali ——— */}
      <B x={[10.5, 13.2]} y={[12.6, 14.2]} z={[2.3, 2.5]} m={G.wood} />
      {[[10.65, 12.75], [13.05, 12.75], [10.65, 14.05], [13.05, 14.05]].map(([a, b], k) => <B key={k} x={[a - 0.07, a + 0.07]} y={[b - 0.07, b + 0.07]} z={[0, 2.3]} m={G.wood} />)}
      <B x={[10.4, 13.3]} y={[12.5, 14.3]} z={[2.5, 2.52]} m={L.saffronCloth} cast={false} />
      <Cyl at={[11.85, 13.4]} z={[2.52, 2.58]} r={0.55} m={L.brass} seg={24} />
      <Cyl at={[11.85, 13.4]} z={[2.58, 2.66]} r={0.08} r2={0.12} m={L.brass} />
      <Ball at={[11.85, 13.4]} z={2.72} r={0.03} m={L.flame} sy={1.6} />
      <Ball at={[12.75, 13.3]} z={2.78} r={0.2} m={L.brass} />
      {[0, 1, 2, 3, 4].map((k) => <Ball key={k} at={[11.3 + k * 0.12, 13.05]} z={2.6} r={0.07} m={k % 2 ? L.marigold : L.marigoldY} />)}

      {/* ——— foyer: shoe rack, tulsi vrindavans ——— */}
      <B x={[13.6, 15.6]} y={[2.2, 3.2]} z={[0, 3]} m={G.wood} />
      {[0.9, 1.9].map((zz) => <B key={zz} x={[13.65, 15.55]} y={[3.2, 3.22]} z={[zz, zz + 0.06]} m={G.woodDark} cast={false} />)}
      {[13.9, 14.4, 14.9, 15.3].map((sx, k) => <B key={k} x={[sx - 0.15, sx + 0.15]} y={[2.5, 3.15]} z={[k % 2 ? 1.96 : 0.96, (k % 2 ? 1.96 : 0.96) + 0.3]} m={L.shoe} />)}
      {[3.6, 5.2, 6.8].map((sy) => (
        <group key={sy}>
          <B x={[8.5, 9.5]} y={[sy - 0.5, sy + 0.5]} z={[0, 2.0]} m={L.terracotta} />
          <B x={[8.4, 9.6]} y={[sy - 0.6, sy + 0.6]} z={[2.0, 2.2]} m={L.cream} />
          {[[0, 0, 2.6, 0.32], [0.18, 0.12, 2.85, 0.24], [-0.15, -0.1, 2.9, 0.22], [0.05, -0.18, 3.1, 0.18]].map(([dx, dy, zz, r], k) => <Ball key={k} at={[9 + dx, sy + dy]} z={zz} r={r} m={k % 2 ? L.leaf : L.leafDark} />)}
        </group>
      ))}

      {/* ——— living room: sofa, side table + lamp, baithak with harmonium & tabla ——— */}
      <group>
        <B x={[18.6, 21.5]} y={[10.3, 17.1]} z={[0.35, 1.45]} m={G.couchTeal} />
        <B x={[20.85, 21.55]} y={[10.3, 17.1]} z={[1.45, 2.85]} m={L.tealDark} />
        <B x={[18.5, 21.6]} y={[10.2, 10.75]} z={[0.35, 2.15]} m={L.tealDark} />
        <B x={[18.5, 21.6]} y={[16.65, 17.2]} z={[0.35, 2.15]} m={L.tealDark} />
        {[[18.65, 10.35], [21.45, 10.35], [18.65, 17.05], [21.45, 17.05]].map(([a, b], k) => <B key={k} x={[a - 0.08, a + 0.08]} y={[b - 0.08, b + 0.08]} z={[0, 0.35]} m={G.woodDark} />)}
        {[11.9, 13.7, 15.5].map((sy, k) => <B key={sy} x={[20.35, 20.85]} y={[sy - 0.75, sy + 0.75]} z={[1.45, 2.55]} m={k === 1 ? L.mustard : L.maroonCloth} />)}
      </group>
      <B x={[19, 21]} y={[7.8, 9.3]} z={[2.05, 2.2]} m={G.wood} />
      {[[19.1, 7.9], [20.9, 7.9], [19.1, 9.2], [20.9, 9.2]].map(([a, b], k) => <B key={k} x={[a - 0.05, a + 0.05]} y={[b - 0.05, b + 0.05]} z={[0, 2.05]} m={G.wood} />)}
      <Cyl at={[20, 8.5]} z={[2.2, 2.75]} r={0.18} r2={0.08} m={L.brass} />
      <mesh position={[20 * FTm, 3.0 * FTm, 8.5 * FTm]}>
        <cylinderGeometry args={[0.3 * FTm, 0.45 * FTm, 0.55 * FTm, 20, 1, true]} />
        <primitive object={L.lampShade} attach="material" />
      </mesh>
      <B x={[14.8, 17]} y={[13, 16.6]} z={[0, 0.9]} m={L.maroonCloth} />
      <B x={[14.75, 17.05]} y={[12.95, 16.65]} z={[0.9, 1.0]} m={L.white} />
      {[13.3, 16.3].map((sy) => (
        <mesh key={sy} position={[16.6 * FTm, 1.25 * FTm, sy * FTm]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.25 * FTm, 0.25 * FTm, 0.6 * FTm, 14]} />
          <primitive object={L.cream} attach="material" />
        </mesh>
      ))}
      <B x={[15.2, 16.2]} y={[14.1, 15.6]} z={[1.0, 1.65]} m={G.woodDark} />
      <B x={[15.25, 15.55]} y={[14.2, 15.5]} z={[1.65, 1.68]} m={L.white} cast={false} />
      <Cyl at={[15.6, 13.55]} z={[1.0, 1.85]} r={0.24} r2={0.2} m={G.wood} />
      <Cyl at={[16.05, 13.6]} z={[1.0, 1.75]} r={0.3} r2={0.33} m={L.steel} />
      <Cyl at={[15.6, 13.55]} z={[1.85, 1.87]} r={0.2} m={G.black} />

      {/* ——— kitchen: cabinet, granite top, steel thaalis, fruit, grain jars, utensil shelf ——— */}
      <B x={[8, 15]} y={[19.95, 21.9]} z={[0, 2.85]} m={L.cream} />
      {[9.1, 10.9, 12.7, 14.3].map((sx) => <B key={sx} x={[sx - 0.8, sx + 0.8]} y={[19.92, 19.95]} z={[0.3, 2.6]} m={G.wood} cast={false} />)}
      <B x={[7.9, 15.1]} y={[19.85, 21.95]} z={[2.85, 3.0]} m={G.granite} />
      {[9.0, 10.2, 11.4].map((sx) => <Cyl key={sx} at={[sx, 20.6]} z={[3.0, 3.05]} r={0.48} m={L.steel} seg={24} />)}
      {[[12.6, 20.7, L.fruitO], [12.85, 20.95, L.fruitY], [12.4, 21.0, L.fruitR], [12.7, 21.2, L.fruitO]].map(([a, b, m], k) => <Ball key={k} at={[a as number, b as number]} z={3.15} r={0.14} m={m as THREE.Material} />)}
      {[13.6, 14.0, 14.4].map((sx, k) => <Cyl key={sx} at={[sx, 21.3]} z={[3.0, 3.75]} r={0.16} m={k === 1 ? L.brass : L.steel} />)}
      <B x={[8.4, 14.6]} y={[21.3, 21.95]} z={[5.0, 5.1]} m={G.wood} />
      {[8.9, 9.6, 10.3, 11, 11.7, 12.4, 13.1, 13.8].map((sx, k) => <Cyl key={sx} at={[sx, 21.6]} z={[5.1, 5.1 + (k % 3 ? 0.45 : 0.7)]} r={k % 2 ? 0.2 : 0.16} m={k % 4 === 1 ? L.brass : L.steel} />)}

      {/* ——— seva corner ——— */}
      <B x={[18, 21.6]} y={[19.6, 21.6]} z={[2.35, 2.5]} m={G.wood} />
      <B x={[17.95, 21.65]} y={[19.55, 21.65]} z={[0.6, 2.5]} m={L.saffronCloth} />
      <B x={[18.4, 19.4]} y={[20.2, 21.0]} z={[2.5, 3.4]} m={G.woodDark} />
      {[0, 1, 2, 3].map((k) => <B key={k} x={[19.9, 21.2]} y={[20.0, 21.1]} z={[2.5 + k * 0.14, 2.62 + k * 0.14]} m={[L.cream, L.maroonCloth, L.mustard, L.teal][k]} />)}

      {/* ——— reading corner: bookshelf, beanbag, standing lamp ——— */}
      <B x={[2.05, 3.2]} y={[12, 15.6]} z={[0, 6]} m={G.woodDark} />
      <WallPlane c={[3.21, 13.8]} w={3.4} h={5.6} zc={3.0} face="+x" m={L.books} />
      <Ball at={[4.3, 17.7]} z={0.7} r={1.15} m={L.mustard} sy={0.62} />
      <group>
        <Cyl at={[2.7, 21.2]} z={[0, 0.08]} r={0.45} m={G.black} />
        <Cyl at={[2.7, 21.2]} z={[0.08, 5.0]} r={0.04} m={G.black} />
        <mesh position={[2.7 * FTm, 5.25 * FTm, 21.2 * FTm]}>
          <cylinderGeometry args={[0.42 * FTm, 0.65 * FTm, 0.85 * FTm, 20, 1, true]} />
          <primitive object={L.lampShade} attach="material" />
        </mesh>
      </group>

      {/* ——— exterior: plinth band, cornice, door frame, toran, rangoli, diyas, potted plants, jharokha windows ——— */}
      <B x={[-0.12, Wd + 0.12]} y={[-0.12, 0.05]} z={[0, 0.6]} m={L.stoneBand} />
      <B x={[-0.12, Wd + 0.12]} y={[D - 0.05, D + 0.12]} z={[0, 0.6]} m={L.stoneBand} />
      <B x={[-0.12, 0.05]} y={[-0.12, D + 0.12]} z={[0, 0.6]} m={L.stoneBand} />
      <B x={[Wd - 0.05, Wd + 0.12]} y={[-0.12, D + 0.12]} z={[0, 0.6]} m={L.stoneBand} />
      <B x={[-0.2, Wd + 0.2]} y={[-0.2, 0.05]} z={[h - 0.45, h]} m={L.trim} />
      <B x={[-0.2, Wd + 0.2]} y={[D - 0.05, D + 0.2]} z={[h - 0.45, h]} m={L.trim} />
      <B x={[-0.2, 0.05]} y={[-0.2, D + 0.2]} z={[h - 0.45, h]} m={L.trim} />
      <B x={[Wd - 0.05, Wd + 0.2]} y={[-0.2, D + 0.2]} z={[h - 0.45, h]} m={L.trim} />
      {/* blank masked elements stop at the openings visually; door frame */}
      {[e0, e1].map((sx, k) => <B key={k} x={[sx + (k ? -0.35 : 0), sx + (k ? 0 : 0.35)]} y={[-0.15, t]} z={[0, h - 1.1]} m={G.woodDark} />)}
      <B x={[e0 - 0.4, e1 + 0.4]} y={[-0.25, 0]} z={[h - 1.35, h - 1.05]} m={G.woodDark} />
      {/* toran: marigold strands + mango leaves */}
      {Array.from({ length: 9 }, (_, k) => {
        const sx = e0 + 0.2 + (k * (e1 - e0 - 0.4)) / 8;
        const len = 0.5 + (k % 2) * 0.35;
        return (
          <group key={k}>
            {Array.from({ length: Math.round(len / 0.13) }, (_, q) => <Ball key={q} at={[sx, -0.3]} z={h - 1.4 - q * 0.13} r={0.07} m={q % 2 ? L.marigoldY : L.marigold} />)}
            <mesh position={[(sx + 0.17) * FTm, (h - 1.55) * FTm, -0.3 * FTm]} rotation={[0, 0, 0.3]}>
              <planeGeometry args={[0.12 * FTm, 0.38 * FTm]} />
              <meshStandardMaterial color="#3f7d2c" side={THREE.DoubleSide} roughness={0.7} />
            </mesh>
          </group>
        );
      })}
      <FloorPlane x={[(e0 + e1) / 2 - 2.3, (e0 + e1) / 2 + 2.3]} y={[-4.9, -0.3]} z={0.035} m={L.rangoli} ro={2} />
      {[e0 - 0.7, e1 + 0.7].map((sx) => (
        <group key={sx}>
          <Cyl at={[sx, -0.9]} z={[0, 1.6]} r={0.45} r2={0.6} m={L.terracotta} />
          {[0, 1, 2, 3, 4].map((k) => (
            <mesh key={k} position={[sx * FTm, 2.5 * FTm, -0.9 * FTm]} rotation={[0.5 + (k % 2) * 0.3, (k * Math.PI * 2) / 5, 0]} castShadow>
              <planeGeometry args={[0.55 * FTm, 2.2 * FTm]} />
              <meshStandardMaterial color={k % 2 ? '#3d7a32' : '#4f9440'} side={THREE.DoubleSide} roughness={0.75} />
            </mesh>
          ))}
          <Cyl at={[sx + (sx < e0 ? 0.9 : -0.9), -1.2]} z={[0, 0.12]} r={0.1} r2={0.14} m={L.terracotta} />
          <Ball at={[sx + (sx < e0 ? 0.9 : -0.9), -1.2]} z={0.22} r={0.035} m={L.flame} sy={1.6} />
        </group>
      ))}
      {[[4.6, '-y'], [19.4, '-y']].map(([sx, f]) => <Window key={String(sx)} c={[sx as number, -0.02]} face={f as '-y'} m={L.jharokha} sill={G.woodDark} />)}
      {[[6, '+y'], [18, '+y']].map(([sx, f]) => <Window key={String(sx)} c={[sx as number, D + 0.02]} face={f as '+y'} m={L.jharokha} sill={G.woodDark} />)}
      {[[8, '+x'], [17, '+x']].map(([sy, f]) => <Window key={String(sy)} c={[Wd + 0.02, sy as number]} face={f as '+x'} m={L.jharokha} sill={G.woodDark} />)}
      {[[10, '-x'], [19, '-x']].map(([sy, f]) => <Window key={String(sy)} c={[-0.02, sy as number]} face={f as '-x'} m={L.jharokha} sill={G.woodDark} />)}
    </group>
  );
}

function Window({ c, face, m, sill }: { c: V; face: '+x' | '-x' | '+y' | '-y'; m: THREE.Material; sill: THREE.Material }) {
  const n: V = face === '+x' ? [1, 0] : face === '-x' ? [-1, 0] : face === '+y' ? [0, 1] : [0, -1];
  const along = n[0] === 0;
  const sx: V = along ? [c[0] - 1.4, c[0] + 1.4] : [c[0], c[0] + n[0] * 0.35].sort((a, b) => a - b) as V;
  const sy: V = along ? [c[1], c[1] + n[1] * 0.35].sort((a, b) => a - b) as V : [c[1] - 1.4, c[1] + 1.4];
  return (
    <>
      <WallPlane c={c} w={2.4} h={3.6} zc={4.6} face={face} m={m} />
      <B x={sx} y={sy} z={[2.65, 2.85]} m={sill} />
    </>
  );
}

/** Temple spire: curved nagara-style shikhara with amalaka ring and kalash finial */
function Shikhar({ at, z, r, h, m }: { at: V; z: number; r: number; h: number; m: THREE.Material }) {
  const geo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      pts.push(new THREE.Vector2(r * (1 - Math.pow(t, 1.6)) * (1 + 0.06 * Math.sin(t * 40)) * FTm, t * h * 0.82 * FTm));
    }
    pts.push(new THREE.Vector2(r * 0.32 * FTm, h * 0.84 * FTm), new THREE.Vector2(r * 0.12 * FTm, h * 0.9 * FTm), new THREE.Vector2(r * 0.18 * FTm, h * 0.95 * FTm), new THREE.Vector2(0, h * FTm));
    return new THREE.LatheGeometry(pts, 16);
  }, [r, h]);
  return (
    <mesh geometry={geo} position={[at[0] * FTm, z * FTm, at[1] * FTm]} castShadow>
      <primitive object={m} attach="material" />
    </mesh>
  );
}
