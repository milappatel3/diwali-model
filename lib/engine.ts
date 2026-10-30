// Photometric engine — pure TypeScript, runs in a Web Worker.
// Direct illuminance from every source with ray-cast shadows against every solid, plus
//  • sheer-fabric ceilings: part of the light passes straight through (τ_direct) and part is re-emitted
//    as a diffuse glowing panel (τ_diffuse) — modelled as Lambertian patch sources;
//  • inter-reflection: flux leaving each source is traced to its first hit; reflected flux is spread
//    over the enclosing zone with the classic room-cavity formula E_ind = Φ_r / (A·(1−ρ̄)).
// Units inside: metres, candela, lux. Outputs plan grids in feet.
import type { Emitter, Item, Project, Solid, Surface, V2, V3 } from './types';
import { FT, DEG, kelvinRGB, rgbToCCT, pointInPoly, tintAmount } from './geom';
import { itemEmitters, itemSolids, itemSurfaces, TYPES, absPts, houseXY, params as itemParams } from './catalog';
import { mixMetrics, resolveModel } from './fixtures';
import { fixtureAim, fixtureWorld } from './rig';
import { FLOOR_POLY, HALL, ROOM_POLY } from './hall';

export const MAT_RHO: Record<string, number> = {
  drapeBlack: 0.03, drapeIvory: 0.62, drapeMaroon: 0.1, plywood: 0.45, mdf: 0.5, mdfPainted: 0.75, wood: 0.32, woodDark: 0.15,
  drywall: 0.8, fabricSheer: 0.3, poster: 0.65, banner: 0.55, metal: 0.4, chrome: 0.5, black: 0.04, mirror: 0.85, glass: 0.08,
  carpet: 0.15, plant: 0.12, cushion: 0.3, gold: 0.5, screen: 0.05, stone: 0.5, acrylic: 0.08, paper: 0.8, white: 0.85,
  paintOchre: 0.4, paintPeach: 0.55, paintSaffron: 0.5, paintSage: 0.42, paintCream: 0.68, couchTeal: 0.12, granite: 0.18, terracotta: 0.25,
};
export const FLOOR_RHO = { carpet: 0.15, vinyl: 0.35, concrete: 0.3 } as const;

// ——— scene ———
export interface Src {
  id: string;
  ref: string; // fixture item id / emitter id
  name: string;
  kind: 'fixture' | 'house' | 'emitter' | 'fabric';
  p: [number, number, number];
  d: [number, number, number];
  I0: number; // cd
  prof: 0 | 1 | 2 | 3; // 0 gauss, 1 flat (soft edge), 2 lambert, 3 isotropic
  a: number; // gauss: 1/(2σ²); flat: half-beam rad
  b: number; // flat: half-field rad ; others: cutoff rad
  cut: number; // cos(cutoff)
  rgb: [number, number, number];
  cri: number;
  cct: number;
  lm: number;
  uv: number; // W/sr (UV-A) on axis
  watts: number;
  model?: string;
}
export interface Occ {
  cx: number; cy: number; cz: number; hx: number; hy: number; hz: number; c: number; s: number; tau: number; rho: number; zone: number;
  minx: number; maxx: number; miny: number; maxy: number; minz: number; maxz: number; fabric: boolean; label: string; itemId: string;
}
export interface Zone {
  id: string; name: string; poly: { x: number; y: number }[]; area: number; rho: number; // m2 total surface, avg reflectance
}
export interface Scene {
  srcs: Src[];
  occ: Occ[];
  zones: Zone[];
  surfaces: Surface[];
  ceilingM: number;
  floorRho: number;
  wallRho: number;
  ceilRho: number;
  faceM: number;
  stageM: number;
  bounce: boolean;
  bbox: { x0: number; y0: number; x1: number; y1: number }; // ft
  gridFt: number;
  probes: Project['probes'];
}

function occFromSolid(s: Solid, itemId: string, zone: number): Occ {
  const yaw = s.yaw * DEG, c = Math.cos(yaw), sn = Math.sin(yaw);
  const cx = s.c.x * FT, cy = s.c.y * FT, cz = s.c.z * FT, hx = (s.s.x * FT) / 2, hy = (s.s.y * FT) / 2, hz = (s.s.z * FT) / 2;
  const ex = Math.abs(c) * hx + Math.abs(sn) * hy, ey = Math.abs(sn) * hx + Math.abs(c) * hy;
  return {
    cx, cy, cz, hx, hy, hz, c, s: sn, tau: s.tau ?? 0, rho: MAT_RHO[s.mat] ?? 0.4, zone,
    minx: cx - ex, maxx: cx + ex, miny: cy - ey, maxy: cy + ey, minz: cz - hz, maxz: cz + hz, fabric: s.mat === 'fabricSheer', label: s.label || s.mat, itemId,
  };
}

function gaussIntegral(sig: number) {
  // ∫ exp(-θ²/2σ²) sinθ dθ · 2π over [0, π/2]
  let s = 0;
  const n = 400, a = 1 / (2 * sig * sig), top = Math.min(Math.PI / 2, 5 * sig);
  for (let i = 0; i < n; i++) {
    const t = ((i + 0.5) / n) * top;
    s += Math.exp(-t * t * a) * Math.sin(t);
  }
  return 2 * Math.PI * s * (top / n);
}
function flatIntegral(hb: number, hf: number) {
  let s = 0;
  const n = 400;
  for (let i = 0; i < n; i++) {
    const t = ((i + 0.5) / n) * hf;
    s += flatF(t, hb, hf) * Math.sin(t);
  }
  return 2 * Math.PI * s * (hf / n);
}
function flatF(t: number, hb: number, hf: number) {
  if (t <= hb) return 1;
  if (t >= hf) return 0;
  const x = (t - hb) / (hf - hb);
  return 1 - x * x * (3 - 2 * x);
}

export function zonesFor(p: Project): { zones: Zone[]; polys: { poly: { x: number; y: number }[]; id: number }[] } {
  const zones: Zone[] = [];
  const ceil = p.settings.ceilingFt * FT;
  const floorA = Math.abs(area(FLOOR_POLY)) * FT * FT;
  const wallA = perimeter(ROOM_POLY) * FT * ceil;
  const rf = FLOOR_RHO[p.settings.floorFinish], rw = p.settings.wallRho, rc = p.settings.ceilingRho;
  // Pipe & drape soaks up bounce light: runs along a wall replace that wall's paint with fabric; free-standing
  // runs add two fabric faces to the room. (Black velour ρ≈0.03 — a hall ringed in it gets noticeably darker.)
  const edges: [V2, V2][] = [];
  for (let i = 0; i < ROOM_POLY.length; i++) edges.push([ROOM_POLY[i], ROOM_POLY[(i + 1) % ROOM_POLY.length]]);
  edges.push([{ x: HALL.stage.x0, y: HALL.stage.y0 }, { x: HALL.stage.x0, y: HALL.stage.y1 }]); // stage lip
  let cover = 0, coverRho = 0, free = 0, freeRho = 0;
  for (const it of p.items) {
    if (it.hidden || it.type !== 'drape') continue;
    const pr = itemParams(it);
    if (pr.closed) continue;
    const rho = MAT_RHO[pr.color === 'ivory' ? 'drapeIvory' : pr.color === 'maroon' ? 'drapeMaroon' : 'drapeBlack'];
    const fab = Math.min(pr.valance > 0 ? pr.valance : pr.h, p.settings.ceilingFt);
    const pts = absPts(it);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const L = Math.hypot(b.x - a.x, b.y - a.y);
      if (L < 0.1) continue;
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const nearWall = edges.some(([e0, e1]) => {
        const ex = e1.x - e0.x, ey = e1.y - e0.y, el = Math.hypot(ex, ey) || 1;
        const t = Math.max(0, Math.min(1, ((m.x - e0.x) * ex + (m.y - e0.y) * ey) / (el * el)));
        const d = Math.hypot(m.x - (e0.x + ex * t), m.y - (e0.y + ey * t));
        const par = Math.abs(((b.x - a.x) * ex + (b.y - a.y) * ey) / (L * el));
        return d < 4 && par > 0.9;
      });
      const A = L * fab * FT * FT;
      if (nearWall) { cover += A; coverRho += A * rho; }
      else { free += 2 * A; freeRho += 2 * A * rho; }
    }
  }
  cover = Math.min(cover, wallA * 0.95);
  const hallA = floorA * 2 + wallA + free;
  zones.push({ id: 'hall', name: 'Assembly Hall', poly: ROOM_POLY, area: hallA, rho: (floorA * rf + floorA * rc + (wallA - cover) * rw + coverRho + freeRho) / hallA });
  const polys: { poly: { x: number; y: number }[]; id: number }[] = [];
  for (const it of p.items) {
    if (it.hidden) continue;
    if (it.type === 'house') {
      const pr = itemParams(it);
      const H = houseXY(it);
      const poly = [H(pr.wall, pr.wall), H(pr.w - pr.wall, pr.wall), H(pr.w - pr.wall, pr.d - pr.wall), H(pr.wall, pr.d - pr.wall)];
      const fl = (pr.w - 2 * pr.wall) * (pr.d - 2 * pr.wall) * FT * FT;
      const wa = 4 * (pr.w - 2 * pr.wall) * FT * pr.h * FT;
      const id = zones.length;
      zones.push({ id: it.id, name: it.name, poly, area: fl * 2 + wa, rho: (fl * 0.3 + fl * 0.35 + wa * 0.52) / (fl * 2 + wa) });
      polys.push({ poly, id });
    }
    if (it.type === 'zoneArea') {
      const pr = itemParams(it);
      const poly = absPts(it);
      const fl = Math.abs(area(poly)) * FT * FT;
      const wa = perimeter(poly) * FT * pr.h * FT;
      const id = zones.length;
      zones.push({ id: it.id, name: it.name, poly, area: fl * 2 + wa, rho: (fl * rf + wa * pr.rho) / (fl * 2 + wa) });
      polys.push({ poly, id });
    }
    if (it.type === 'drape' && itemParams(it).closed) {
      const pr = itemParams(it);
      const poly = absPts(it);
      const fl = Math.abs(area(poly)) * FT * FT;
      const wa = perimeter(poly) * FT * pr.h * FT;
      const rho = pr.color === 'ivory' ? 0.6 : pr.color === 'maroon' ? 0.1 : 0.03;
      const id = zones.length;
      // open top: counts as area with ρ=0
      zones.push({ id: it.id, name: it.name, poly, area: fl * 2 + wa, rho: (fl * rf + wa * rho) / (fl * 2 + wa) });
      polys.push({ poly, id });
    }
  }
  return { zones, polys };
}
const area = (poly: { x: number; y: number }[]) => {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
};
const perimeter = (poly: { x: number; y: number }[]) => {
  let L = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    L += Math.hypot(q.x - p.x, q.y - p.y);
  }
  return L;
};

export function buildScene(p: Project): Scene {
  const byId = new Map(p.items.map((i) => [i.id, i]));
  const { zones, polys } = zonesFor(p);
  const zoneOf = (x: number, y: number) => {
    for (let k = polys.length - 1; k >= 0; k--) if (pointInPoly({ x, y }, polys[k].poly)) return polys[k].id;
    return 0;
  };
  const occ: Occ[] = [];
  const surfaces: Surface[] = [];
  const emitters: Emitter[] = [];
  for (const it of p.items) {
    if (it.hidden) continue;
    for (const s of itemSolids(it)) if (s.shadow !== false || s.tau) occ.push(occFromSolid(s, it.id, zoneOf(s.c.x, s.c.y)));
    surfaces.push(...itemSurfaces(it));
    emitters.push(...itemEmitters(it));
  }
  // stage deck + corner rooms as occluders
  const st = HALL.stage, sh = p.settings.stageHeightFt;
  occ.push(occFromSolid({ c: { x: (st.x0 + st.x1) / 2, y: (st.y0 + st.y1) / 2, z: sh / 2 }, s: { x: st.x1 - st.x0, y: st.y1 - st.y0, z: sh }, yaw: 0, mat: 'wood', label: 'stage deck' }, 'stage', 0));
  for (const r of HALL.stageRooms) occ.push(occFromSolid({ c: { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2, z: p.settings.ceilingFt / 2 }, s: { x: r.x1 - r.x0, y: r.y1 - r.y0, z: p.settings.ceilingFt }, yaw: 0, mat: 'drywall', label: r.name }, 'stage', 0));

  const srcs: Src[] = [];
  const der = p.settings.derate;
  // fixtures
  for (const it of p.items) {
    if (it.type !== 'fixture' || it.hidden) continue;
    const m = resolveModel(it.params.model, p.artSpotVariant);
    if (!m) continue;
    const dim = it.params.dim ?? 1;
    const ch: Record<string, number> = {};
    for (const c of m.channels) ch[c.key] = (it.params.ch ? it.params.ch[c.key] ?? 0 : m.defaultCh[c.key] ?? 0) * dim;
    const mix = mixMetrics(m, ch);
    const pos = fixtureWorld(it, byId);
    const aim = fixtureAim(it, pos);
    let dx = aim.x - pos.x, dy = aim.y - pos.y, dz = aim.z - pos.z;
    const dl = Math.hypot(dx, dy, dz) || 1;
    dx /= dl; dy /= dl; dz /= dl;
    const beam = (m.zoom ? it.params.zoom ?? m.beam : m.beam) * DEG;
    const field = beam * (m.field / m.beam);
    const lm = mix.lm * der;
    const base = { ref: it.id, name: it.name, kind: 'fixture' as const, d: [dx, dy, dz] as [number, number, number], rgb: mix.rgb, cri: mix.cri, cct: rgbToCCT(mix.rgb), watts: mix.watts, model: m.key };
    const mk = (pp: V3, share: number, sid: string): Src => {
      const P3: [number, number, number] = [pp.x * FT, pp.y * FT, pp.z * FT];
      if (m.profile === 'lambert') {
        const I0 = (lm * share) / Math.PI;
        return { ...base, id: sid, p: P3, I0, prof: 2, a: 0, b: Math.PI / 2, cut: 0, lm: lm * share, uv: (mix.uvW * der * share) / Math.PI };
      }
      if (m.profile === 'flat') {
        const hb = beam / 2, hf = field / 2;
        const I0 = (lm * share) / flatIntegral(hb, hf);
        return { ...base, id: sid, p: P3, I0, prof: 1, a: hb, b: hf, cut: Math.cos(hf), lm: lm * share, uv: 0 };
      }
      const sig = beam / 2.355;
      const I0 = (lm * share) / gaussIntegral(sig);
      const cutA = Math.min(Math.PI / 2, 4.3 * sig);
      return { ...base, id: sid, p: P3, I0, prof: 0, a: 1 / (2 * sig * sig), b: cutA, cut: Math.cos(cutA), lm: lm * share, uv: 0 };
    };
    if (m.lineSourceFt) {
      // row of 9 emitters along the bar (horizontal, perpendicular to aim)
      const hx = -dy, hy = dx, hl = Math.hypot(hx, hy) || 1;
      for (let k = 0; k < 9; k++) {
        const o = ((k - 4) / 8) * m.lineSourceFt;
        srcs.push(mk({ x: pos.x + (hx / hl) * o, y: pos.y + (hy / hl) * o, z: pos.z }, 1 / 9, `${it.id}#${k}`));
      }
    } else srcs.push(mk(pos, 1, it.id));
  }
  // house lights
  const H = p.house;
  if (H.enabled && H.level > 0) {
    const x0 = 0, x1 = HALL.W, y0 = 0, y1 = HALL.D;
    const rgb = kelvinRGB(H.cct);
    for (let r = 0; r < H.rows; r++)
      for (let c = 0; c < H.cols; c++) {
        const x = x0 + ((c + 0.5) * (x1 - x0)) / H.cols, y = y0 + ((r + 0.5) * (y1 - y0)) / H.rows;
        const lm = H.lumensEach * H.level;
        const sig = (H.beam * DEG) / 2.355;
        const I0 = lm / gaussIntegral(sig);
        const cutA = Math.min(Math.PI / 2, 4.3 * sig);
        srcs.push({ id: `house_${r}_${c}`, ref: 'house', name: 'House light', kind: 'house', p: [x * FT, y * FT, p.settings.ceilingFt * FT - 0.1], d: [0, 0, -1], I0, prof: 0, a: 1 / (2 * sig * sig), b: cutA, cut: Math.cos(cutA), rgb, cri: H.cri, cct: H.cct, lm, uv: 0, watts: (lm / 120) });
      }
  }
  // self-lit emitters
  for (const e of emitters) {
    const rgb = e.rgb;
    if (e.n) {
      const A = e.areaFt2 * FT * FT;
      const I0 = (e.nits || 100) * A;
      // subdivide large panels into 4 for near-field accuracy
      const parts = A > 2 ? 4 : 1;
      for (let k = 0; k < parts; k++) {
        const off = parts === 1 ? [0, 0] : [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]][k];
        const side = Math.sqrt(A);
        const tx = -e.n.y, ty = e.n.x;
        const tl = Math.hypot(tx, ty) || 1;
        srcs.push({
          id: `${e.id}#${k}`, ref: e.id, name: e.name, kind: 'emitter',
          p: [e.c.x * FT + (tx / tl) * off[0] * side, e.c.y * FT + (ty / tl) * off[0] * side, e.c.z * FT + off[1] * side],
          d: [e.n.x, e.n.y, e.n.z], I0: I0 / parts, prof: 2, a: 0, b: Math.PI / 2, cut: 0, rgb, cri: e.cri, cct: e.cct, lm: (Math.PI * I0) / parts, uv: 0, watts: 0,
        });
      }
    } else {
      const I0 = (e.lumens || 100) / (4 * Math.PI);
      srcs.push({ id: e.id, ref: e.id, name: e.name, kind: 'emitter', p: [e.c.x * FT, e.c.y * FT, e.c.z * FT], d: [0, 0, -1], I0, prof: 3, a: 0, b: Math.PI, cut: -1, rgb, cri: e.cri, cct: e.cct, lm: e.lumens || 100, uv: 0, watts: 0 });
    }
  }
  const sc: Scene = {
    srcs, occ, zones, surfaces,
    ceilingM: p.settings.ceilingFt * FT,
    floorRho: FLOOR_RHO[p.settings.floorFinish],
    wallRho: p.settings.wallRho,
    ceilRho: p.settings.ceilingRho,
    faceM: p.settings.faceHeightFt * FT,
    stageM: p.settings.stageHeightFt * FT,
    bounce: p.settings.bounce,
    bbox: { x0: 0, y0: 0, x1: 160.4, y1: HALL.D },
    gridFt: p.settings.gridFt,
    probes: p.probes,
  };
  addFabricSources(sc);
  return sc;
}

// ——— ray casting ———
const EPS = 0.02;
/** returns transmission along segment P->Q (0 = blocked). Fabric passes τ_direct. */
export function transmit(sc: Scene, px: number, py: number, pz: number, qx: number, qy: number, qz: number, skipFabric = false) {
  const dx = qx - px, dy = qy - py, dz = qz - pz;
  const L = Math.hypot(dx, dy, dz);
  if (L < 1e-6) return 1;
  const ux = dx / L, uy = dy / L, uz = dz / L;
  const mnx = Math.min(px, qx), mxx = Math.max(px, qx), mny = Math.min(py, qy), mxy = Math.max(py, qy), mnz = Math.min(pz, qz), mxz = Math.max(pz, qz);
  let T = 1;
  const occ = sc.occ;
  for (let i = 0; i < occ.length; i++) {
    const o = occ[i];
    if (o.maxx < mnx || o.minx > mxx || o.maxy < mny || o.miny > mxy || o.maxz < mnz || o.minz > mxz) continue;
    if (o.fabric && skipFabric) continue;
    // to local
    const rx = px - o.cx, ry = py - o.cy, rz = pz - o.cz;
    const lx = rx * o.c + ry * o.s, ly = -rx * o.s + ry * o.c, lz = rz;
    const vx = ux * o.c + uy * o.s, vy = -ux * o.s + uy * o.c, vz = uz;
    let t0 = EPS, t1 = L - EPS;
    // slab x
    if (Math.abs(vx) < 1e-12) { if (lx < -o.hx || lx > o.hx) continue; } else {
      let a = (-o.hx - lx) / vx, b = (o.hx - lx) / vx; if (a > b) { const t = a; a = b; b = t; }
      if (a > t0) t0 = a; if (b < t1) t1 = b; if (t0 > t1) continue;
    }
    if (Math.abs(vy) < 1e-12) { if (ly < -o.hy || ly > o.hy) continue; } else {
      let a = (-o.hy - ly) / vy, b = (o.hy - ly) / vy; if (a > b) { const t = a; a = b; b = t; }
      if (a > t0) t0 = a; if (b < t1) t1 = b; if (t0 > t1) continue;
    }
    if (Math.abs(vz) < 1e-12) { if (lz < -o.hz || lz > o.hz) continue; } else {
      let a = (-o.hz - lz) / vz, b = (o.hz - lz) / vz; if (a > b) { const t = a; a = b; b = t; }
      if (a > t0) t0 = a; if (b < t1) t1 = b; if (t0 > t1) continue;
    }
    if (o.tau > 0) {
      T *= o.fabric ? o.tau * 0.7 : o.tau;
      if (T < 1e-3) return 0;
    } else return 0;
  }
  return T;
}

/** first hit along a ray, for the bounce estimate */
function firstHit(sc: Scene, px: number, py: number, pz: number, ux: number, uy: number, uz: number): { t: number; rho: number; zone: number; x: number; y: number } {
  let best = 1e9, rho = 0, zone = 0;
  // floor / ceiling planes
  if (uz < -1e-6) { const t = -pz / uz; if (t < best) { best = t; rho = sc.floorRho; } }
  if (uz > 1e-6) { const t = (sc.ceilingM - pz) / uz; if (t < best) { best = t; rho = sc.ceilRho; } }
  // walls (bounding box of room)
  const x0 = sc.bbox.x0 * FT, x1 = sc.bbox.x1 * FT, y0 = sc.bbox.y0 * FT, y1 = sc.bbox.y1 * FT;
  if (ux > 1e-6) { const t = (x1 - px) / ux; if (t < best) { best = t; rho = sc.wallRho; } }
  if (ux < -1e-6) { const t = (x0 - px) / ux; if (t < best) { best = t; rho = sc.wallRho; } }
  if (uy > 1e-6) { const t = (y1 - py) / uy; if (t < best) { best = t; rho = sc.wallRho; } }
  if (uy < -1e-6) { const t = (y0 - py) / uy; if (t < best) { best = t; rho = sc.wallRho; } }
  for (const o of sc.occ) {
    const rx = px - o.cx, ry = py - o.cy, rz = pz - o.cz;
    const lx = rx * o.c + ry * o.s, ly = -rx * o.s + ry * o.c, lz = rz;
    const vx = ux * o.c + uy * o.s, vy = -ux * o.s + uy * o.c, vz = uz;
    let t0 = 1e-4, t1 = best;
    let ok = true;
    for (const [l, v, h] of [[lx, vx, o.hx], [ly, vy, o.hy], [lz, vz, o.hz]] as [number, number, number][]) {
      if (Math.abs(v) < 1e-12) { if (l < -h || l > h) { ok = false; break; } continue; }
      let a = (-h - l) / v, b = (h - l) / v; if (a > b) { const t = a; a = b; b = t; }
      if (a > t0) t0 = a; if (b < t1) t1 = b; if (t0 > t1) { ok = false; break; }
    }
    if (ok && t0 < best) { best = t0; rho = o.fabric ? 0.3 : o.rho; zone = o.zone; }
  }
  return { t: best, rho, zone, x: px + ux * best, y: py + uy * best };
}

/** angular intensity factor */
function prof(s: Src, cosT: number) {
  if (cosT < s.cut) return 0;
  switch (s.prof) {
    case 0: {
      const t = Math.acos(Math.min(1, cosT));
      return Math.exp(-t * t * s.a);
    }
    case 1: return flatF(Math.acos(Math.min(1, cosT)), s.a, s.b);
    case 2: return cosT > 0 ? cosT : 0;
    default: return 1;
  }
}

function addFabricSources(sc: Scene) {
  // for each fabric occluder: 4×4 patches, gather incident E from fixtures/house above, re-emit τ_diffuse downward
  const fab = sc.occ.filter((o) => o.fabric);
  const extra: Src[] = [];
  for (const f of fab) {
    const n = 4;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const lx = (-1 + (2 * (i + 0.5)) / n) * f.hx, ly = (-1 + (2 * (j + 0.5)) / n) * f.hy;
        const x = f.cx + lx * f.c - ly * f.s, y = f.cy + lx * f.s + ly * f.c, z = f.maxz + 0.01;
        let E = 0, r = 0, g = 0, b = 0, cri = 0;
        for (const s of sc.srcs) {
          if (s.kind === 'emitter' || s.p[2] <= z) continue;
          const dx = x - s.p[0], dy = y - s.p[1], dz = z - s.p[2];
          const d2 = dx * dx + dy * dy + dz * dz, d = Math.sqrt(d2);
          const cosT = (dx * s.d[0] + dy * s.d[1] + dz * s.d[2]) / d;
          const I = s.I0 * prof(s, cosT);
          if (I <= 0) continue;
          const cosI = -dz / d;
          if (cosI <= 0) continue;
          const e = (I * cosI) / d2;
          if (e < 0.05) continue;
          const T = transmit(sc, s.p[0], s.p[1], s.p[2], x, y, z + 0.02, true);
          const ee = e * T;
          E += ee; r += ee * s.rgb[0]; g += ee * s.rgb[1]; b += ee * s.rgb[2]; cri += ee * s.cri;
        }
        if (E < 0.5) continue;
        const A = ((2 * f.hx) / n) * ((2 * f.hy) / n);
        const tauD = f.tau * 0.3; // diffuse share of transmission
        const I0 = (tauD * E * A) / Math.PI;
        const mx = Math.max(r, g, b) || 1;
        extra.push({ id: `fab_${f.itemId}_${i}_${j}`, ref: f.itemId, name: 'Glow through sheer ceiling', kind: 'fabric', p: [x, y, f.minz - 0.03], d: [0, 0, -1], I0, prof: 2, a: 0, b: Math.PI / 2, cut: 0, rgb: [r / mx, g / mx, b / mx], cri: cri / E, cct: rgbToCCT([r / mx, g / mx, b / mx]), lm: Math.PI * I0, uv: 0, watts: 0 });
      }
  }
  sc.srcs.push(...extra);
}

// ——— indirect (bounce) ———
export function indirect(sc: Scene): number[] {
  const zr = new Array(sc.zones.length).fill(0);
  if (!sc.bounce) return zr;
  const N = 48;
  for (const s of sc.srcs) {
    if (s.kind === 'fabric') continue;
    // sample directions around the axis weighted by the distribution (stratified in θ, φ)
    const d = s.d;
    // basis
    const ax = Math.abs(d[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    let t1 = [d[1] * ax[2] - d[2] * ax[1], d[2] * ax[0] - d[0] * ax[2], d[0] * ax[1] - d[1] * ax[0]];
    const tl = Math.hypot(t1[0], t1[1], t1[2]); t1 = t1.map((v) => v / tl);
    const t2 = [d[1] * t1[2] - d[2] * t1[1], d[2] * t1[0] - d[0] * t1[2], d[0] * t1[1] - d[1] * t1[0]];
    const maxT = s.prof === 3 ? Math.PI : Math.min(Math.PI / 2, s.b);
    // weights
    let wsum = 0;
    const samples: { u: number[]; w: number }[] = [];
    const nt = 8, np = N / nt;
    for (let i = 0; i < nt; i++) {
      const th = ((i + 0.5) / nt) * maxT;
      const w = prof(s, Math.cos(th)) * Math.sin(th);
      for (let j = 0; j < np; j++) {
        const ph = ((j + 0.5) / np) * 2 * Math.PI;
        const st = Math.sin(th), ct = Math.cos(th);
        const u = [0, 1, 2].map((k) => d[k] * ct + st * (Math.cos(ph) * t1[k] + Math.sin(ph) * t2[k]));
        samples.push({ u, w });
        wsum += w;
      }
    }
    if (wsum <= 0) continue;
    for (const sm of samples) {
      const flux = (s.lm * sm.w) / wsum;
      const h = firstHit(sc, s.p[0], s.p[1], s.p[2], sm.u[0], sm.u[1], sm.u[2]);
      // zone by hit position
      let z = h.zone;
      if (!z) {
        const xf = h.x / FT, yf = h.y / FT;
        for (let k = sc.zones.length - 1; k > 0; k--) if (pointInPoly({ x: xf, y: yf }, sc.zones[k].poly)) { z = k; break; }
      }
      zr[z] += flux * h.rho;
    }
  }
  return sc.zones.map((zn, k) => zr[k] / (zn.area * (1 - zn.rho)));
}

// ——— grid ———
export interface GridResult {
  nx: number; ny: number; x0: number; y0: number; step: number; // ft
  floor: Float32Array; // horizontal lux at floor
  cyl: Float32Array; // cylindrical (mean of 8 vertical) at face height
  e8: Float32Array; // 8 vertical directions at face height (k*45° from +x)
  top: Float32Array; // horizontal (upward-facing) at face height
  rgb: Float32Array; // colour of light at face (normalised)
  cri: Float32Array;
  uv: Float32Array; // µW/cm² at face (max dir)
  mask: Uint8Array; // 0 outside, 1 floor, 2 inside solid, 3 stage
  zoneInd: number[];
}

const DIRS8 = Array.from({ length: 8 }, (_, k) => [Math.cos((k * Math.PI) / 4), Math.sin((k * Math.PI) / 4)]);

export function computeGrid(sc: Scene, stepFt = sc.gridFt, onProgress?: (f: number) => void): GridResult {
  const zoneInd = indirect(sc);
  const { x0, y0, x1, y1 } = sc.bbox;
  const nx = Math.ceil((x1 - x0) / stepFt), ny = Math.ceil((y1 - y0) / stepFt);
  const N = nx * ny;
  const floor = new Float32Array(N), cyl = new Float32Array(N), e8 = new Float32Array(N * 8), top = new Float32Array(N), rgb = new Float32Array(N * 3), cri = new Float32Array(N), uv = new Float32Array(N);
  const mask = new Uint8Array(N);
  const st = HALL.stage;
  const zonePolys = sc.zones.map((z) => z.poly);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      const xf = x0 + (i + 0.5) * stepFt, yf = y0 + (j + 0.5) * stepFt;
      if (!pointInPoly({ x: xf, y: yf }, ROOM_POLY)) { mask[k] = 0; continue; }
      const onStage = xf > st.x0 && yf > st.y0 && yf < st.y1;
      const base = onStage ? sc.stageM : 0;
      const px = xf * FT, py = yf * FT;
      // inside a solid?
      let inside = false;
      for (const o of sc.occ) {
        if (o.tau > 0 || o.label === 'stage deck') continue;
        if (px < o.minx || px > o.maxx || py < o.miny || py > o.maxy || o.minz > base + 1.0 || o.maxz < base + 0.3) continue;
        const rx = px - o.cx, ry = py - o.cy;
        const lx = rx * o.c + ry * o.s, ly = -rx * o.s + ry * o.c;
        if (Math.abs(lx) <= o.hx && Math.abs(ly) <= o.hy) { inside = true; break; }
      }
      mask[k] = inside ? 2 : onStage ? 3 : 1;
      if (inside) continue;
      let zIdx = 0;
      for (let z = zonePolys.length - 1; z > 0; z--) if (pointInPoly({ x: xf, y: yf }, zonePolys[z])) { zIdx = z; break; }
      const ind = zoneInd[zIdx] + (zIdx ? zoneInd[0] * 0.35 : 0);
      const fz = base + 0.02, hz = base + sc.faceM;
      let Ef = ind, Et = ind, R = 0, G = 0, B = 0, C = 0, U = 0, Etot = 0;
      const ev = [ind, ind, ind, ind, ind, ind, ind, ind];
      for (const s of sc.srcs) {
        // face point
        let dx = px - s.p[0], dy = py - s.p[1], dz = hz - s.p[2];
        let d2 = dx * dx + dy * dy + dz * dz, d = Math.sqrt(d2);
        let cosT = (dx * s.d[0] + dy * s.d[1] + dz * s.d[2]) / d;
        let I = s.I0 * prof(s, cosT);
        if (I > 0 && I / d2 > 0.08) {
          const T = transmit(sc, s.p[0], s.p[1], s.p[2], px, py, hz);
          if (T > 0) {
            const e = (I * T) / d2; // normal illuminance
            const lx = -dx / d, ly = -dy / d, lz = -dz / d; // toward source
            let any = 0;
            for (let q = 0; q < 8; q++) {
              const c = lx * DIRS8[q][0] + ly * DIRS8[q][1];
              if (c > 0) { ev[q] += e * c; any += e * c; }
            }
            if (lz > 0) Et += e * lz;
            const w = any / 8 + 1e-9;
            R += w * s.rgb[0]; G += w * s.rgb[1]; B += w * s.rgb[2]; C += w * s.cri; Etot += w;
            if (s.uv > 0) U += ((s.uv * prof(s, cosT) * T) / d2) * 100; // W/m² -> µW/cm²
          }
        }
        // floor point
        dz = fz - s.p[2];
        d2 = dx * dx + dy * dy + dz * dz; d = Math.sqrt(d2);
        cosT = (dx * s.d[0] + dy * s.d[1] + dz * s.d[2]) / d;
        I = s.I0 * prof(s, cosT);
        if (I > 0 && dz < 0) {
          const cosI = -dz / d;
          const e = (I * cosI) / d2;
          if (e > 0.08) {
            const T = transmit(sc, s.p[0], s.p[1], s.p[2], px, py, fz);
            Ef += e * T;
          }
        }
      }
      floor[k] = Ef;
      let cs = 0;
      for (let q = 0; q < 8; q++) { e8[k * 8 + q] = ev[q]; cs += ev[q]; }
      cyl[k] = cs / 8;
      top[k] = Et;
      if (Etot > 0) {
        const m = Math.max(R, G, B) || 1;
        rgb[k * 3] = R / m; rgb[k * 3 + 1] = G / m; rgb[k * 3 + 2] = B / m; cri[k] = C / Etot;
      }
      uv[k] = U;
    }
    if (onProgress && j % 4 === 0) onProgress(j / ny);
  }
  return { nx, ny, x0, y0, step: stepFt, floor, cyl, e8, top, rgb, cri, uv, mask, zoneInd };
}

// ——— surfaces ———
export interface SurfaceStat {
  id: string; itemId: string; name: string; kind: Surface['kind']; section: string;
  avg: number; min: number; max: number; uni: number; cri: number; cct: number; uv: number; target: [number, number];
  verdict: 'ok' | 'low' | 'high' | 'uneven' | 'glare';
  top: { name: string; lux: number }[];
  c: V3; n: V3; w: number; h: number; up: V3;
  samples: number[]; // 5 × 4 grid
}

export function computeSurfaces(sc: Scene, zoneInd: number[]): SurfaceStat[] {
  const out: SurfaceStat[] = [];
  for (const sf of sc.surfaces) {
    const n = sf.n, up = sf.up;
    // right axis = up × n
    const rx = up.y * n.z - up.z * n.y, ry = up.z * n.x - up.x * n.z, rz = up.x * n.y - up.y * n.x;
    const nu = 5, nv = 4;
    const samples: number[] = [];
    let R = 0, G = 0, B = 0, C = 0, W = 0, U = 0;
    const contrib = new Map<string, number>();
    let zIdx = 0;
    for (let z = sc.zones.length - 1; z > 0; z--) if (pointInPoly({ x: sf.c.x, y: sf.c.y }, sc.zones[z].poly)) { zIdx = z; break; }
    const ind = sf.kind === 'screen' ? 0 : zoneInd[zIdx] + (zIdx ? zoneInd[0] * 0.35 : 0);
    for (let j = 0; j < nv; j++)
      for (let i = 0; i < nu; i++) {
        const a = ((i + 0.5) / nu - 0.5) * sf.w * 0.9, b = ((j + 0.5) / nv - 0.5) * sf.h * 0.9;
        const px = (sf.c.x + rx * a + up.x * b + n.x * 0.12) * FT, py = (sf.c.y + ry * a + up.y * b + n.y * 0.12) * FT, pz = (sf.c.z + rz * a + up.z * b + n.z * 0.12) * FT;
        let E = ind;
        for (const s of sc.srcs) {
          if ((sf.kind === 'diorama' || sf.kind === 'screen' || sf.kind === 'mirror') && s.ref.startsWith(sf.itemId + ':')) continue; // own glow is not "light on" it
          const dx = px - s.p[0], dy = py - s.p[1], dz = pz - s.p[2];
          const d2 = dx * dx + dy * dy + dz * dz, d = Math.sqrt(d2);
          const cosI = -(dx * n.x + dy * n.y + dz * n.z) / d;
          if (cosI <= 0) continue;
          const cosT = (dx * s.d[0] + dy * s.d[1] + dz * s.d[2]) / d;
          const I = s.I0 * prof(s, cosT);
          if (I <= 0) continue;
          const e0 = (I * cosI) / d2;
          if (e0 < 0.05) continue;
          const T = transmit(sc, s.p[0], s.p[1], s.p[2], px, py, pz);
          if (T <= 0) continue;
          const e = e0 * T;
          E += e;
          R += e * s.rgb[0]; G += e * s.rgb[1]; B += e * s.rgb[2]; C += e * s.cri; W += e;
          if (s.uv > 0) U += ((s.uv * prof(s, cosT) * T * cosI) / d2) * 100;
          const key = s.kind === 'house' ? 'House lights' : s.kind === 'fabric' ? 'Sheer-ceiling glow' : s.name;
          contrib.set(key, (contrib.get(key) || 0) + e / (nu * nv));
        }
        samples.push(E);
      }
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    const min = Math.min(...samples), max = Math.max(...samples);
    const m = Math.max(R, G, B) || 1;
    const rgb: [number, number, number] = W > 0 ? [R / m, G / m, B / m] : [1, 1, 1];
    let verdict: SurfaceStat['verdict'] = 'ok';
    if (sf.kind === 'screen' || sf.kind === 'diorama' || sf.kind === 'mirror') verdict = avg > sf.target[1] ? 'glare' : 'ok';
    else if (avg < sf.target[0] * 0.85) verdict = 'low';
    else if (avg > sf.target[1] * 1.6) verdict = 'high';
    else if (min / Math.max(avg, 1) < 0.35) verdict = 'uneven';
    out.push({
      id: sf.id, itemId: sf.itemId, name: sf.name, kind: sf.kind, section: sf.section, avg, min, max, uni: min / Math.max(avg, 1e-6),
      cri: W > 0 ? C / W : 0, cct: W > 0 ? rgbToCCT(rgb) : 0, uv: U / (nu * nv), target: sf.target, verdict,
      top: [...contrib.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name, lux]) => ({ name, lux })),
      c: sf.c, n: sf.n, w: sf.w, h: sf.h, up: sf.up, samples,
    });
  }
  return out;
}

// ——— probes (people) ———
export interface ProbeResult {
  id: string; name: string; x: number; y: number; facing: number; height: number;
  face: number; // vertical lux on the face plane (toward camera)
  cyl: number; left: number; right: number; back: number; top: number; floor: number;
  iso: number; ev: number; cri: number; cct: number; tint: number; uv: number;
  modelling: number; topRatio: number; elev: number;
  verdict: 'great' | 'good' | 'dim' | 'dark';
  issues: string[];
  contrib: { name: string; lux: number; ref: string; kind: string; elev: number; az: number; cri: number; cct: number }[];
  ind: number;
}

export function evalProbe(sc: Scene, zoneInd: number[], pr: { id: string; name: string; x: number; y: number; facing: number; heightFt?: number }): ProbeResult {
  const st = HALL.stage;
  const onStage = pr.x > st.x0 && pr.y > st.y0 && pr.y < st.y1;
  const hFt = pr.heightFt ?? sc.faceM / FT;
  const px = pr.x * FT, py = pr.y * FT, pz = (onStage ? sc.stageM : 0) + hFt * FT;
  let zIdx = 0;
  for (let z = sc.zones.length - 1; z > 0; z--) if (pointInPoly({ x: pr.x, y: pr.y }, sc.zones[z].poly)) { zIdx = z; break; }
  const ind = zoneInd[zIdx] + (zIdx ? zoneInd[0] * 0.35 : 0);
  const f = pr.facing * DEG;
  const dirs = [f, f + Math.PI / 2, f - Math.PI / 2, f + Math.PI].map((a) => [Math.cos(a), Math.sin(a)]);
  const E = [ind, ind, ind, ind];
  let top = ind, floor = 0, R = 0, G = 0, B = 0, C = 0, W = 0, U = 0, elevW = 0;
  const contrib: ProbeResult['contrib'] = [];
  for (const s of sc.srcs) {
    const dx = px - s.p[0], dy = py - s.p[1], dz = pz - s.p[2];
    const d2 = dx * dx + dy * dy + dz * dz, d = Math.sqrt(d2);
    const cosT = (dx * s.d[0] + dy * s.d[1] + dz * s.d[2]) / d;
    const I = s.I0 * prof(s, cosT);
    if (I <= 0 || I / d2 < 0.03) continue;
    const T = transmit(sc, s.p[0], s.p[1], s.p[2], px, py, pz);
    if (T <= 0) continue;
    const e = (I * T) / d2;
    const lx = -dx / d, ly = -dy / d, lz = -dz / d;
    const per = dirs.map((v) => Math.max(0, lx * v[0] + ly * v[1]) * e);
    for (let q = 0; q < 4; q++) E[q] += per[q];
    if (lz > 0) top += e * lz;
    const w = per[0];
    if (w > 0) { R += w * s.rgb[0]; G += w * s.rgb[1]; B += w * s.rgb[2]; C += w * s.cri; W += w; elevW += w * Math.asin(Math.max(-1, Math.min(1, lz))); }
    if (s.uv > 0) U += ((s.uv * prof(s, cosT) * T) / d2) * 100;
    const elev = (Math.asin(Math.max(-1, Math.min(1, lz))) * 180) / Math.PI;
    const az = ((Math.atan2(ly, lx) * 180) / Math.PI + 360) % 360;
    const name = s.kind === 'house' ? 'House lights' : s.kind === 'fabric' ? 'Sheer-ceiling glow' : s.name;
    const ex = contrib.find((c) => c.name === name && (s.kind === 'house' || s.kind === 'fabric' || c.ref === s.ref.split('#')[0]));
    if (ex) { ex.lux += w; } else contrib.push({ name, lux: w, ref: s.ref.split('#')[0], kind: s.kind, elev, az, cri: s.cri, cct: s.cct });
  }
  // floor at feet
  for (const s of sc.srcs) {
    const fz = (onStage ? sc.stageM : 0) + 0.02;
    const dx = px - s.p[0], dy = py - s.p[1], dz = fz - s.p[2];
    if (dz >= 0) continue;
    const d2 = dx * dx + dy * dy + dz * dz, d = Math.sqrt(d2);
    const I = s.I0 * prof(s, (dx * s.d[0] + dy * s.d[1] + dz * s.d[2]) / d);
    if (I <= 0) continue;
    const T = transmit(sc, s.p[0], s.p[1], s.p[2], px, py, fz);
    floor += ((I * -dz) / d / d2) * T;
  }
  floor += ind;
  const [face, left, right, back] = E;
  const cyl = (face + left + right + back) / 4;
  const rgb: [number, number, number] = W > 0 ? (() => { const m = Math.max(R, G, B) || 1; return [R / m, G / m, B / m] as [number, number, number]; })() : [1, 1, 1];
  const cri = W > 0 ? C / W : 0;
  const cct = W > 0 ? rgbToCCT(rgb) : 0;
  const tint = W > 0 ? tintAmount(rgb) : 0;
  const iso = face > 0 ? 48600 / face : 99999; // phone at f/1.8, 1/60 s
  const ev = Math.log2(Math.max(face, 0.01) * 100 / 250);
  const modelling = Math.max(left, right) / Math.max(1, Math.min(left, right));
  const topRatio = top / Math.max(1, face);
  const elev = W > 0 ? (elevW / W) * (180 / Math.PI) : 0;
  const issues: string[] = [];
  let verdict: ProbeResult['verdict'] = face >= 300 ? 'great' : face >= 150 ? 'good' : face >= 70 ? 'dim' : 'dark';
  if (topRatio > 2.2 && face < 300) issues.push('Mostly top-light: eye sockets will fall into shadow (“raccoon eyes”). Add a key from 30–45° elevation.');
  if (modelling > 4) issues.push(`One-sided light (${modelling.toFixed(1)}:1 side to side) — dramatic, but harsh for portraits. Add fill from the other side.`);
  if (W > 0 && cri < 80) issues.push(`Face light CRI ≈ ${cri.toFixed(0)} — skin tones will look off. Use a CRI 90+ white (fresnel / gallery spot) as the key.`);
  if (W > 0 && tint > 0.22) issues.push('Coloured light on faces — RGB mix is tinting skin. Keep saturated colour on backgrounds only.');
  if (back > face * 1.8 && back > 120) issues.push('Strong back-light: the phone will expose for the bright background and the face goes dark.');
  if (U > 300) issues.push(`UV-A ${U.toFixed(0)} µW/cm² at the face (ACGIH long-exposure limit ≈ 1,000) — aim UV floods away from where people stand.`);
  if (elev > 62 && face >= 70) issues.push(`Key light arrives from ${elev.toFixed(0)}° above eye line — lower or move it further out.`);
  contrib.sort((a, b) => b.lux - a.lux);
  return { id: pr.id, name: pr.name, x: pr.x, y: pr.y, facing: pr.facing, height: hFt, face, cyl, left, right, back, top, floor, iso, ev, cri, cct, tint, uv: U, modelling, topRatio, elev, verdict, issues, contrib: contrib.slice(0, 8), ind };
}

export interface FullResult {
  grid: GridResult;
  surfaces: SurfaceStat[];
  probes: ProbeResult[];
  zoneInd: number[];
  zones: { id: string; name: string }[];
  ms: number;
  srcCount: number;
}

export function computeAll(sc: Scene, onProgress?: (f: number) => void): FullResult {
  const t0 = Date.now();
  const grid = computeGrid(sc, sc.gridFt, onProgress);
  const surfaces = computeSurfaces(sc, grid.zoneInd);
  const probes = sc.probes.map((p) => evalProbe(sc, grid.zoneInd, p));
  return { grid, surfaces, probes, zoneInd: grid.zoneInd, zones: sc.zones.map((z) => ({ id: z.id, name: z.name })), ms: Date.now() - t0, srcCount: sc.srcs.length };
}

export const TYPES_REF = TYPES;
