'use client';
// Geometry helpers for the campus model: polygons/segments in hall feet -> merged three.js geometry in metres (Y up).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PolyJ } from '@/lib/campus';
import { FTm } from './materials';

/** hall feet (x east, y north, z up) -> three metres (X east, Y up, Z south): a proper rotation, so winding is kept */
const TO_WORLD = new THREE.Matrix4().set(FTm, 0, 0, 0, 0, 0, FTm, 0, 0, -FTm, 0, 0, 0, 0, 0, 1);

function shapeOf(p: PolyJ) {
  const s = new THREE.Shape(p.o.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const h of p.h) s.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
  return s;
}
function mergeRaw(gs: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (!gs.length) return null;
  const flat = gs.map((g) => (g.index ? g.toNonIndexed() : g));
  for (const f of flat) {
    // keep only the attributes every geometry shares
    for (const k of Object.keys(f.attributes)) if (!['position', 'normal', 'uv'].includes(k)) f.deleteAttribute(k);
  }
  const m = mergeGeometries(flat, false);
  gs.forEach((g) => g.dispose());
  return m;
}

/** Extrude polygons (feet) up by `depth` feet starting at z0 */
export function extrude(polys: PolyJ[], depth: number | ((p: PolyJ) => number), z0 = 0): THREE.BufferGeometry | null {
  const gs: THREE.BufferGeometry[] = [];
  for (const p of polys) {
    try {
      const d = typeof depth === 'number' ? depth : depth(p);
      const g = new THREE.ExtrudeGeometry(shapeOf(p), { depth: d, bevelEnabled: false, steps: 1 });
      if (z0) g.translate(0, 0, z0);
      gs.push(g);
    } catch {
      /* skip a degenerate polygon */
    }
  }
  const m = mergeRaw(gs);
  return m ? m.applyMatrix4(TO_WORLD) : null;
}

/** Flat polygons at height z (feet), facing up */
export function flat(polys: PolyJ[], z = 0): THREE.BufferGeometry | null {
  const gs: THREE.BufferGeometry[] = [];
  for (const p of polys) {
    try {
      const g = new THREE.ShapeGeometry(shapeOf(p));
      g.translate(0, 0, z);
      gs.push(g);
    } catch {
      /* skip */
    }
  }
  const m = mergeRaw(gs);
  return m ? m.applyMatrix4(TO_WORLD) : null;
}

/** Thin boxes along segments [x0,y0,x1,y1] (feet), width w, from z0 to z1 */
export function boxes(segs: number[][], w: number, z0: number, z1: number): THREE.BufferGeometry | null {
  const gs: THREE.BufferGeometry[] = [];
  for (const [x0, y0, x1, y1] of segs) {
    const L = Math.hypot(x1 - x0, y1 - y0);
    if (L < 0.05) continue;
    const g = new THREE.BoxGeometry(L * FTm, (z1 - z0) * FTm, w * FTm);
    g.rotateY(Math.atan2(y1 - y0, x1 - x0));
    g.translate(((x0 + x1) / 2) * FTm, ((z0 + z1) / 2) * FTm, (-(y0 + y1) / 2) * FTm);
    gs.push(g);
  }
  return mergeRaw(gs);
}

/** Axis-free box at a point with a yaw (deg CCW plan) — world-space geometry for merging */
export function boxAt(x: number, y: number, z: number, sx: number, sy: number, sz: number, yawDeg = 0): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(sx * FTm, sz * FTm, sy * FTm);
  g.rotateY((yawDeg * Math.PI) / 180);
  g.translate(x * FTm, z * FTm, -y * FTm);
  return g;
}
export const merge = mergeRaw;

/** seeded PRNG */
export function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export function pointInPoly(x: number, y: number, ring: number[][]) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
export const inPolyJ = (x: number, y: number, p: PolyJ) => pointInPoly(x, y, p.o) && !p.h.some((h) => pointInPoly(x, y, h));

/** catenary-ish swag between two 3D points (feet): n+1 points with `sag` feet of droop */
export function swag(a: [number, number, number], b: [number, number, number], sag: number, n: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - sag * 4 * t * (1 - t)]);
  }
  return out;
}
