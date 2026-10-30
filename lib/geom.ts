import type { V2, V3 } from './types';

export const FT = 0.3048;
export const DEG = Math.PI / 180;
export const v3 = (x = 0, y = 0, z = 0): V3 => ({ x, y, z });
export const add = (a: V3, b: V3): V3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const sub = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const mul = (a: V3, k: number): V3 => ({ x: a.x * k, y: a.y * k, z: a.z * k });
export const dot = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: V3, b: V3): V3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
export const len = (a: V3) => Math.hypot(a.x, a.y, a.z);
export const norm = (a: V3): V3 => {
  const l = len(a) || 1;
  return { x: a.x / l, y: a.y / l, z: a.z / l };
};
export const dist2 = (a: V2, b: V2) => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Facing unit vector for rot (deg CCW from +x) */
export const facing = (rotDeg: number): V2 => ({ x: Math.cos(rotDeg * DEG), y: Math.sin(rotDeg * DEG) });

/**
 * Local item frame: u = width axis (to the right when standing IN FRONT looking at the item... we define
 * u = facing rotated -90°), v = toward the front. World = origin + u*U + v*F.
 */
export function frame(rotDeg: number) {
  const F = facing(rotDeg);
  const U = { x: F.y, y: -F.x }; // facing rotated -90°
  return { F, U };
}

export function local(ox: number, oy: number, rotDeg: number, u: number, v: number): V2 {
  const { F, U } = frame(rotDeg);
  return { x: ox + U.x * u + F.x * v, y: oy + U.y * u + F.y * v };
}

/** yaw (deg CCW) of the local u-axis for a given item rot — used for oriented boxes whose sx is along u */
export const uYaw = (rotDeg: number) => rotDeg - 90;

export function rotPt(p: V2, deg: number): V2 {
  const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

export function polyArea(pts: V2[]) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

export function pointInPoly(p: V2, poly: V2[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export function polylineLength(pts: V2[]) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += dist2(pts[i - 1], pts[i]);
  return L;
}

export function fmtFt(ft: number) {
  const sign = ft < 0 ? '-' : '';
  ft = Math.abs(ft);
  let f = Math.floor(ft);
  let inch = Math.round((ft - f) * 12);
  if (inch === 12) {
    f += 1;
    inch = 0;
  }
  return `${sign}${f}′${inch ? ` ${inch}″` : ''}`;
}

export const uid = (p = 'it') => `${p}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;

/** Kelvin -> linear RGB (approx, Tanner Helland fit, normalized) */
export function kelvinRGB(k: number): [number, number, number] {
  const t = k / 100;
  let r, g, b;
  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = 255;
  }
  const c = (x: number) => Math.pow(clamp(x, 0, 255) / 255, 2.2);
  const R = c(r), G = c(g), B = c(b);
  const m = Math.max(R, G, B) || 1;
  return [R / m, G / m, B / m];
}

/** Rough CCT from linear RGB (McCamy via XYZ) */
export function rgbToCCT(rgb: [number, number, number]) {
  const [r, g, b] = rgb;
  const X = 0.4124 * r + 0.3576 * g + 0.1805 * b;
  const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const Z = 0.0193 * r + 0.1192 * g + 0.9505 * b;
  const s = X + Y + Z;
  if (s <= 0) return 0;
  const x = X / s, y = Y / s;
  const n = (x - 0.332) / (0.1858 - y);
  const cct = 449 * n ** 3 + 3525 * n ** 2 + 6823.3 * n + 5520.33;
  return clamp(cct, 1000, 20000);
}

/** chromaticity distance from the Planckian locus — large => tinted (green/magenta/blue/red) light */
export function tintAmount(rgb: [number, number, number]) {
  const cct = rgbToCCT(rgb);
  const ref = kelvinRGB(cct);
  const m = Math.max(...rgb) || 1;
  const n = rgb.map((v) => v / m);
  return Math.hypot(n[0] - ref[0], n[1] - ref[1], n[2] - ref[2]);
}
