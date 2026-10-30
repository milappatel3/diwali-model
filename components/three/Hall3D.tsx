'use client';
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { HALL, OPENINGS } from '@/lib/hall';
import { mats, W, FTm } from './materials';
import { exitTex } from './textures';

/** The Assembly Hall shell from the DWG: walls with real door/glazing openings, stage, ceiling, foyer. */
export default function Hall3D({ ceilingFt, stageFt, houseLevel, houseRows, houseCols }: { ceilingFt: number; stageFt: number; houseLevel: number; houseRows: number; houseCols: number }) {
  const M = mats();
  const C = ceilingFt;
  const T = 0.6; // wall thickness ft
  const walls = useMemo(() => {
    const out: { x0: number; y0: number; x1: number; y1: number; z0: number; z1: number; mat?: THREE.Material; kind?: string }[] = [];
    // south & north walls with door openings (doors 8' tall)
    for (const wall of ['S', 'N'] as const) {
      const ops = OPENINGS.filter((o) => o.wall === wall).sort((a, b) => a.a - b.a);
      const y0 = wall === 'S' ? -T : HALL.D, y1 = wall === 'S' ? 0 : HALL.D + T;
      const xEnd = wall === 'S' ? 125.08 : 124.42;
      let x = -T;
      for (const o of ops) {
        out.push({ x0: x, x1: o.a, y0, y1, z0: 0, z1: C });
        out.push({ x0: o.a, x1: o.b, y0, y1, z0: 8, z1: C });
        x = o.b;
      }
      out.push({ x0: x, x1: xEnd, y0, y1, z0: 0, z1: C });
    }
    // west wall: main opening (10' tall, open to foyer) + storefront glazing
    const wOps = OPENINGS.filter((o) => o.wall === 'W').sort((a, b) => a.a - b.a);
    let y = 0;
    for (const o of wOps) {
      out.push({ x0: -T, x1: 0, y0: y, y1: o.a, z0: 0, z1: C });
      out.push({ x0: -T, x1: 0, y0: o.a, y1: o.b, z0: o.kind === 'opening' ? 10 : 9, z1: C });
      if (o.kind === 'glazing') out.push({ x0: -T * 0.5, x1: -T * 0.3, y0: o.a, y1: o.b, z0: 0, z1: 9, kind: 'glass' });
      y = o.b;
    }
    out.push({ x0: -T, x1: 0, y0: y, y1: HALL.D, z0: 0, z1: C });
    // stage back wall & side rooms
    out.push({ x0: HALL.stage.x1, x1: HALL.stage.x1 + T, y0: 0, y1: HALL.D, z0: 0, z1: C });
    for (const r of HALL.stageRooms) out.push({ x0: r.x0, x1: r.x1, y0: r.y0, y1: r.y1, z0: 0, z1: C });
    return out;
  }, [C]);

  const doors = OPENINGS.filter((o) => o.kind === 'door' || o.kind === 'door-pair');
  const exitMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: exitTex(), emissiveIntensity: 180 }), []);
  const pend = useMemo(() => {
    const out: THREE.Vector3[] = [];
    for (let r = 0; r < houseRows; r++) for (let c = 0; c < houseCols; c++) out.push(W(((c + 0.5) * HALL.W) / houseCols, ((r + 0.5) * HALL.D) / houseRows, C - 0.9));
    return out;
  }, [houseRows, houseCols, C]);

  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={W(80, 47.6, 0)} receiveShadow>
        <planeGeometry args={[162 * FTm, 96 * FTm]} />
        <primitive object={M.carpet} attach="material" />
      </mesh>
      {/* foyer */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={W(-22, 47.6, 0)} receiveShadow>
        <planeGeometry args={[44 * FTm, 70 * FTm]} />
        <primitive object={M.tile} attach="material" />
      </mesh>
      <mesh position={W(-44, 47.6, 6)}>
        <boxGeometry args={[0.2, 12 * FTm, 70 * FTm]} />
        <primitive object={M.wall} attach="material" />
      </mesh>
      <mesh position={W(-22, 47.6, 12)} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[44 * FTm, 70 * FTm]} />
        <primitive object={M.ceiling} attach="material" />
      </mesh>
      {/* ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={W(80, 47.6, C)}>
        <planeGeometry args={[162 * FTm, 97 * FTm]} />
        <primitive object={M.ceiling} attach="material" />
      </mesh>
      {walls.map((w, k) => (
        <mesh key={k} position={W((w.x0 + w.x1) / 2, (w.y0 + w.y1) / 2, (w.z0 + w.z1) / 2)} receiveShadow castShadow={w.kind !== 'glass'}>
          <boxGeometry args={[Math.abs(w.x1 - w.x0) * FTm, (w.z1 - w.z0) * FTm, Math.abs(w.y1 - w.y0) * FTm]} />
          <primitive object={w.kind === 'glass' ? M.glass : M.wall} attach="material" />
        </mesh>
      ))}
      {/* doors (closed leaves) + exit signs */}
      {doors.map((o) => {
        const y = o.wall === 'S' ? -0.25 : HALL.D + 0.25;
        const cx = (o.a + o.b) / 2;
        return (
          <group key={o.id}>
            <mesh position={W(cx, y, 4)}>
              <boxGeometry args={[(o.b - o.a - 0.15) * FTm, 8 * FTm, 0.1]} />
              <primitive object={M.door} attach="material" />
            </mesh>
            {o.kind === 'door-pair' && (
              <mesh position={W(cx, o.wall === 'S' ? -0.1 : HALL.D + 0.1, 4)}>
                <boxGeometry args={[0.02, 8 * FTm, 0.12]} />
                <meshStandardMaterial color="#222" />
              </mesh>
            )}
            <mesh position={W(cx, o.wall === 'S' ? 0.06 : HALL.D - 0.06, 3.5)}>
              <boxGeometry args={[(o.b - o.a - 0.8) * FTm, 0.035, 0.04]} />
              <primitive object={M.chrome} attach="material" />
            </mesh>
            {o.exit && (
              <mesh position={W(cx, o.wall === 'S' ? 0.12 : HALL.D - 0.12, 8.7)} rotation={[0, o.wall === 'S' ? 0 : Math.PI, 0]}>
                <planeGeometry args={[1.2 * FTm, 0.45 * FTm]} />
                <primitive object={exitMat} attach="material" />
              </mesh>
            )}
          </group>
        );
      })}
      {/* stage deck + fascia + stairs */}
      <mesh position={W((HALL.stage.x0 + HALL.stage.x1) / 2, (HALL.stage.y0 + HALL.stage.y1) / 2, stageFt / 2)} receiveShadow castShadow>
        <boxGeometry args={[(HALL.stage.x1 - HALL.stage.x0) * FTm, stageFt * FTm, (HALL.stage.y1 - HALL.stage.y0) * FTm]} />
        <primitive object={M.stageDeck} attach="material" />
      </mesh>
      {HALL.stage.stairs.map((s, k) =>
        [...Array(6)].map((_, i) => {
          const f = (i + 1) / 6;
          const yy = s.dir === 'n' ? s.y0 + (i / 6) * (s.y1 - s.y0) : s.y1 - (i / 6) * (s.y1 - s.y0);
          const depth = (s.y1 - s.y0) / 6;
          return (
            <mesh key={`${k}-${i}`} position={W((s.x0 + s.x1) / 2, yy + (s.dir === 'n' ? depth / 2 : -depth / 2), (stageFt * f) / 2)} receiveShadow>
              <boxGeometry args={[(s.x1 - s.x0) * FTm, stageFt * f * FTm, depth * FTm]} />
              <primitive object={M.stageDeck} attach="material" />
            </mesh>
          );
        }),
      )}
      {/* house-light pendants (LED high-bays) */}
      {pend.map((p, k) => (
        <group key={k} position={p}>
          <mesh>
            <cylinderGeometry args={[0.2, 0.26, 0.18, 24]} />
            <meshStandardMaterial color="#9a9a9a" metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh position={[0, -0.095, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.24, 24]} />
            <meshStandardMaterial color="#000" emissive="#fff7ea" emissiveIntensity={Math.max(0.02, houseLevel) * 3500} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, (C * FTm - p.y) / 2 + 0.09, 0]}>
            <cylinderGeometry args={[0.004, 0.004, Math.max(0.01, C * FTm - p.y - 0.18), 4]} />
            <meshStandardMaterial color="#333" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
