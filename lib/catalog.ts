// Catalog of every object type that can live in the hall: exhibits, pipe & drape, banners, stanchions,
// stands and fixtures. Each type knows how to produce
//   • a plan footprint, • solids (occluders for shadows + 3D), • surfaces we measure lux on,
//   • self-lit emitters (dioramas, screens, practical lamps), • build-list (BOM) lines.
import type { Emitter, Item, MatKey, Solid, Surface, V2, V3 } from './types';
import { DEG, frame, kelvinRGB, local, polylineLength, uYaw } from './geom';
import { SAMSKARAS, NODES, FESTIVAL_POSTERS } from './content';

export interface BomLine {
  key: string;
  name: string;
  qty: number;
  unit: string;
  cat: 'Lighting' | 'Rigging & stands' | 'Pipe & drape' | 'Banners & print' | 'Crowd control' | 'Power & data' | 'Build (by team)' | 'Practicals';
  price?: [number, number]; // per unit USD (AliExpress typical)
  ali?: string;
  note?: string;
  owned?: number;
}

export interface TypeDef {
  key: string;
  label: string;
  group: 'Exhibits' | 'Structure' | 'Print' | 'Crowd' | 'Rigging' | 'Lighting' | 'Markers';
  defaults: Record<string, any>;
  footprint: (it: Item) => V2[];
  solids?: (it: Item) => Solid[];
  surfaces?: (it: Item) => Surface[];
  emitters?: (it: Item) => Emitter[];
  bom?: (it: Item) => BomLine[];
  describe?: (it: Item) => string[];
}

// ——— helpers ———
const P = (it: Item) => ({ ...(TYPES[it.type]?.defaults || {}), ...it.params });
const z0 = (it: Item) => it.z || 0;
function L(it: Item, u: number, v: number) {
  const m = it.params?.mirror ? -1 : 1;
  return local(it.x, it.y, it.rot, u * m, v);
}
function box(it: Item, u: number, v: number, z: number, su: number, sv: number, sz: number, mat: MatKey, extra: Partial<Solid> = {}, yawOff = 0): Solid {
  const c = L(it, u, v);
  const m = it.params?.mirror ? -1 : 1;
  return { c: { x: c.x, y: c.y, z: z0(it) + z + sz / 2 }, s: { x: su, y: sv, z: sz }, yaw: uYaw(it.rot) + yawOff * m, mat, ...extra };
}
function rectFoot(it: Item, w: number, d: number, cu = 0, cv = 0): V2[] {
  return [L(it, cu - w / 2, cv - d / 2), L(it, cu + w / 2, cv - d / 2), L(it, cu + w / 2, cv + d / 2), L(it, cu - w / 2, cv + d / 2)];
}
function nrm(it: Item, angOff = 0): V3 {
  const m = it.params?.mirror ? -1 : 1;
  const a = (it.rot + angOff * m) * DEG;
  return { x: Math.cos(a), y: Math.sin(a), z: 0 };
}
const UP: V3 = { x: 0, y: 0, z: 1 };
function surf(it: Item, idx: number | string, name: string, u: number, v: number, zc: number, w: number, h: number, kind: Surface['kind'], target: [number, number], angOff = 0): Surface {
  const c = L(it, u, v);
  return { id: `${it.id}:${idx}`, itemId: it.id, name, c: { x: c.x, y: c.y, z: z0(it) + zc }, n: nrm(it, angOff), w, h, up: UP, kind, target, section: it.section };
}

function absPts(it: Item): V2[] {
  return (it.points || []).map((p) => ({ x: it.x + p.x, y: it.y + p.y }));
}

// ————————————————————————————————————————————————————————————————————————————————
export const TYPES: Record<string, TypeDef> = {
  mapDeck: {
    key: 'mapDeck',
    label: 'Elevated India map deck',
    group: 'Exhibits',
    defaults: { w: 12, d: 12, h: 3, divos: 44 },
    footprint: (it) => rectFoot(it, P(it).w, P(it).d),
    solids: (it) => {
      const p = P(it);
      return [
        box(it, 0, 0, 0, p.w - 2, p.d - 2, p.h - 0.25, 'plywood', { label: '10′×10′ support base' }),
        box(it, 0, 0, p.h - 0.25, p.w, p.d, 0.25, 'plywood', { label: '12′×12′ plywood deck' }),
        box(it, 0, 0, p.h, p.w - 2.6, p.d - 2.6, 0.18, 'wood', { shadow: false, label: 'raised India cut-out' }),
      ];
    },
    surfaces: (it) => {
      const p = P(it);
      const c = L(it, 0, 0);
      return [{ id: `${it.id}:map`, itemId: it.id, name: 'Map field (top)', c: { x: c.x, y: c.y, z: z0(it) + p.h + 0.2 }, n: UP, w: p.w - 2, h: p.d - 2, up: { x: nrm(it).x, y: nrm(it).y, z: 0 }, kind: 'tabletop', target: [250, 500], section: it.section }];
    },
    emitters: (it) => {
      const p = P(it);
      if (!p.divos) return [];
      const out: Emitter[] = [];
      const n = 8;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const side = Math.floor(t * 4), f = (t * 4) % 1;
        const hw = p.w / 2 - 0.4, hd = p.d / 2 - 0.4;
        const uv = [
          [-hw + 2 * hw * f, -hd],
          [hw, -hd + 2 * hd * f],
          [hw - 2 * hw * f, hd],
          [-hw, hd - 2 * hd * f],
        ][side];
        const c = L(it, uv[0], uv[1]);
        out.push({ id: `${it.id}:divo${i}`, itemId: it.id, name: 'LED divo cluster', c: { x: c.x, y: c.y, z: z0(it) + p.h + 0.15 }, n: null, areaFt2: 0.01, lumens: (p.divos / n) * 2.5, rgb: kelvinRGB(1900), cct: 1900, cri: 80 });
      }
      return out;
    },
    bom: (it) => [
      { key: 'build-map', name: 'India map deck 12′×12′ (plywood deck, 10′×10′ base, 3D festival objects)', qty: 1, unit: 'ea', cat: 'Build (by team)' },
      { key: 'divo', name: 'LED flicker tea-light divos (warm)', qty: P(it).divos, unit: 'ea', cat: 'Practicals', price: [0.25, 0.5], ali: 'LED tealight flameless flickering warm 1800K battery' },
    ],
    describe: () => ['36″ to top of deck — top light from the front corners avoids visitors’ head shadows.'],
  },

  lwall: {
    key: 'lwall',
    label: 'Engraved panel wall (L)',
    group: 'Exhibits',
    defaults: { runA: 16, corner: 4, runB: 16, depth: 2, h: 8, mirror: false },
    footprint: (it) => {
      const p = P(it);
      const k = p.corner / Math.SQRT2;
      return [L(it, 0, 0), L(it, p.runA + k + p.depth, 0), L(it, p.runA + k + p.depth, p.depth + k + p.runB), L(it, p.runA + k, p.depth + k + p.runB), L(it, p.runA + k, p.depth + k), L(it, p.runA, p.depth), L(it, 0, p.depth)];
    },
    solids: (it) => {
      const p = P(it);
      const k = p.corner / Math.SQRT2;
      const cu = p.runA + k / 2 + p.depth * 0.35, cv = p.depth / 2 + k / 2 + 0.35;
      return [
        box(it, p.runA / 2, p.depth / 2, 0, p.runA, p.depth, p.h, 'mdf', { label: 'Run A — 2 modules 8′×8′×2′' }),
        box(it, cu, cv, 0, p.corner + 0.8, p.depth, p.h, 'mdf', { label: 'Corner panel 4′' }, 45),
        box(it, p.runA + k + p.depth / 2, p.depth + k + p.runB / 2, 0, p.depth, p.runB, p.h, 'mdf', { label: 'Run B — 2 modules 8′×8′×2′' }),
      ];
    },
    surfaces: (it) => {
      const p = P(it);
      const k = p.corner / Math.SQRT2;
      const out: Surface[] = [];
      const pa = p.runA / 8, pb = p.runB / 8;
      for (let i = 0; i < 8; i++) {
        const s = SAMSKARAS[i];
        out.push(surf(it, `p${i + 1}`, `Stage ${i + 1} · ${s.name}`, (i + 0.5) * pa, p.depth + 0.02, 4.1, 1.9, 7.6, 'panel', [200, 400]));
      }
      const ci = L(it, p.runA + k / 2, p.depth + k / 2);
      out.push({ id: `${it.id}:intro`, itemId: it.id, name: 'The Game of Life — intro (corner)', c: { x: ci.x, y: ci.y, z: z0(it) + 4.1 }, n: nrm(it, 45), w: 3.6, h: 7.6, up: UP, kind: 'panel', target: [200, 400], section: it.section });
      for (let i = 0; i < 8; i++) {
        const s = SAMSKARAS[8 + i];
        out.push(surf(it, `p${i + 9}`, `Stage ${i + 9} · ${s.name}`, p.runA + k - 0.02, p.depth + k + (i + 0.5) * pb, 4.1, 1.9, 7.6, 'panel', [200, 400], 90));
      }
      return out;
    },
    bom: (it) => [
      { key: 'build-lwall', name: `Engraved panel wall: ${Math.round((P(it).runA + P(it).runB) / 8)} frame modules 8′×8′×2′ (${P(it).runA}′ + ${P(it).runB}′ runs) + 4′ corner, 2×3 framing, 16 CNC/engraved boards 2′×7′9″`, qty: 1, unit: 'set', cat: 'Build (by team)' },
    ],
    describe: (it) => [`Stage boards 1–8 on run A (${P(it).runA}′), corner intro, 9–16 on run B (${P(it).runB}′).`],
  },

  lilyPath: {
    key: 'lilyPath',
    label: 'Lily-pad floor markers',
    group: 'Markers',
    defaults: { n: 16, r: 1.1 },
    footprint: (it) => absPts(it),
    bom: (it) => [{ key: 'lily', name: 'Lily-pad floor markers (printed non-slip vinyl / foam, Ø 26″)', qty: P(it).n, unit: 'ea', cat: 'Build (by team)', price: [4, 9], ali: 'custom printed floor sticker anti slip round 65cm' }],
  },

  house: {
    key: 'house',
    label: 'Walk-through exhibit house 24′×24′',
    group: 'Exhibits',
    defaults: { w: 24, d: 24, h: 8, wall: 2, entry: [10.5, 13.5], exit: [1.5, 4.5], tau: 0.55 },
    footprint: (it) => rectFoot(it, P(it).w, P(it).d),
    solids: (it) => houseSolids(it),
    surfaces: (it) => houseSurfaces(it),
    emitters: (it) => {
      const H = houseXY(it);
      const lamp = H(2.7, 21.2);
      const mandir = H(12, 10.6);
      const table = H(20, 8.5);
      return [
        { id: `${it.id}:lamp`, itemId: it.id, name: 'Standing lamp (reading corner)', c: { x: lamp.x, y: lamp.y, z: z0(it) + 5.2 }, n: null, areaFt2: 0.3, lumens: 800, rgb: kelvinRGB(2700), cct: 2700, cri: 85 },
        { id: `${it.id}:diya`, itemId: it.id, name: 'Ghar Mandir diyas + mandir LED', c: { x: mandir.x, y: mandir.y, z: z0(it) + 4 }, n: null, areaFt2: 0.1, lumens: 120, rgb: kelvinRGB(2200), cct: 2200, cri: 85 },
        { id: `${it.id}:tlamp`, itemId: it.id, name: 'Side-table lamp (living room)', c: { x: table.x, y: table.y, z: z0(it) + 2.8 }, n: null, areaFt2: 0.2, lumens: 450, rgb: kelvinRGB(2700), cct: 2700, cri: 85 },
      ];
    },
    bom: (it) => [
      { key: 'build-house', name: 'Exhibit house: 2′-deep perimeter modules (2×3 studs, drywall interior), interior partitions, furniture & props', qty: 1, unit: 'set', cat: 'Build (by team)' },
      { key: 'sheer', name: 'White FR sheer voile for stretched ceiling (≥ 26′ × 26′)', qty: Math.ceil(((P(it).w + 2) * (P(it).d + 2)) / 9), unit: 'sq yd', cat: 'Pipe & drape', price: [1.5, 3], ali: 'flame retardant white sheer voile fabric wide 3.2m', note: 'Must carry an NFPA 701 / CA Title 19 flame certificate.' },
      { key: 'lamp-floor', name: 'Warm LED floor lamp + table lamp (practicals)', qty: 2, unit: 'ea', cat: 'Practicals', price: [15, 35] },
    ],
  },

  diorama: {
    key: 'diorama',
    label: 'Layered diorama 8′×8′×2′',
    group: 'Exhibits',
    defaults: { w: 8, h: 8, d: 2, art: 'god', nits: 110, cct: 2900 },
    footprint: (it) => rectFoot(it, P(it).w, P(it).d),
    solids: (it) => {
      const p = P(it);
      return [box(it, 0, 0, 0, p.w, p.d, p.h, 'woodDark', { label: p.art === 'guru' ? 'Map diorama frame' : 'Layered diorama frame' })];
    },
    surfaces: (it) => {
      const p = P(it);
      return [surf(it, 'face', p.art === 'guru' ? 'Map diorama face' : 'Diorama face', 0, p.d / 2 + 0.02, p.h / 2, p.w - 1, p.h - 1.5, 'diorama', [0, 150])];
    },
    emitters: (it) => {
      const p = P(it);
      const c = L(it, 0, p.d / 2 + 0.05);
      return [{ id: `${it.id}:glow`, itemId: it.id, name: 'LED strip behind layers (self-lit)', c: { x: c.x, y: c.y, z: z0(it) + p.h * 0.55 }, n: nrm(it), areaFt2: (p.w - 1.4) * (p.h - 2.2), nits: p.nits, rgb: kelvinRGB(p.cct), cct: p.cct, cri: 85 }];
    },
    bom: (it) => [
      { key: `build-dio-${P(it).art}`, name: P(it).art === 'guru' ? '8′×8′ map diorama (carved arch, map panel, bead silhouette)' : '8′×8′ layered diorama (4 CNC MDF layers + back panel)', qty: 1, unit: 'ea', cat: 'Build (by team)' },
      { key: 'ledstrip', name: '24V COB LED strip 3000K CRI90 (5 m) + driver', qty: 2, unit: 'roll', cat: 'Practicals', price: [12, 30], ali: 'COB LED strip 24V CRI90 3000K 5m' },
    ],
  },

  mirrors: {
    key: 'mirrors',
    label: 'Illuminated mirrors on riser',
    group: 'Exhibits',
    defaults: { w: 10, d: 4, n: 4 },
    footprint: (it) => rectFoot(it, P(it).w, P(it).d),
    solids: (it) => {
      const p = P(it);
      const out = [box(it, 0, 0, 0, p.w, p.d, 0.75, 'carpet', { label: 'carpeted riser' })];
      for (let i = 0; i < p.n; i++) {
        const u = -p.w / 2 + (p.w / p.n) * (i + 0.5);
        out.push(box(it, u, -0.6, 0.75, 2.3, 0.25, 6.2, 'gold', { label: `gold mirror ${i + 1}` }, (i - (p.n - 1) / 2) * 9));
      }
      return out;
    },
    surfaces: (it) => [surf(it, 'mir', 'Mirrors (reflections)', 0, -0.4, 3.9, P(it).w - 1, 5.5, 'mirror', [0, 300])],
    emitters: (it) => {
      const p = P(it);
      const c = L(it, 0, -0.4);
      return [{ id: `${it.id}:fairy`, itemId: it.id, name: 'Warm string lights on mirror frames', c: { x: c.x, y: c.y, z: z0(it) + 6.5 }, n: null, areaFt2: 1, lumens: 50 * p.n, rgb: kelvinRGB(2200), cct: 2200, cri: 80 }];
    },
    bom: () => [
      { key: 'build-mirrors', name: 'Gold-frame floor mirrors ×4, carpeted riser 10′×4′', qty: 1, unit: 'set', cat: 'Build (by team)' },
      { key: 'fairy', name: 'Warm-white globe string lights (battery/USB)', qty: 4, unit: 'string', cat: 'Practicals', price: [5, 12], ali: 'warm white globe fairy string light 3m USB' },
    ],
  },

  kiosk: {
    key: 'kiosk',
    label: 'Touch-screen kiosk',
    group: 'Exhibits',
    defaults: { nits: 300 },
    footprint: (it) => rectFoot(it, 4.2, 2.6),
    solids: (it) => [box(it, 0, 0, 0, 1.4, 1.2, 2.9, 'woodDark', { label: 'kiosk pedestal' }), box(it, 0, 0.1, 2.9, 4.1, 2.4, 0.35, 'black', { label: '55″ touch screen (tilted)' })],
    surfaces: (it) => [{ ...surf(it, 'scr', 'Touch screen (keep light OFF)', 0, 0.2, 3.3, 3.9, 2.2, 'screen', [0, 80]), n: { ...nrm(it), z: 0 } }],
    emitters: (it) => {
      const p = P(it);
      const c = L(it, 0, 0.2);
      return [{ id: `${it.id}:scr`, itemId: it.id, name: 'Touch screen (ripple app)', c: { x: c.x, y: c.y, z: z0(it) + 3.3 }, n: { x: nrm(it).x * 0.5, y: nrm(it).y * 0.5, z: 0.866 }, areaFt2: 8.5, nits: p.nits, rgb: [0.75, 0.88, 1], cct: 7500, cri: 0 }];
    },
    bom: () => [{ key: 'kiosk', name: '55″ touch-screen kiosk (karma ripple app)', qty: 1, unit: 'ea', cat: 'Build (by team)' }],
  },

  tvArch: {
    key: 'tvArch',
    label: 'TV display with arched panels',
    group: 'Exhibits',
    defaults: { w: 11, nits: 350 },
    footprint: (it) => rectFoot(it, P(it).w, 3),
    solids: (it) => {
      const p = P(it);
      return [
        box(it, -p.w / 2 + 1.25, -0.6, 0, 2.5, 0.3, 8.5, 'banner', { label: 'arched side panel' }),
        box(it, p.w / 2 - 1.25, -0.6, 0, 2.5, 0.3, 8.5, 'banner', { label: 'arched side panel' }),
        box(it, 0, -0.9, 7.3, p.w - 5, 0.3, 1.8, 'banner', { label: 'header arch' }),
        box(it, 0, 0, 2.9, 5.6, 0.4, 3.3, 'black', { label: '75″ TV on mobile stand' }),
        box(it, 0, 0.2, 0, 5, 1.6, 2.6, 'drapeMaroon', { label: 'fabric-wrapped base' }),
      ];
    },
    surfaces: (it) => [surf(it, 'panels', 'Arched graphic panels (UV-reactive print)', -P(it).w / 2 + 1.25, -0.43, 4.5, 2.4, 7, 'banner', [60, 300])],
    emitters: (it) => {
      const p = P(it);
      const c = L(it, 0, 0.22);
      return [{ id: `${it.id}:tv`, itemId: it.id, name: 'TV — life-forms tree', c: { x: c.x, y: c.y, z: z0(it) + 4.55 }, n: nrm(it), areaFt2: 15.5, nits: p.nits, rgb: [0.8, 0.95, 0.85], cct: 7000, cri: 0 }];
    },
    bom: () => [
      { key: 'tv', name: '75″ TV + mobile TV cart', qty: 1, unit: 'ea', cat: 'Build (by team)' },
      { key: 'arch', name: 'Arched side/header panels, printed foam board (3–5 mm)', qty: 1, unit: 'set', cat: 'Banners & print', price: [60, 140] },
    ],
  },

  fiberTower: {
    key: 'fiberTower',
    label: 'Fibre-optic murti tower',
    group: 'Exhibits',
    defaults: {},
    footprint: (it) => rectFoot(it, 3.5, 3.5),
    solids: (it) => [
      box(it, 0, 0, 0, 3.5, 3.5, 0.4, 'woodDark', { label: 'base frame' }),
      box(it, 0, -1.6, 0.4, 3.5, 0.2, 7.1, 'black', { label: 'black interior back panel' }),
      box(it, 0, 0, 7.5, 3.5, 3.5, 0.5, 'woodDark', { label: 'top enclosure (fibre light source)' }),
      box(it, 0, -0.3, 0.4, 1.8, 1.4, 1.5, 'black', { label: 'murti pedestal' }),
      box(it, -1.7, 0, 0.4, 0.1, 3.4, 7.1, 'acrylic', { tau: 0.9, shadow: false, label: 'clear acrylic side' }),
      box(it, 1.7, 0, 0.4, 0.1, 3.4, 7.1, 'acrylic', { tau: 0.9, shadow: false, label: 'clear acrylic side' }),
    ],
    surfaces: (it) => [surf(it, 'murti', 'Murti on pedestal', 0, 0.3, 2.5, 1.2, 1.4, 'diorama', [80, 250])],
    emitters: (it) => {
      const c = L(it, 0, -0.4);
      return [{ id: `${it.id}:fib`, itemId: it.id, name: 'Fibre-optic star field', c: { x: c.x, y: c.y, z: z0(it) + 5.5 }, n: null, areaFt2: 4, lumens: 60, rgb: [0.75, 0.8, 1], cct: 8000, cri: 0 }];
    },
    bom: () => [
      { key: 'build-fiber', name: 'Fibre-optic tower 96″×42″×42″ (2×3 frame, ¼″ acrylic sides, pedestal)', qty: 1, unit: 'ea', cat: 'Build (by team)' },
      { key: 'fiberkit', name: 'Fibre-optic star ceiling kit (16W RGBW engine, 300+ strands)', qty: 1, unit: 'kit', cat: 'Practicals', price: [45, 110], ali: 'fiber optic star ceiling kit 16W RGBW twinkle 300 strands' },
    ],
  },

  posterStand: {
    key: 'posterStand',
    label: 'Poster on easel / stand',
    group: 'Print',
    defaults: { w: 2.5, h: 3.5, bottom: 2.4, title: 'Poster', style: 'cream', target: [200, 400] },
    footprint: (it) => rectFoot(it, P(it).w + 0.4, 1.8, 0, -0.5),
    solids: (it) => {
      const p = P(it);
      return [box(it, 0, 0, p.bottom, p.w, 0.08, p.h, 'poster', { label: p.title }, 0), box(it, 0, -0.6, 0, p.w * 0.6, 0.1, p.bottom, 'metal', { shadow: false, label: 'easel' })];
    },
    surfaces: (it) => {
      const p = P(it);
      return [surf(it, 'poster', p.title, 0, 0.06, p.bottom + p.h / 2, p.w, p.h, 'poster', p.target)];
    },
    bom: (it) => [
      { key: 'poster-print', name: `Poster print, ${P(it).w * 12}″×${P(it).h * 12}″ on 5 mm foam board / PVC`, qty: 1, unit: 'ea', cat: 'Banners & print', price: [12, 30], ali: 'custom print foam board PVC poster' },
      { key: 'easel', name: 'Display easel / poster stand (metal, 60″+)', qty: 1, unit: 'ea', cat: 'Banners & print', price: [12, 28], ali: 'metal display easel adjustable poster stand' },
    ],
  },

  poster: {
    key: 'poster',
    label: 'Poster on drape / wall',
    group: 'Print',
    defaults: { w: 2.5, h: 5, bottom: 1.6, title: 'Poster', target: [200, 400] },
    footprint: (it) => rectFoot(it, P(it).w, 0.3),
    solids: (it) => [box(it, 0, 0, P(it).bottom, P(it).w, 0.06, P(it).h, 'poster', { label: P(it).title })],
    surfaces: (it) => [surf(it, 'poster', P(it).title, 0, 0.05, P(it).bottom + P(it).h / 2, P(it).w, P(it).h, 'poster', P(it).target)],
    bom: (it) => [{ key: 'poster-print', name: `Poster print, ${Math.round(P(it).w * 12)}″×${Math.round(P(it).h * 12)}″ on 5 mm foam board / PVC + drape hooks`, qty: 1, unit: 'ea', cat: 'Banners & print', price: [16, 40], ali: 'custom print foam board PVC poster' }],
  },

  nailWall: {
    key: 'nailWall',
    label: 'Lotus nail-art backdrop 16′',
    group: 'Exhibits',
    defaults: { w: 16, h: 8, d: 2, table: true, poster: true },
    footprint: (it) => rectFoot(it, P(it).w, P(it).d + (P(it).table ? 4.5 : 0), 0, P(it).table ? 2.25 : 0),
    solids: (it) => {
      const p = P(it);
      const out = [box(it, 0, 0, 0, p.w, p.d, p.h, 'plywood', { label: '½″ sanded plywood over 2 frame modules' })];
      if (p.table) out.push(box(it, 2, p.d / 2 + 3, 0, 6, 2.5, 2.5, 'drapeMaroon', { label: 'sankalp card & band table (skirted)' }));
      return out;
    },
    surfaces: (it) => {
      const p = P(it);
      // poster zone (4′) on the left end when asked for; the nail-art lotus fills the rest of the board
      const pz = p.poster ? 4 : 0;
      const out = [surf(it, 'lotus', `Lotus nail-art (${p.w - pz}′ zone)`, pz / 2, p.d / 2 + 0.05, 4.2, p.w - pz - 0.5, 6.5, 'panel', [250, 500])];
      if (pz) out.push(surf(it, 'poster', 'The Lotus — poster zone', -p.w / 2 + pz / 2, p.d / 2 + 0.05, 4.2, pz - 0.5, 6, 'poster', [200, 400]));
      return out;
    },
    bom: () => [
      { key: 'build-lotus', name: 'Lotus nail-art backdrop: 2 frame modules, 4 sheets ½″ sanded plywood, nails, coloured bands', qty: 1, unit: 'set', cat: 'Build (by team)' },
      { key: 'table6', name: '6′ folding table + fitted maroon skirt', qty: 1, unit: 'ea', cat: 'Build (by team)', price: [30, 60] },
    ],
  },

  pillars: {
    key: 'pillars',
    label: 'Adhar Stambh — three-pillar façade',
    group: 'Exhibits',
    defaults: { w: 20, h: 11, d: 6, nits: 90 },
    footprint: (it) => rectFoot(it, P(it).w + 1, P(it).d + 1),
    solids: (it) => {
      const p = P(it);
      const out: Solid[] = [
        box(it, 0, 0, 0, p.w + 1, p.d + 1, 1, 'stone', { label: 'plinth' }),
        box(it, 0, -p.d / 2 + 0.3, 1, p.w, 0.6, p.h - 3, 'wood', { label: 'back wall of bays' }),
        box(it, 0, 0.2, p.h - 2, p.w + 1, p.d, 2, 'wood', { label: 'entablature — The Three Pillars of Hinduism' }),
      ];
      for (let i = 0; i < 4; i++) out.push(box(it, -p.w / 2 + 0.9 + (i * (p.w - 1.8)) / 3, p.d / 2 - 0.9, 1, 1.6, 1.6, p.h - 3, 'wood', { label: 'carved pillar' }));
      out.push(box(it, 0, 0.3, p.h, 4, 1.2, 1.4, 'wood', { label: 'Om crest' }));
      return out;
    },
    surfaces: (it) => {
      const p = P(it);
      const bw = (p.w - 1.8) / 3 - 1.6;
      const names = ['Mandir bay', 'Shastra bay', 'Sant bay'];
      return [
        ...names.map((n, i) => surf(it, `bay${i}`, n, -p.w / 2 + 0.9 + ((i + 0.5) * (p.w - 1.8)) / 3, -p.d / 2 + 0.65, 4.8, bw, 6.5, 'diorama', [150, 400])),
        surf(it, 'pillar', 'Carved pillars (front)', -p.w / 2 + 0.9, p.d / 2 - 0.08, 5, 1.6, 7.5, 'panel', [200, 500]),
      ];
    },
    emitters: (it) => {
      const p = P(it);
      const out: Emitter[] = [];
      for (let i = 0; i < 3; i++) {
        const c = L(it, -p.w / 2 + 0.9 + ((i + 0.5) * (p.w - 1.8)) / 3, -p.d / 2 + 0.7);
        out.push({ id: `${it.id}:bay${i}`, itemId: it.id, name: 'Bay glow (LED strip)', c: { x: c.x, y: c.y, z: z0(it) + 5.5 }, n: nrm(it), areaFt2: 18, nits: p.nits, rgb: kelvinRGB(2700), cct: 2700, cri: 85 });
      }
      return out;
    },
    bom: () => [{ key: 'build-pillars', name: 'Adhar Stambh façade (≈20′×11′×6′): plinth, 4 pillars, entablature, three diorama bays', qty: 1, unit: 'set', cat: 'Build (by team)' }],
  },

  drape: {
    key: 'drape',
    label: 'Pipe & drape run',
    group: 'Structure',
    defaults: { h: 10, color: 'black', fullness: 0.5, closed: false, lightPipe: false, valance: 0, sharedEnds: false },
    footprint: (it) => absPts(it),
    solids: (it) => {
      const p = P(it);
      const pts = absPts(it);
      const out: Solid[] = [];
      const segs = p.closed ? pts.length : pts.length - 1;
      const fab = p.valance > 0 ? Math.min(p.valance, p.h - 0.1) : p.h - 0.1;
      for (let i = 0; i < segs; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        const Lseg = Math.hypot(b.x - a.x, b.y - a.y);
        if (Lseg < 0.1) continue;
        const yaw = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
        out.push({ c: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: z0(it) + p.h - 0.05 - fab / 2 }, s: { x: Lseg, y: 0.3, z: fab }, yaw, mat: p.color === 'ivory' ? 'drapeIvory' : p.color === 'maroon' ? 'drapeMaroon' : 'drapeBlack', label: `${p.h}′ ${p.color} ${p.valance > 0 ? 'valance' : 'drape'}` });
      }
      return out;
    },
    bom: (it) => drapeBom(it),
    describe: (it) => {
      const b = drapeCounts(it);
      const p = P(it);
      return [`${b.length.toFixed(0)} linear ft, ${b.bays} bays, ${b.uprights} uprights @ ${p.h}′, ${b.panels} ${p.valance > 0 ? 'valance' : 'drape'} panels${p.lightPipe ? ' · heavy-duty uprights with a steel light pipe (fixtures hang on side arms)' : ''}`];
    },
  },

  banner: {
    key: 'banner',
    label: 'Stretch-fabric banner frame',
    group: 'Print',
    defaults: { w: 10, h: 8, bottom: 0, title: 'Banner', sub: '', style: 'saffron', feet: true, double: false, onDrape: false, target: [150, 400] },
    footprint: (it) => rectFoot(it, P(it).w, P(it).feet ? 1.6 : 0.4),
    solids: (it) => {
      const p = P(it);
      const out = [box(it, 0, 0, p.bottom, p.w, 0.1, p.h, 'banner', { label: `${p.w}′×${p.h}′ tension-fabric banner` })];
      if (p.bottom > 0.2 && !p.onDrape) {
        out.push(box(it, -p.w / 2 - 0.08, 0, 0, 0.13, 0.13, p.bottom + p.h, 'chrome', { shadow: false, label: 'upright' }));
        out.push(box(it, p.w / 2 + 0.08, 0, 0, 0.13, 0.13, p.bottom + p.h, 'chrome', { shadow: false, label: 'upright' }));
      }
      return out;
    },
    surfaces: (it) => {
      const p = P(it);
      const s = [surf(it, 'front', `${p.title}`, 0, 0.07, p.bottom + p.h / 2, p.w, p.h, 'banner', p.target)];
      if (p.double) s.push(surf(it, 'back', `${p.title} (back)`, 0, -0.07, p.bottom + p.h / 2, p.w, p.h, 'banner', p.target, 180));
      return s;
    },
    bom: (it) => {
      const p = P(it);
      const area = p.w * p.h;
      const lines: BomLine[] = [
        { key: `seg-${p.w}x${p.h}`, name: `Tension-fabric (pillowcase/SEG) banner frame ${p.w}′×${p.h}′ with ${p.double ? 'double' : 'single'}-sided dye-sub print`, qty: 1, unit: 'ea', cat: 'Banners & print', price: [Math.round(18 * area * 0.5 + 40), Math.round(18 * area + 80)].map((v) => Math.round(v / 10)) as [number, number], ali: 'tension fabric display stand straight pillowcase banner frame custom print' },
      ];
      if (p.onDrape) lines.push({ key: 'sbungee', name: 'Ball bungees / S-hooks to hang banners on drape crossbars', qty: 12, unit: 'ea', cat: 'Banners & print', price: [0.3, 0.8] });
      else if (p.bottom > 0.2) lines.push({ key: 'banner-uprights', name: `Banner uprights ${Math.ceil(p.bottom + p.h)}′ with 25 lb bases (to fly the banner at ${p.bottom}′)`, qty: 2, unit: 'ea', cat: 'Pipe & drape', price: [25, 45] });
      return lines;
    },
  },

  signStand: {
    key: 'signStand',
    label: 'Section sign (roll-up / stand)',
    group: 'Print',
    defaults: { w: 2.75, h: 6.6, title: 'Section', num: 1, target: [60, 400] },
    footprint: (it) => rectFoot(it, P(it).w + 0.2, 1.2),
    solids: (it) => [box(it, 0, 0, 0.25, P(it).w, 0.05, P(it).h, 'banner', { label: `Section ${P(it).num} sign` }), box(it, 0, 0, 0, P(it).w + 0.1, 0.9, 0.25, 'metal', { shadow: false, label: 'roll-up base' })],
    surfaces: (it) => [surf(it, 'sign', `Sign — ${P(it).title}`, 0, 0.04, 0.25 + P(it).h / 2, P(it).w, P(it).h, 'banner', P(it).target)],
    bom: () => [{ key: 'rollup', name: 'Roll-up banner stand 33″×79″ with print', qty: 1, unit: 'ea', cat: 'Banners & print', price: [22, 55], ali: 'roll up banner stand 85x200 aluminium custom print' }],
  },

  stanchions: {
    key: 'stanchions',
    label: 'Belt stanchion line',
    group: 'Crowd',
    defaults: { spacing: 7, color: 'maroon' },
    footprint: (it) => absPts(it),
    bom: (it) => {
      const n = stanchionCount(it);
      return [{ key: 'stanchion', name: 'Retractable-belt stanchion (chrome, 7–10′ belt)', qty: n, unit: 'ea', cat: 'Crowd control', price: [12, 25], ali: 'retractable belt stanchion queue barrier stainless' }];
    },
  },

  tbar: {
    key: 'tbar',
    label: 'T-bar lighting stand',
    group: 'Rigging',
    defaults: { h: 11, bar: 4 },
    footprint: (it) => {
      const r = 2.1;
      return [0, 120, 240].map((a) => ({ x: it.x + r * Math.cos((a + it.rot) * DEG), y: it.y + r * Math.sin((a + it.rot) * DEG) }));
    },
    bom: (it) => [
      { key: 'tbar', name: 'T-bar tripod lighting stand, 11.5′ max, 4-fixture bar (load ≥ 40 kg)', qty: 1, unit: 'ea', cat: 'Rigging & stands', price: [45, 90], ali: 'T bar tripod lighting stand 3.5m DJ light stand' },
      { key: 'sandbag', name: 'Sandbags 15 lb for stand legs', qty: 2, unit: 'ea', cat: 'Rigging & stands', price: [6, 12] },
    ],
  },

  crank: {
    key: 'crank',
    label: 'Crank-up stand + truss bar',
    group: 'Rigging',
    defaults: { h: 14, bar: 6 },
    footprint: (it) => {
      const r = 2.8;
      return [45, 135, 225, 315].map((a) => ({ x: it.x + r * Math.cos((a + it.rot) * DEG), y: it.y + r * Math.sin((a + it.rot) * DEG) }));
    },
    bom: () => [
      { key: 'crank', name: 'Crank-up lighting stand 16′ (≥ 80 kg) + 6′ truss T-bar', qty: 1, unit: 'ea', cat: 'Rigging & stands', price: [180, 320], ali: 'crank stand lighting 5m truss tower winch stand' },
      { key: 'sandbag25', name: 'Sandbag 25 lb (crank outriggers, light-pipe bases)', qty: 4, unit: 'ea', cat: 'Rigging & stands', price: [8, 14] },
    ],
  },

  pipebar: {
    key: 'pipebar',
    label: 'Light pipe on two uprights',
    group: 'Rigging',
    defaults: { h: 10, w: 12 },
    footprint: (it) => rectFoot(it, P(it).w + 1.5, 1.5),
    solids: (it) => {
      const p = P(it);
      return [
        box(it, -p.w / 2, 0, 0, 0.14, 0.14, p.h, 'chrome', { shadow: false, label: 'upright' }),
        box(it, p.w / 2, 0, 0, 0.14, 0.14, p.h, 'chrome', { shadow: false, label: 'upright' }),
        box(it, 0, 0, p.h - 0.1, p.w, 0.16, 0.16, 'chrome', { shadow: false, label: '1½″ steel light pipe' }),
      ];
    },
    bom: (it) => [
      { key: `upright-${P(it).h}`, name: `Telescopic upright ${P(it).h <= 10 ? '6–10′' : '7–12′'} (set at ${P(it).h}′)`, qty: 2, unit: 'ea', cat: 'Pipe & drape', price: [12, 25], ali: 'pipe and drape telescopic upright' },
      { key: 'base-24', name: 'Steel base plate 24″×24″ 35 lb with spigot', qty: 2, unit: 'ea', cat: 'Pipe & drape', price: [25, 45] },
      { key: 'lightpipe', name: `1½″ schedule-40 steel / 2″ aluminium light pipe ${P(it).w}′ + 2 slip-on tees`, qty: 1, unit: 'ea', cat: 'Rigging & stands', price: [25, 60], note: 'Not a drape crossbar — those are not rated for fixtures.' },
    ],
  },

  fixture: {
    key: 'fixture',
    label: 'Lighting fixture',
    group: 'Lighting',
    defaults: { model: 'rgbwPar200', mount: 'tbar', h: 11, dim: 1 },
    footprint: (it) => [
      { x: it.x - 0.4, y: it.y - 0.4 },
      { x: it.x + 0.4, y: it.y - 0.4 },
      { x: it.x + 0.4, y: it.y + 0.4 },
      { x: it.x - 0.4, y: it.y + 0.4 },
    ],
  },

  tvStand: {
    key: 'tvStand',
    label: 'TV on mobile stand',
    group: 'Exhibits',
    defaults: { w: 4.8, nits: 320, screen: 'tree' },
    footprint: (it) => rectFoot(it, P(it).w + 0.4, 2.4),
    solids: (it) => {
      const p = P(it);
      return [
        box(it, 0, 0, 0, 2.6, 2.2, 0.35, 'black', { label: 'mobile TV cart base' }),
        box(it, 0, -0.1, 0.35, 0.35, 0.3, 3.9, 'black', { label: 'TV cart column' }),
        box(it, 0, 0, 3.4, p.w, 0.25, (p.w * 9) / 16, 'black', { label: `${Math.round(p.w * 12 * 1.15)}″ TV` }),
      ];
    },
    surfaces: (it) => {
      const p = P(it);
      return [surf(it, 'scr', 'TV screen (keep light OFF)', 0, 0.14, 3.4 + (p.w * 9) / 32, p.w - 0.3, (p.w * 9) / 16 - 0.3, 'screen', [0, 80])];
    },
    emitters: (it) => {
      const p = P(it);
      const c = L(it, 0, 0.16);
      return [{ id: `${it.id}:scr`, itemId: it.id, name: 'TV screen', c: { x: c.x, y: c.y, z: z0(it) + 3.4 + (p.w * 9) / 32 }, n: nrm(it), areaFt2: (p.w - 0.3) * ((p.w * 9) / 16 - 0.3), nits: p.nits, rgb: [0.85, 0.93, 1], cct: 7000, cri: 0 }];
    },
    bom: (it) => [{ key: 'tv65', name: `${Math.round(P(it).w * 12 * 1.15)}″ TV + mobile TV cart`, qty: 1, unit: 'ea', cat: 'Build (by team)' }],
  },

  stambh: {
    key: 'stambh',
    label: 'Pillar (stambh) bay',
    group: 'Exhibits',
    defaults: { w: 7, h: 10, d: 3, kind: 0, nits: 90 },
    footprint: (it) => rectFoot(it, P(it).w + 0.6, P(it).d + 0.6),
    solids: (it) => {
      const p = P(it);
      return [
        box(it, 0, 0, 0, p.w + 0.6, p.d + 0.6, 0.8, 'stone', { label: 'carved plinth' }),
        box(it, 0, -p.d / 2 + 0.25, 0.8, p.w - 0.4, 0.5, p.h - 2.4, 'wood', { label: 'bay back panel' }),
        box(it, -p.w / 2 + 0.6, 0.3, 0.8, 1.2, 1.2, p.h - 2.4, 'wood', { label: 'carved pillar' }),
        box(it, p.w / 2 - 0.6, 0.3, 0.8, 1.2, 1.2, p.h - 2.4, 'wood', { label: 'carved pillar' }),
        box(it, 0, 0, p.h - 1.6, p.w + 0.4, p.d + 0.2, 1.6, 'wood', { label: `${['Mandir', 'Shastra', 'Sant'][p.kind] || 'Stambh'} — carved capital` }),
      ];
    },
    surfaces: (it) => {
      const p = P(it);
      return [
        surf(it, `bay${p.kind}`, `${['Mandir', 'Shastra', 'Sant'][p.kind]} bay`, 0, -p.d / 2 + 0.55, 0.8 + (p.h - 2.4) / 2, p.w - 2.6, p.h - 3, 'diorama', [150, 400]),
        surf(it, 'pillar', `${['Mandir', 'Shastra', 'Sant'][p.kind]} — carved pillars`, -p.w / 2 + 0.6, 0.92, 0.8 + (p.h - 2.4) / 2, 1.2, p.h - 2.4, 'panel', [200, 500]),
      ];
    },
    emitters: (it) => {
      const p = P(it);
      const c = L(it, 0, -p.d / 2 + 0.6);
      return [{ id: `${it.id}:bay`, itemId: it.id, name: 'Bay glow (LED strip)', c: { x: c.x, y: c.y, z: z0(it) + 0.8 + (p.h - 2.4) / 2 }, n: nrm(it), areaFt2: (p.w - 2.6) * (p.h - 3), nits: p.nits, rgb: kelvinRGB(2700), cct: 2700, cri: 85 }];
    },
    bom: (it) => [{ key: 'build-stambh', name: `Adhar Stambh pillar bay (${['Mandir', 'Shastra', 'Sant'][P(it).kind]}): plinth, 2 carved pillars, capital, back-lit bay`, qty: 1, unit: 'ea', cat: 'Build (by team)' }],
  },

  centerpiece: {
    key: 'centerpiece',
    label: 'Centerpiece riser',
    group: 'Exhibits',
    defaults: { w: 28, d: 8, h: 1.2, divos: 60, title: 'Centerpiece' },
    footprint: (it) => rectFoot(it, P(it).w, P(it).d),
    solids: (it) => {
      const p = P(it);
      return [
        box(it, 0, 0, 0, p.w, p.d, p.h, 'drapeMaroon', { label: 'skirted riser' }),
        box(it, 0, 0, p.h, 3.2, 3.2, 1.2, 'gold', { label: 'diya sculpture base' }),
        box(it, 0, 0, p.h + 1.2, 1.4, 1.4, 4.2, 'gold', { label: 'centre display (TBD)' }),
      ];
    },
    surfaces: (it) => {
      const p = P(it);
      const c = L(it, 0, 0);
      return [{ id: `${it.id}:top`, itemId: it.id, name: 'Centerpiece top', c: { x: c.x, y: c.y, z: z0(it) + p.h + 0.05 }, n: UP, w: p.w - 1, h: p.d - 1, up: { x: nrm(it).x, y: nrm(it).y, z: 0 }, kind: 'tabletop', target: [250, 600], section: it.section }, surf(it, 'disp', 'Centre display (front)', 0, 0.75, p.h + 3.3, 1.4, 4.2, 'panel', [250, 600])];
    },
    emitters: (it) => {
      const p = P(it);
      const out: Emitter[] = [];
      for (let i = 0; i < 6; i++) {
        const c = L(it, -p.w / 2 + 1 + (i * (p.w - 2)) / 5, (i % 2 ? 1 : -1) * (p.d / 2 - 0.6));
        out.push({ id: `${it.id}:divo${i}`, itemId: it.id, name: 'LED divo cluster', c: { x: c.x, y: c.y, z: z0(it) + p.h + 0.15 }, n: null, areaFt2: 0.01, lumens: (p.divos / 6) * 2.5, rgb: kelvinRGB(1900), cct: 1900, cri: 80 });
      }
      return out;
    },
    bom: (it) => [
      { key: 'build-centre', name: `Centerpiece riser ${P(it).w}′×${P(it).d}′ (stage decks + skirt) with centre display`, qty: 1, unit: 'set', cat: 'Build (by team)' },
      { key: 'divo', name: 'LED flicker tea-light divos (warm)', qty: P(it).divos, unit: 'ea', cat: 'Practicals', price: [0.25, 0.5], ali: 'LED tealight flameless flickering warm 1800K battery' },
    ],
  },

  booth: {
    key: 'booth',
    label: 'Booth / zone marker',
    group: 'Markers',
    defaults: { w: 18, d: 12, title: 'Zone', zone: false },
    footprint: (it) => rectFoot(it, P(it).w, P(it).d),
  },

  table: {
    key: 'table',
    label: 'Skirted table',
    group: 'Exhibits',
    defaults: { w: 6, d: 2.5, h: 2.5, mat: 'drapeMaroon' },
    footprint: (it) => rectFoot(it, P(it).w, P(it).d),
    solids: (it) => [box(it, 0, 0, 0, P(it).w, P(it).d, P(it).h, P(it).mat, { label: 'skirted table' })],
    bom: () => [{ key: 'table6', name: '6′ folding table + fitted skirt', qty: 1, unit: 'ea', cat: 'Build (by team)', price: [30, 60] }],
  },

  zoneArea: {
    key: 'zoneArea',
    label: 'Enclosed room (for bounce light)',
    group: 'Markers',
    defaults: { rho: 0.05, h: 10 },
    footprint: (it) => absPts(it),
  },

  floorMark: {
    key: 'floorMark',
    label: 'Floor mark (stand here)',
    group: 'Markers',
    defaults: { text: 'Stand here' },
    footprint: (it) => rectFoot(it, 2, 2),
    bom: () => [{ key: 'floormark', name: 'Floor decal “Stand here for your photo”', qty: 1, unit: 'ea', cat: 'Banners & print', price: [5, 12] }],
  },
};

// ——— pipe & drape maths ———
/** Longest bay between uprights: 10′ for drape alone, 8′ when the top pipe also carries light fixtures */
export function maxBay(it: Item) {
  return P(it).lightPipe ? 8 : 10;
}
/** Upright positions (ft) along a drape run, shared by the plan, 3D and the build list */
export function drapeUprights(it: Item): V2[] {
  const p = P(it);
  const pts = absPts(it);
  const mb = maxBay(it);
  const ups: V2[] = [];
  const segs = p.closed ? pts.length : pts.length - 1;
  for (let i = 0; i < segs; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    if (l < 0.1) continue;
    const n = Math.max(1, Math.ceil(l / mb - 1e-6));
    for (let k = 0; k < n; k++) ups.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  if (!p.closed && pts.length) ups.push(pts[pts.length - 1]);
  if (p.sharedEnds && !p.closed && ups.length >= 2) return ups.slice(1, -1);
  return ups;
}
export function drapeCounts(it: Item) {
  const p = P(it);
  const pts = absPts(it);
  const segs = p.closed ? pts.length : pts.length - 1;
  const mb = maxBay(it);
  let bays = 0, length = 0;
  const bayLens: number[] = [];
  for (let i = 0; i < segs; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    if (l < 0.1) continue;
    const n = Math.max(1, Math.ceil(l / mb - 1e-6));
    bays += n;
    length += l;
    for (let k = 0; k < n; k++) bayLens.push(l / n);
  }
  const uprights = Math.max(0, (p.closed ? bays : bays + 1) - (p.sharedEnds && !p.closed ? 2 : 0));
  const panelWidthFt = 54 / 12;
  const coverPerPanel = panelWidthFt / (1 + p.fullness);
  const panels = Math.ceil(length / coverPerPanel);
  return { length, bays, uprights, panels, bayLens };
}

function drapeBom(it: Item): BomLine[] {
  const p = P(it);
  const c = drapeCounts(it);
  const h = p.h;
  const color = p.color === 'ivory' ? 'ivory' : p.color === 'maroon' ? 'maroon' : 'black';
  const lines: BomLine[] = [];
  if (p.lightPipe) {
    lines.push(
      { key: `hdupright-${h}`, name: `Heavy-duty telescopic upright 2″ steel / 3″ aluminium ${h <= 12 ? '8–12′' : '10–16′'} (set at ${h}′, for light-pipe runs)`, qty: c.uprights, unit: 'ea', cat: 'Pipe & drape', price: [28, 55], ali: 'heavy duty pipe and drape upright 3 inch aluminum telescopic' },
      { key: 'base-24', name: 'Steel base plate 24″×24″ 35 lb with spigot', qty: c.uprights, unit: 'ea', cat: 'Pipe & drape', price: [25, 45] },
      { key: 'sandbag25', name: 'Sandbag 25 lb (crank outriggers, light-pipe bases)', qty: c.uprights, unit: 'ea', cat: 'Rigging & stands', price: [8, 14] },
      { key: 'lightpipe-bay', name: '1½″ schedule-40 steel light pipe, 8′ bay, with slip-on top tees (replaces the drape crossbar)', qty: c.bays, unit: 'ea', cat: 'Rigging & stands', price: [22, 45], note: 'Standard telescopic drape crossbars are not rated for fixtures — the steel pipe carries both the drape and the lights.' },
    );
  } else {
    const base = h <= 8 ? '18″×18″ 16 lb' : h <= 10 ? '18″×18″ 25 lb' : '24″×24″ 35 lb';
    lines.push(
      { key: `upright-${h}`, name: `Telescopic upright ${h <= 8 ? '5–8′' : h <= 10 ? '6–10′' : h <= 12 ? '7–12′' : '10–16′'} (set at ${h}′)`, qty: c.uprights, unit: 'ea', cat: 'Pipe & drape', price: h > 12 ? [24, 45] : [12, 25], ali: 'pipe and drape telescopic upright' },
      { key: h > 10 ? 'base-24' : `base-${base}`, name: `Steel base plate ${base} with spigot`, qty: c.uprights, unit: 'ea', cat: 'Pipe & drape', price: h <= 10 ? [14, 30] : [25, 45] },
      { key: 'crossbar', name: 'Telescopic drape support crossbar 6–10′', qty: c.bays, unit: 'ea', cat: 'Pipe & drape', price: [8, 16] },
    );
  }
  const ph = p.valance > 0 ? p.valance : h;
  lines.push({ key: `drape-${color}-${ph}`, name: `${color[0].toUpperCase() + color.slice(1)} IFR ${p.valance > 0 ? 'valance' : 'drape'} panel 54″ wide × ${ph}′ (rod pocket)`, qty: c.panels, unit: 'panel', cat: 'Pipe & drape', price: (color === 'black' ? [14, 30] : [16, 34]).map((v) => Math.round((v * Math.max(0.3, ph / 10)) * 10) / 10) as [number, number], ali: `${color} pipe and drape curtain panel flame retardant`, note: 'Assembly occupancy: fabric must be flame-retardant with an NFPA 701 / CA Title 19 certificate. Renting pipe & drape locally is often cheaper than buying.' });
  return lines;
}

export function stanchionCount(it: Item) {
  const p = P(it);
  const L0 = polylineLength(absPts(it));
  return Math.max(2, Math.ceil(L0 / p.spacing) + 1);
}

// ——— house internals ———
export function houseXY(it: Item) {
  // sketch coords sx (0 = left/west when looking at the entrance), sy (0 = entrance wall) -> world
  const p = P(it);
  return (sx: number, sy: number) => L(it, p.w / 2 - sx, p.d / 2 - sy);
}

function houseSolids(it: Item): Solid[] {
  const p = P(it);
  const H = houseXY(it);
  const yawU = uYaw(it.rot);
  const o: Solid[] = [];
  const wb = (sx0: number, sy0: number, sx1: number, sy1: number, h: number, mat: MatKey, label: string, extra: Partial<Solid> = {}, zb = 0) => {
    const c = H((sx0 + sx1) / 2, (sy0 + sy1) / 2);
    o.push({ c: { x: c.x, y: c.y, z: z0(it) + zb + h / 2 }, s: { x: Math.abs(sx1 - sx0), y: Math.abs(sy1 - sy0), z: h }, yaw: yawU, mat, label, ...extra });
  };
  const W = p.w, D = p.d, t = p.wall, h = p.h, k = 0.15; // k = painted exterior skin
  const EXT: MatKey = 'paintOchre';
  // front (entrance) wall — exterior skin on sy=0, cream interior; door gap with a carved lintel
  for (const [a0, a1] of [[0, p.entry[0]], [p.entry[1], W]] as [number, number][]) {
    wb(a0, 0, a1, k, h, EXT, 'perimeter module (front, painted exterior)');
    wb(a0, k, a1, t, h, 'paintCream', 'perimeter module (front, foyer side)');
  }
  wb(p.entry[0], 0, p.entry[1], t, 1.1, 'woodDark', 'carved door lintel', {}, h - 1.1);
  // back wall — kitchen & seva side in warm saffron
  wb(0, D - k, W, D, h, EXT, 'perimeter module (back, painted exterior)');
  wb(0, D - t, W, D - k, h, 'paintSaffron', 'perimeter module (back, kitchen side)');
  // left wall with the exit gap — reading corner in sage
  for (const [a0, a1] of [[t, p.exit[0]], [p.exit[1], D - t]] as [number, number][]) {
    wb(0, a0, k, a1, h, EXT, 'perimeter module (left, painted exterior)');
    wb(k, a0, t, a1, h, 'paintSage', 'perimeter module (left, reading side)');
  }
  wb(0, 0, t, t, h, EXT, 'corner post');
  wb(0, D - t, t, D, h, EXT, 'corner post');
  wb(0, p.exit[0], t, p.exit[1], 1.1, 'woodDark', 'exit lintel', {}, h - 1.1);
  // right wall — living room in peach
  wb(W - k, 0, W, D, h, EXT, 'perimeter module (right, painted exterior)');
  wb(W - t, t, W - k, D - t, h, 'paintPeach', 'perimeter module (right, living side)');
  wb(W - t, 0, W - k, t, h, EXT, 'corner post');
  wb(W - t, D - t, W - k, D, h, EXT, 'corner post');
  // interior partitions
  wb(7.75, t, 8.25, 9.5, h, 'paintCream', 'partition (tulsi side)');
  wb(7.75, 9.25, 16, 9.75, h, 'paintSaffron', 'Ghar Mandir partition');
  // furniture — photometric blocks; the 3D view draws the detailed pieces
  const fv = { vis: false };
  wb(9.5, 9.75, 14.5, 11.4, 6, 'woodDark', 'Ghar Mandir (carved wooden mandir)', fv);
  wb(13.6, 2.2, 15.6, 3.2, 3, 'wood', 'shoe rack', fv);
  wb(8.4, 3, 9.6, 7.5, 2.6, 'terracotta', 'tulsi planters', fv);
  wb(18.5, 10.2, 21.6, 17.2, 2.8, 'couchTeal', 'sofa', fv);
  wb(19, 7.8, 21, 9.3, 2.2, 'wood', 'side table + lamp', fv);
  wb(14.8, 13, 17, 16.6, 1.2, 'drapeMaroon', 'harmonium & tabla on low platform', fv);
  wb(10.5, 12.6, 13.2, 14.2, 2.5, 'wood', 'puja table with arti', fv);
  wb(8, 19.9, 15, 21.9, 3, 'granite', 'kitchen counter (thaali, fruits, grains)', fv);
  wb(18, 19.6, 21.6, 21.6, 2.5, 'wood', 'Seva corner table', fv);
  wb(2.05, 12, 3.2, 15.6, 6, 'woodDark', 'bookshelf (Vachanamrut, Satsang Diksha, Shikshapatri, Gita)', fv);
  wb(3.2, 16.6, 5.4, 18.8, 1.4, 'cushion', 'beanbag', fv);
  wb(2.6, 2.05, 4.2, 2.3, 6.2, 'mirror', 'tall exit mirror');
  // fabric ceiling
  const cc = H(W / 2, D / 2);
  o.push({ c: { x: cc.x, y: cc.y, z: z0(it) + h + 0.05 }, s: { x: W, y: D, z: 0.05 }, yaw: yawU, mat: 'fabricSheer', tau: p.tau, label: 'stretched sheer fabric ceiling' });
  return o;
}

function houseSurfaces(it: Item): Surface[] {
  const H = houseXY(it);
  const out: Surface[] = [];
  const add = (key: string, name: string, sx: number, sy: number, z: number, w: number, h: number, faceDeg: number, kind: Surface['kind'], target: [number, number]) => {
    const c = H(sx, sy);
    // faceDeg in sketch frame (0 = sketch +x, 90 = toward the back wall). sketch +y = world -F, sketch +x = world -U
    const fsk = { x: Math.cos(faceDeg * DEG), y: Math.sin(faceDeg * DEG) };
    const { F, U } = frame(it.rot);
    const m = it.params?.mirror ? -1 : 1;
    const n = { x: -U.x * m * fsk.x - F.x * fsk.y, y: -U.y * m * fsk.x - F.y * fsk.y, z: 0 };
    out.push({ id: `${it.id}:${key}`, itemId: it.id, name, c: { x: c.x, y: c.y, z: (it.z || 0) + z }, n, w, h, up: UP, kind, target, section: it.section });
  };
  add('entrance', 'Entrance poster', 12, 9.2, 4.6, 2, 3, 270, 'poster', [150, 350]);
  add('mandir', 'Ghar Mandir', 12, 11.45, 3.5, 4.5, 3.5, 270 + 180, 'diorama', [150, 400]);
  add('living', 'Living-room poster', 21.95, 19, 4.6, 2, 3, 180, 'poster', [150, 350]);
  add('kitchen', 'Kitchen poster', 5.5, 21.95, 4.6, 2, 3, 270, 'poster', [150, 350]);
  add('seva', 'Seva-corner poster', 19.8, 21.95, 4.6, 2, 3, 270, 'poster', [150, 350]);
  add('reading', 'Reading-corner poster', 2.05, 9, 4.6, 2, 3, 0, 'poster', [150, 350]);
  add('exit', 'Exit-reflection poster', 5.6, 2.05, 4.6, 2, 3, 90, 'poster', [150, 350]);
  add('counter', 'Kitchen counter (props)', 11.5, 20.9, 3.05, 6.5, 1.6, 270, 'tabletop', [150, 400]);
  return out;
}

// ——— resolve everything for an item ———
export function itemSolids(it: Item): Solid[] {
  if (it.hidden) return [];
  return TYPES[it.type]?.solids?.(it) || [];
}
export function itemSurfaces(it: Item): Surface[] {
  if (it.hidden) return [];
  return TYPES[it.type]?.surfaces?.(it) || [];
}
export function itemEmitters(it: Item): Emitter[] {
  if (it.hidden) return [];
  return TYPES[it.type]?.emitters?.(it) || [];
}
export function itemFootprint(it: Item): V2[] {
  return TYPES[it.type]?.footprint(it) || [];
}
export function params(it: Item) {
  return P(it);
}
export { absPts, L as localPt };

export const DEFAULT_POSTER_TITLES = FESTIVAL_POSTERS;
export const NODE_LIST = NODES;
