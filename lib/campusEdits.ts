'use client';
// Hand edits layered on top of the DWG-derived campus model. Shared by the 2D Campus plan editor and the Campus 3D view.
// Everything is in hall-frame FEET (x east, y north). The DWG data is never modified; edits hide, add or restyle things.
import { create } from 'zustand';
import type { CampusData, PolyJ } from './campus';

export type Rect = [number, number, number, number]; // x0, x1, y0, y1
export interface Zone { id: string; label: string; color: string; r: Rect; tents: boolean }
export interface Pt { id: string; n?: number; x: number; y: number }
export type AreaKind = 'lawn' | 'paving' | 'asphalt' | 'floor' | 'water' | 'block';
export type Added =
  | { id: string; t: 'wall'; a: [number, number]; b: [number, number]; w: number; h: number }
  | { id: string; t: 'glass'; a: [number, number]; b: [number, number]; h: number }
  | { id: string; t: 'door'; a: [number, number]; b: [number, number] }
  | { id: string; t: 'area'; r: Rect; k: AreaKind; h: number }
  | { id: string; t: 'tree'; x: number; y: number }
  | { id: string; t: 'tent'; x: number; y: number; c: string }
  | { id: string; t: 'gate'; x: number; y: number; w: number; yaw: number; label: string }
  | { id: string; t: 'text'; x: number; y: number; label: string };

export interface Booth { id: string; x: number; y: number; yaw: number; title: string; sub: string; color: string }
export interface CarnivalGate { id: string; x: number; y: number; w: number; yaw: number; title: string; style?: 'arch' | 'towers' | 'utsavpur' }
/** steel + solar-panel canopy over a rectangle; h = low (north) eave height, the south edge sits 4 ft higher */
export interface Canopy { id: string; r: Rect; h: number }
/** row of wooden shoe-stand modules starting at (x,y), running along yaw (0 = east), n modules of 6 ft */
export interface ShoeRow { id: string; x: number; y: number; yaw: number; n: number }
/** visitor ramp: starts at (x,y) (the doorway) and runs len ft along yaw, w wide, rising h ft; lane = width of a ground queue line beside it (+ left of travel, − right) */
export interface Ramp { id: string; x: number; y: number; yaw: number; len: number; w: number; h: number; lane: number; flat?: boolean }
/** festival display in the style of last year's annakut photo (tiered food pyramid, tiled-roof backdrop); back against +y at yaw 0 */
export interface Display { id: string; x: number; y: number; w: number; d: number; yaw: number }
export interface Annakut { id: string; x: number; y: number; w: number; d: number; yaw: number }

export const FESTIVALS: [string, string, string][] = [
  ['UTTARAYAN', 'The Kite of Niyam · Makar Sankranti · January', '#1f7a8a'],
  ['MAHA SHIVRATRI', 'Festival of Shiva · February', '#5b3fa0'],
  ['HOLI', 'Festival of Colours · March', '#d6249f'],
  ['RAM NAVAMI', 'Birth of Shri Ram · April', '#e8620a'],
  ['GURU PURNIMA', 'Honouring the Guru · July', '#c9961a'],
  ['RAKSHA BANDHAN', 'Bond of Protection · August', '#c2185b'],
  ['JANMASHTAMI', 'Birth of Shri Krishna · August', '#2a5db0'],
  ['GANESH CHATURTHI', 'Festival of Ganeshji · September', '#e07a1f'],
  ['NAVRATRI', 'Nine Nights of Garba · October', '#8a1d28'],
  ['DIWALI', 'Festival of Lights · Annakut', '#2f8f5b'],
];
/** KDC corner: where the straight east boundary (x 241.5) meets the NNW diagonal edge of the lot (from the DWG hull) */
export const KDC_J: [number, number] = [241.5, 375.8];
/** 10 festival booths (16 ft square) down the east wall of the KDC strip, fronts facing west. r[1] = east wall, r[3] = the corner (north end);
 *  booth 10 starts 97 ft south of the corner (after the 15.7 ft opening + 3 activity slots of 25.4 ft), booths sit on a 24.6 ft pitch (client's KDC layout) */
export function lineBooths(r: Rect): Booth[] {
  return FESTIVALS.map(([title, sub, color], i) => ({ id: 'b' + i, x: r[1] - 12, y: r[3] - 107.1 - (9 - i) * 24.6, yaw: 180, title, sub, color }));
}

/** Assembly Hall exhibition layout (hall-frame feet), from the client's pipe-and-drape layout drawing */
export type ExKind =
  | 'line' | 'photo' | 'calendar' | 'santMilan' | 'nvVarni' | 'capa' | 'indiaMap' | 'stages' | 'house' | 'tv' | 'mirror'
  | 'dioramaGod' | 'dioramaGuru' | 'nvBox' | 'lotus' | 'mandir' | 'shastra' | 'sant' | 'arrow' | 'label'
  // KDC (outdoor, east strip + corner pocket)
  | 'shootout' | 'steps' | 'quest' | 'moonwalker' | 'castle' | 'actSpace' | 'rath' | 'path' | 'pocket' | 'fence'
  // facility front + pick-up lanes
  | 'peacock' | 'woodArt' | 'washRow' | 'barrier';
/** kinds drawn by the facility-front / drop-off layer (peacock pillars, art panel, wall-wash lights, barricades) */
export const SITE_KINDS = new Set<ExKind>(['peacock', 'woodArt', 'washRow', 'barrier']);
/** kinds that belong to KDC rather than the Assembly Hall exhibition */
export const KDC_KINDS = new Set<ExKind>(['shootout', 'steps', 'quest', 'moonwalker', 'castle', 'actSpace', 'rath', 'path', 'pocket', 'fence']);
export interface ExItem { id: string; kind: ExKind; x: number; y: number; yaw: number; w: number; d: number; t?: string }
/** pipe-and-drape run (centre line a→b), h ft tall */
export interface DrapeRun { id: string; a: [number, number]; b: [number, number]; h: number }
/** label, default footprint (w×d ft) and facing for each exhibit kind */
export const EX_KINDS: Record<ExKind, { label: string; w: number; d: number; yaw: number; color: string }> = {
  line: { label: 'Line (queue)', w: 19, d: 38, yaw: 0, color: '#6f8fc9' },
  photo: { label: 'Photo booth', w: 15, d: 24, yaw: 0, color: '#c98fc2' },
  calendar: { label: 'Calendar distribution', w: 16, d: 20, yaw: 0, color: '#c9b26f' },
  santMilan: { label: 'Sant Milan', w: 14, d: 5.5, yaw: 0, color: '#c9886f' },
  nvVarni: { label: 'Neelkanth Varni (mandala + murti)', w: 16, d: 11, yaw: 90, color: '#e0a64a' },
  capa: { label: 'CAPA booth', w: 12, d: 10, yaw: 0, color: '#b23a48' },
  indiaMap: { label: 'Interactive India map', w: 12, d: 12, yaw: 90, color: '#4a9a6a' },
  stages: { label: '16 stages (L-wall + lily pads)', w: 24, d: 32, yaw: 0, color: '#d6a24a' },
  house: { label: 'Hindu House', w: 24, d: 24, yaw: 270, color: '#9a7ad0' },
  tv: { label: 'TV / touch-screen kiosk', w: 4.2, d: 2.6, yaw: 270, color: '#5a8ad0' },
  mirror: { label: 'Mirror activity', w: 10, d: 4, yaw: 270, color: '#d0b04a' },
  dioramaGod: { label: 'Diaroma 1 (Who is God?)', w: 8, d: 2, yaw: 270, color: '#6a7ad0' },
  dioramaGuru: { label: 'Diaroma 2 (Why a Guru?)', w: 8, d: 2, yaw: 90, color: '#a08050' },
  nvBox: { label: 'Nilkanth Varni box', w: 3.5, d: 3.5, yaw: 90, color: '#d6b04a' },
  lotus: { label: 'Lotus activity', w: 12, d: 2, yaw: 0, color: '#e06a8a' },
  mandir: { label: 'Centerpiece · Mandir bay', w: 10.5, d: 3, yaw: 180, color: '#c79a6b' },
  shastra: { label: 'Centerpiece · Shastra bay', w: 10.5, d: 3, yaw: 235, color: '#c79a6b' },
  sant: { label: 'Centerpiece · Sant bay', w: 10.5, d: 3, yaw: 125, color: '#c79a6b' },
  arrow: { label: 'Flow arrow', w: 3, d: 1, yaw: 0, color: '#2a5db0' },
  label: { label: 'Floor label', w: 6, d: 2, yaw: 0, color: '#999999' },
  // w = depth (front-to-back, local x), d = width along the wall (local y); front = +x
  shootout: { label: 'KDC · Sports shootout', w: 13, d: 24, yaw: 180, color: '#e0652e' },
  steps: { label: 'KDC · Kids Diwali steps', w: 12, d: 22, yaw: 180, color: '#f0a020' },
  actSpace: { label: 'KDC · Space for activity', w: 24.6, d: 25.4, yaw: 180, color: '#f2d230' },
  quest: { label: 'KDC · Quest challenge', w: 13, d: 24, yaw: 217.1, color: '#6a4ad0' },
  moonwalker: { label: 'KDC · Moonwalker challenge', w: 12, d: 24, yaw: 217.1, color: '#2a9ad0' },
  castle: { label: 'KDC · 7-in-1 castle', w: 16, d: 22, yaw: 217.1, color: '#d0453a' },
  rath: { label: 'KDC · Rath turnaround (~16 ft)', w: 16.4, d: 16.4, yaw: 0, color: '#e0282e' },
  path: { label: 'KDC · Route line', w: 105.5, d: 3.7, yaw: 90, color: '#c9a227' },
  pocket: { label: 'KDC · Pocket (95 × 62 ft)', w: 62, d: 95, yaw: 217.1, color: '#e0282e' },
  fence: { label: 'KDC · Barricade', w: 24.6, d: 0.5, yaw: 180, color: '#8a5a3a' },
  // facility front (front = +x; peacock: t = 'L' | 'R' = which side of the doorway, as seen by visitors; washRow: t = colour, w = length of the 4-light row)
  peacock: { label: 'Welcome peacock pillar', w: 4.6, d: 4.6, yaw: -90, color: '#2a8a9a' },
  woodArt: { label: 'Entrance art panel (island)', w: 1.2, d: 8, yaw: -90, color: '#b8803f' },
  washRow: { label: 'Facade wash lights (row of 4)', w: 27, d: 1.5, yaw: 0, color: '#3b6cff' },
  barrier: { label: 'Barricade run (lanes)', w: 100, d: 0.5, yaw: 0, color: '#e8e8e8' },
};

export interface Edits {
  v: 1;
  rev?: number;
  zones: Zone[];
  signs: Pt[];
  shuttles: Pt[];
  added: Added[];
  /** base items hidden: w=wall g=glass d=door p=planter k=sidewalk t=tree l=light pole, followed by the index */
  hidden: string[];
  wallH: Record<string, number>; // 'w12' -> height ft
  erase: Rect[];
  booths: Booth[];
  carnival: CarnivalGate[];
  annakut: Annakut[];
  canopies: Canopy[];
  shoes: ShoeRow[];
  ramps: Ramp[];
  displays: Display[];
  drapes: DrapeRun[];
  exItems: ExItem[];
  under: { on: boolean; op: number; s: number; x: number; y: number };
}

/** the straight part of the KDC strip: west edge of the aisle, east boundary, south end, corner */
export const KDC_ZONE: Rect = [190, 241.5, 20, 375.8];
const OLD_KDC_ZONE: Rect = [134, 215, 349, 525];

/** Diwali 2027 starts with the campus as built (DWG, solar canopy) and no event layout. The 2026 layout is in archive/2026. */
export const DEFAULT_EDITS: Edits = {
  v: 1,
  rev: 7,
  zones: [],
  signs: [],
  shuttles: [],
  added: [],
  hidden: [],
  wallH: {},
  erase: [],
  booths: [],
  carnival: [],
  annakut: [],
  canopies: [{ id: 'cp1', r: [-62, 178, 205, 316], h: 14 }],
  shoes: [],
  ramps: [],
  displays: [],
  drapes: [],
  exItems: [],
  under: { on: false, op: 0.5, s: 1 / 1.6, x: -845 / 1.6, y: 915 / 1.6 },
};

// Diwali 2027 has its own campus layout; the 2026 one stays under lightplot.campus.edits.v1 for the archive
const KEY = 'lightplot.2027.campus.edits.v1';
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
function load(): Edits {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null;
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.v === 1) {
        const m = { ...clone(DEFAULT_EDITS), ...p };
        if ((p.rev ?? 1) < 2) {
          m.carnival = m.carnival.map((c: any) => (c.w === 40 ? { ...c, w: 24 } : c));
        }
        if ((p.rev ?? 1) < 3) m.carnival = clone(DEFAULT_EDITS.carnival); // moved to the side entrance, new arch style
        if ((p.rev ?? 1) < 4) {
          m.rev = 4;
          m.annakut = clone(DEFAULT_EDITS.annakut); // darshan layout from the sketch
          m.ramps = clone(DEFAULT_EDITS.ramps);
        }
        if ((p.rev ?? 1) < 5) { m.rev = 5; m.drapes = clone(DEFAULT_EDITS.drapes); m.exItems = clone(DEFAULT_EDITS.exItems); }
        if ((p.rev ?? 1) < 6) {
          m.rev = 6;
          // KDC: booths 8–10 were outside the property line. Re-seat the booth line and zone on the real east wall, unless the user already moved them.
          const oldB = FESTIVALS.map((_, i) => ({ x: OLD_KDC_ZONE[1] - 9, y: OLD_KDC_ZONE[2] + 9 + i * 17 }));
          if (m.booths.length === 10 && m.booths.every((b: Booth, i: number) => Math.abs(b.x - oldB[i].x) < 0.5 && Math.abs(b.y - oldB[i].y) < 0.5)) {
            const nb = lineBooths(KDC_ZONE);
            m.booths = m.booths.map((b: Booth, i: number) => ({ ...b, x: nb[i].x, y: nb[i].y, yaw: nb[i].yaw }));
          }
          m.zones = m.zones.map((z: Zone) => (z.id === 'kdc' && z.r.every((v, i) => v === OLD_KDC_ZONE[i]) ? { ...z, r: [...KDC_ZONE] as Rect } : z));
          m.erase = [...(m.erase || []), ...clone(DEFAULT_EDITS.erase)];
          if (!m.exItems.some((q: ExItem) => KDC_KINDS.has(q.kind))) m.exItems = [...m.exItems, ...clone(DEFAULT_EDITS.exItems).filter((q: ExItem) => KDC_KINDS.has(q.kind))];
        }
        if ((p.rev ?? 1) < 7) {
          m.rev = 7;
          // real Utsavpur gate at the KDC marker (only if the old gate is still at the side-entrance default); lanes replace the old single pick-up zone
          m.carnival = m.carnival.map((c: CarnivalGate) => (Math.abs(c.x - 36) < 0.5 && Math.abs(c.y + 34) < 0.5 ? clone(DEFAULT_EDITS.carnival[0]) : { ...c, style: 'utsavpur' }));
          const pk = m.zones.find((z: Zone) => z.id === 'pick');
          if (pk && pk.r.join() === '-240,170,-72,-32') m.zones = [...m.zones.filter((z: Zone) => z.id !== 'pick'), ...clone(DEFAULT_EDITS.zones).filter((z: Zone) => ['walk', 'lane3', 'lane2', 'lane1'].includes(z.id))];
          if (!m.exItems.some((q: ExItem) => SITE_KINDS.has(q.kind))) m.exItems = [...m.exItems, ...clone(DEFAULT_EDITS.exItems).filter((q: ExItem) => SITE_KINDS.has(q.kind))];
        }
        return m;
      }
    }
  } catch { /* unreadable */ }
  return clone(DEFAULT_EDITS);
}

interface S {
  e: Edits;
  past: Edits[];
  future: Edits[];
  /** apply a change without adding an undo step (use during drags, after checkpoint()) */
  live: (fn: (e: Edits) => void) => void;
  checkpoint: () => void;
  commit: (fn: (e: Edits) => void) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  importJSON: (j: any) => boolean;
}
export const useCE = create<S>((set, get) => ({
  e: load(),
  past: [],
  future: [],
  live: (fn) => set((s) => { const e = clone(s.e); fn(e); return { e }; }),
  checkpoint: () => set((s) => ({ past: [...s.past.slice(-60), clone(s.e)], future: [] })),
  commit: (fn) => { get().checkpoint(); get().live(fn); },
  undo: () => set((s) => (s.past.length ? { e: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [clone(s.e), ...s.future] } : s)),
  redo: () => set((s) => (s.future.length ? { e: s.future[0], future: s.future.slice(1), past: [...s.past, clone(s.e)] } : s)),
  reset: () => { get().checkpoint(); set({ e: clone(DEFAULT_EDITS) }); },
  importJSON: (j) => {
    if (!j || j.v !== 1) return false;
    get().checkpoint();
    set({ e: { ...clone(DEFAULT_EDITS), ...j } });
    return true;
  },
}));
if (typeof window !== 'undefined') {
  let t: any;
  useCE.subscribe((s) => {
    clearTimeout(t);
    t = setTimeout(() => { try { window.localStorage.setItem(KEY, JSON.stringify(s.e)); } catch { /* storage full/blocked */ } }, 250);
  });
}

let n = 0;
export const newId = (p: string) => `${p}${Date.now().toString(36)}${(n++).toString(36)}`;

/* ───────── applying edits to the base data ───────── */
export const inRect = (x: number, y: number, r: Rect) => x >= r[0] && x <= r[1] && y >= r[2] && y <= r[3];
export const normRect = (a: number[], b: number[]): Rect => [Math.min(a[0], b[0]), Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[1], b[1])];
const cen = (p: PolyJ): [number, number] => {
  let x = 0, y = 0;
  for (const q of p.o) { x += q[0]; y += q[1]; }
  return [x / p.o.length, y / p.o.length];
};

/** Base data with hidden / erased items removed. Walls keep their original index in `_i` so height overrides still match. */
export function editedData(d: CampusData, e: Edits): CampusData {
  const hid = new Set(e.hidden);
  const er = e.erase;
  const gone = (x: number, y: number) => er.some((r) => inRect(x, y, r));
  const keepSeg = (s: number[]) => !gone((s[0] + s[2]) / 2, (s[1] + s[3]) / 2);
  const keepPt = (p: number[]) => !gone(p[0], p[1]);
  const keepPoly = (prefix: string) => (p: PolyJ, i: number) => !hid.has(prefix + i) && !gone(...cen(p));
  const s = d.site;
  return {
    ...d,
    walls: d.walls.map((w, i) => ({ ...w, _i: i })).filter((w) => !hid.has('w' + w._i) && !gone(...cen(w))),
    glass: d.glass.filter((g, i) => !hid.has('g' + i) && keepSeg(g)),
    doors: d.doors.filter((x: any, i) => {
      if (hid.has('d' + i)) return false;
      return x.t === 'leaf' ? !gone(x.r[0][0], x.r[0][1]) : !gone((x.a[0] + x.b[0]) / 2, (x.a[1] + x.b[1]) / 2);
    }),
    site: {
      ...s,
      planters: s.planters.filter(keepPoly('p')),
      walks: s.walks.filter(keepPoly('k')),
      trees: s.trees.filter((t, i) => !hid.has('t' + i) && keepPt(t)),
      poles: s.poles.filter((t, i) => !hid.has('l' + i) && keepPt(t)),
      stalls: s.stalls.filter(keepSeg),
      curbs: s.curbs.filter(keepSeg),
      conc: s.conc.filter(keepSeg),
      fences: s.fences.filter(keepSeg),
      rails: s.rails.filter(keepSeg),
      ada: s.ada.filter(keepPt),
      hydrants: s.hydrants.filter(keepPt),
      slots: s.slots.filter(keepPt),
    },
  };
}
export { cen as polyCentre };
