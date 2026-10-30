// Design for the Diwali Exhibition 2026 in the Assembly Hall, placed exactly on the client's layout drawing.
// The drawing is read with its bottom edge = the hall's SOUTH wall and its left edge = the WEST wall, stretched to the
// audience floor (119.5′ × 95.2′): px → ft  x = px·0.0905,  y = 95.17 − py·0.1327.  This puts the drawing's "Exit" on door
// S1 and its "Entrance" beside door S2c, and makes the 24′×24′ house square.
// Each exhibit carries the items from the Final Content Proposal slides.
import type { Item, Probe, Project, SectionId, V2 } from './types';
import { DEFAULT_INVENTORY } from './fixtures';
import { FESTIVAL_POSTERS } from './content';
import { houseXY, itemSurfaces } from './catalog';
import type { Surface } from './types';

let n = 0;
const id = (p: string) => `${p}${++n}`;

function it(type: string, name: string, section: SectionId, x: number, y: number, rot: number, params: Record<string, any> = {}, extra: Partial<Item> = {}): Item {
  return { id: extra.id || id(type.slice(0, 3)), type, name, section, x, y, rot, params, ...extra };
}
function run(name: string, section: SectionId, pts: [number, number][], params: Record<string, any>, idv?: string): Item {
  const [ox, oy] = pts[0];
  return { id: idv || id('drp'), type: 'drape', name, section, x: ox, y: oy, rot: 0, params, points: pts.map(([x, y]) => ({ x: x - ox, y: y - oy })) };
}
function line(type: string, name: string, section: SectionId, pts: [number, number][], params: Record<string, any> = {}): Item {
  const [ox, oy] = pts[0];
  return { id: id(type.slice(0, 3)), type, name, section, x: ox, y: oy, rot: 0, params, points: pts.map(([x, y]) => ({ x: x - ox, y: y - oy })) as V2[] };
}
function rig(type: 'tbar' | 'crank' | 'pipebar', name: string, section: SectionId, x: number, y: number, rot: number, h: number, idv: string): Item {
  return it(type, name, section, x, y, rot, { h }, { id: idv });
}
function fx(name: string, section: SectionId, model: string, rigId: string, slot: number, aim: [number, number, number], ch?: Record<string, number>, dim = 1, extra: Record<string, any> = {}): Item {
  return it('fixture', name, section, 0, 0, 0, { model, mount: 'rig', rig: rigId, slot, aim: { x: aim[0], y: aim[1], z: aim[2] }, ch, dim, ...extra });
}
/** fixture hung on a side arm from a pipe & drape run's steel light pipe, u ft along the run from its first point */
function fxD(name: string, section: SectionId, model: string, runId: string, u: number, aim: [number, number, number], ch?: Record<string, number>, dim = 1, extra: Record<string, any> = {}): Item {
  return it('fixture', name, section, 0, 0, 0, { model, mount: 'rig', rig: runId, u, aim: { x: aim[0], y: aim[1], z: aim[2] }, ch, dim, ...extra });
}
const MASK = { h: 12, color: 'black', fullness: 0.5 };
const LIGHT_PIPE = { lightPipe: true };
function fxAt(name: string, section: SectionId, model: string, mount: 'floor' | 'clamp', x: number, y: number, h: number, aim: [number, number, number], ch?: Record<string, number>, dim = 1, extra: Record<string, any> = {}): Item {
  return it('fixture', name, section, x, y, 0, { model, mount, h, aim: { x: aim[0], y: aim[1], z: aim[2] }, ch, dim, ...extra });
}

const WARM_RGBW = { r: 0.55, g: 0.22, b: 0, w: 1 };
const AMBER_RGBW = { r: 1, g: 0.42, b: 0, w: 0.35 };
const SAFFRON_WW = { r: 1, g: 0.3, b: 0, w: 0.15 };
const DEG = Math.PI / 180;
const ahead = (x: number, y: number, rot: number, d: number): [number, number] => [x + Math.cos(rot * DEG) * d, y + Math.sin(rot * DEG) * d];

/** zone box from the drawing: x0..x1, y0..y1 in hall feet */
function zone(name: string, section: SectionId, x0: number, x1: number, y0: number, y1: number, isSectionBox = false, idv?: string): Item {
  return it('booth', name, section, (x0 + x1) / 2, (y0 + y1) / 2, 90, { w: x1 - x0, d: y1 - y0, title: name, zone: isSectionBox }, idv ? { id: idv } : {});
}

export function defaultProject(): Project {
  n = 0;
  const items: Item[] = [];
  const add = (...xs: Item[]) => items.push(...xs);
  const sfOf = (item: Item) => (key: string): Surface => itemSurfaces(item).find((q) => q.id === `${item.id}:${key}`)!;
  const at = (q: Surface, z = q.c.z): [number, number, number] => [q.c.x, q.c.y, z];

  // ——— THE DRAWING'S BOXES (section boxes first so their titles anchor the labels) ———
  add(
    zone('Hindu Festivals', 's1', 59.3, 84.6, 5.6, 29.5, true, 'zS1'),
    zone('Rites & Traditions', 's2', 87.1, 114.1, 3.3, 34.8, true, 'zS2'),
    zone('The Hindu Way of Life', 's3', 90.8, 115.9, 48.4, 74.6, true, 'zS3'),
    zone('Beliefs & Worldview', 's4', 66.8, 82.1, 65.3, 91.5, true, 'zS4'),
    zone('Core Values', 's5', 37.7, 60.6, 65.3, 91.5, true, 'zS5'),
    zone('Adhar Stambh', 's6', 56.6, 86.0, 34.8, 60.9, true, 'zS6'),
    zone('Line', 'infra', 3.2, 31.6, 65.3, 91.5),
    zone('Photo booth', 'photo', 3.35, 19.3, 44.2, 60.4),
    zone('Outreach', 'infra', 26.4, 42.5, 44.2, 60.4),
    zone('Sant Milan', 'infra', 3.35, 19.3, 25.9, 42.1),
    zone('Calendar distribution', 'infra', 26.4, 42.5, 25.9, 42.1),
    zone('Neelkanth Varni', 'infra', 3.35, 19.3, 3.3, 24.2),
    zone('Welcome to Diwali', 'entry', 40.7, 56.8, 3.3, 29.5),
    { ...zone('Entrance', 'entry', 43.9, 54.3, 5.2, 11.3), params: { w: 10.4, d: 6.1, title: 'Entrance', zone: true } },
    { ...zone('Exit', 'infra', 7.2, 14.9, 0.2, 2.6), params: { w: 7.7, d: 2.4, title: 'Exit', zone: true } },
    { ...zone('Centerpiece', 'infra', 43.9, 56.2, 34.8, 60.9), params: { w: 12.3, d: 26.1, title: 'Centerpiece', zone: true } },
  );

  // ——— PIPE & DRAPE: perimeter masking (12′ black, 1.5′ off the walls, broken ≥2′ clear of every door) ———
  add(
    run('Masking — west wall (south)', 'infra', [[1.5, 3], [1.5, 34.3]], MASK, 'pmW1'),
    run('Masking — west wall (north)', 'infra', [[1.5, 60.8], [1.5, 93]], MASK, 'pmW2'),
    run('Masking — south wall (between S1 and S2)', 'infra', [[18, 1.5], [24, 1.5]], MASK, 'pmS1'),
    run('Masking — south wall behind Welcome (light pipe)', 'entry', [[48.5, 1.5], [57.5, 1.5]], { ...MASK, ...LIGHT_PIPE }, 'pmS2'),
    run('Masking — north wall', 'infra', [[21, 93.7], [90, 93.7]], MASK, 'pmN1'),
    run('Masking — north wall behind the house (light pipe)', 's3', [[90, 93.7], [108.2, 93.7]], { ...MASK, ...LIGHT_PIPE }, 'pmN2'),
    run('Stage masking (south half)', 'infra', [[118.8, 19.5], [118.8, 47]], MASK, 'pmStS'),
    run('Stage masking + House backdrop (14′ light pipe)', 's3', [[118.8, 47], [118.8, 75.8]], { h: 14, color: 'black', fullness: 0.5, ...LIGHT_PIPE }, 'pmStN'),
  );

  // ——— WELCOME TO DIWALI (entrance at door S2c, bottom of the drawing) ———
  add(
    it('banner', 'Welcome to Diwali', 'entry', 48.8, 20, 270, { w: 8, h: 8, bottom: 0, title: 'Welcome to Diwali', sub: 'Diwali Exhibition 2026 · Timeless Hindu Heritage', style: 'saffron', feet: true }),
    it('posterStand', 'Exhibition map & flow', 'entry', 54.5, 12, 270, { w: 2.5, h: 4, bottom: 1.8, title: 'Welcome — Exhibition Map', style: 'saffron' }),
  );
  add(
    fxD('Welcome wash L', 'entry', 'rgbwPar200', 'pmS2', 1.5, [47, 19.9, 4.6], AMBER_RGBW, 0.6),
    fxD('Welcome wash R', 'entry', 'rgbwPar200', 'pmS2', 3.5, [50.6, 19.9, 4.6], AMBER_RGBW, 0.6),
    fxD('Welcome map poster', 'entry', 'gallery30', 'pmS2', 6, [54.5, 12.05, 3.8], { ww: 1 }, 0.5),
  );

  // ——— 1 HINDU FESTIVALS (interactive India map + poster wall along the south wall) ———
  add(
    it('mapDeck', 'Interactive India map — Many Traditions. One Light.', 's1', 72, 16.5, 90, { w: 12, d: 12, h: 3, divos: 44 }),
    run('Festival poster wall (ivory)', 's1', [[58.7, 3.5], [86.3, 3.5]], { h: 10, color: 'ivory', fullness: 0.5 }, 'drPosters'),
    it('banner', 'Header — Many Traditions. One Light.', 's1', 72.5, 3.72, 90, { w: 18, h: 2.1, bottom: 7.4, title: 'MANY TRADITIONS. ONE LIGHT.', sub: 'Hindu Festivals', style: 'cream', feet: false, onDrape: true }),
    run('Festivals — north backdrop (light pipe)', 's1', [[60.5, 30], [82, 30]], { h: 10, color: 'black', fullness: 0.5, ...LIGHT_PIPE }, 'drFestN'),
    it('signStand', 'Section 1 sign', 's1', 61.5, 25.5, 180, { title: 'Hindu Festivals', num: 1 }),
    { ...rig('pipebar', 'Poster light pipe W', 's1', 66, 9.2, 90, 10, 'pbF1'), params: { h: 10, w: 12 } },
    { ...rig('pipebar', 'Poster light pipe E', 's1', 79.5, 9.2, 90, 10, 'pbF2'), params: { h: 10, w: 12 } },
  );
  const posterX = (i: number) => 60.3 + i * 3.45;
  for (let i = 0; i < 8; i++) add(it('poster', `Poster — ${FESTIVAL_POSTERS[i]}`, 's1', posterX(i), 3.68, 90, { w: 2.4, h: 5, bottom: 1.6, title: FESTIVAL_POSTERS[i] }));
  for (let i = 0; i < 8; i++) add(fx(`Posters ${i + 1}`, 's1', 'gallery30', i < 4 ? 'pbF1' : 'pbF2', 0, [posterX(i), 3.7, 4.1], { ww: 1 }, 0.38, { u: posterX(i) - (i < 4 ? 66 : 79.5) }));
  add(
    fxD('Map key W', 's1', 'cobPar100', 'drFestN', 9.5, [69.5, 17.5, 3.2], { ww: 1, cw: 1 }),
    fxD('Map key E', 's1', 'cobPar100', 'drFestN', 13.5, [74.5, 17.5, 3.2], { ww: 1, cw: 1 }),
    fxD('Map photo key', 's1', 'fresnel200', 'drFestN', 11.5, [72, 24.5, 5], { ww: 1, cw: 0.25 }, 0.12, { zoom: 45 }),
  );

  // ——— 2 RITES & TRADITIONS (engraved L-wall in the south-east corner, lily-pad path) ———
  const lwall = it('lwall', 'Game of Life — 16 Sacred Steps (engraved panel wall)', 's2', 87.77, 1.0, 90, { runA: 24, corner: 4, runB: 32, depth: 2, h: 8, mirror: false }, { id: 'lwall' });
  const LW = sfOf(lwall);
  const mid = (a: Surface, b: Surface, z = 4.3): [number, number, number] => [(a.c.x + b.c.x) / 2, (a.c.y + b.c.y) / 2, z];
  add(
    lwall,
    line('lilyPath', 'Lily pads (16)', 's2', [[90, 8.6], [93.5, 8.6], [98.5, 9.8], [103.9, 8.6], [108.3, 12], [109.8, 18.2], [109.2, 25], [111.2, 32.1]], { n: 16, r: 1.1 }),
    it('signStand', 'Section 2 sign', 's2', 88.5, 27, 180, { title: 'Rites & Traditions', num: 2 }),
    rig('crank', 'Rites stand — south run (crank + 6′ truss)', 's2', 100, 15.5, 270, 12, 'crS2a'),
    rig('crank', 'Rites stand — east run (crank + 6′ truss)', 's2', 101, 24, 0, 12, 'crS2b'),
  );
  add(
    fx('Panels 1–2', 's2', 'gallery30', 'crS2a', 5, mid(LW('p1'), LW('p2')), { ww: 1 }),
    fx('Panels 3–4', 's2', 'gallery30', 'crS2a', 4, mid(LW('p3'), LW('p4')), { ww: 1 }),
    fx('South run wash', 's2', 'rgbwPar200', 'crS2a', 3, mid(LW('p4'), LW('p5'), 4.4), WARM_RGBW, 0.8),
    fx('Panels 5–6', 's2', 'gallery30', 'crS2a', 2, mid(LW('p5'), LW('p6')), { ww: 1 }),
    fx('Panels 7–8', 's2', 'gallery30', 'crS2a', 1, mid(LW('p7'), LW('p8')), { ww: 1 }),
    fx('Corner intro', 's2', 'gallery30', 'crS2a', 0, at(LW('intro'), 4.3), { ww: 1 }, 0.8),
    fx('Panels 15–16', 's2', 'gallery30', 'crS2b', 0, [LW('p16').c.x, LW('p15').c.y * 0.35 + LW('p16').c.y * 0.65, 4.3], { ww: 1 }),
    fx('Panels 13–14', 's2', 'gallery30', 'crS2b', 1, mid(LW('p13'), LW('p14')), { ww: 1 }),
    fx('East run wash', 's2', 'rgbwPar200', 'crS2b', 2.5, mid(LW('p12'), LW('p13'), 4.4), WARM_RGBW, 0.8),
    fx('Panels 11–12', 's2', 'gallery30', 'crS2b', 4, mid(LW('p11'), LW('p12')), { ww: 1 }),
    fx('Panels 9–10', 's2', 'gallery30', 'crS2b', 5, mid(LW('p9'), LW('p10')), { ww: 1 }),
  );
  // the two angled guide bars between Rites and the house
  add(
    run('Guide bar to House (west, light pipe)', 's3', [[84, 35.5], [91.2, 48.7]], { h: 8, color: 'black', fullness: 0.5, ...LIGHT_PIPE }, 'drGuideW'),
    run('Guide bar to House (east)', 's3', [[97.6, 46.7], [115.4, 36.8]], { h: 8, color: 'black', fullness: 0.5 }, 'drGuideE'),
  );

  // ——— 3 HINDU WAY OF LIFE (24′×24′ walk-through house, entrance facing Rites to the south) ———
  const house = it('house', 'Hindu House (walk-through)', 's3', 103.35, 61.5, 270, { w: 24, d: 24, h: 8, wall: 2, entry: [10.5, 13.5], exit: [1.5, 4.5], tau: 0.55 }, { id: 'house' });
  add(
    house,
    it('banner', 'House sign — Hindu Way of Life', 's3', 95.1, 49.3, 270, { w: 5, h: 2, bottom: 5.6, title: 'Hindu Way of Life', sub: 'Section 3', style: 'maroon', feet: false, onDrape: true }),
    it('banner', 'House title — The Hindu Way of Life (north face)', 's3', 101.1, 73.65, 90, { w: 12, h: 2.5, bottom: 5.4, title: 'THE HINDU WAY OF LIFE', sub: 'Hindu Jivan Shaili', style: 'cream', feet: false, onDrape: true }),
  );
  const H = houseXY(house);
  const hp = (sx: number, sy: number): [number, number, number] => { const q = H(sx, sy); return [q.x, q.y, 2.5]; };
  add(
    fxD('House glow — entrance side', 's3', 'cobPar200', 'pmStN', 10, hp(16, 8), { ww: 1 }),
    fxD('House glow — reading/exit', 's3', 'cobPar200', 'pmStN', 12.5, hp(7, 9), { ww: 1 }),
    fxD('House glow — mandir/living', 's3', 'cobPar200', 'pmStN', 17, hp(16, 15), { ww: 1 }),
    fxD('House glow — kitchen', 's3', 'cobPar200', 'pmStN', 21, hp(9, 18), { ww: 1 }),
  );
  add(
    fxD('House sign spot', 's3', 'gallery30', 'drGuideW', 11, [95.1, 49.2, 6.6], { ww: 1 }, 0.45),
    fxD('House title banner spot', 's3', 'gallery30', 'pmN2', 11, [101.1, 73.55, 6.65], { ww: 1 }, 1),
  );
  const clamp = (name: string, atp: [number, number], to: [number, number, number], dim: number) => {
    const a = H(atp[0], atp[1]);
    const t = H(to[0], to[1]);
    return fxAt(name, 's3', 'gallery30', 'clamp', a.x, a.y, 7.6, [t.x, t.y, to[2]], { ww: 1 }, dim);
  };
  add(
    clamp('Ghar Mandir spot', [12, 21.55], [12, 11.5, 3.5], 0.17),
    clamp('Entrance poster spot', [12, 2.45], [12, 9.2, 4.6], 0.45),
    clamp('Exit-reflection poster spot', [5.6, 21.55], [5.6, 2.1, 4.6], 0.7),
    clamp('Reading-corner poster spot', [13.5, 21.55], [2.1, 9, 4.6], 0.5),
    clamp('Living-room poster spot', [2.45, 17], [21.9, 19, 4.6], 0.6),
  );

  // ——— 4 BELIEFS & WORLDVIEW (black drape room; two rows Mirror · TV · Poster, the six nodes from the slides) ———
  add(
    run('Beliefs room — south half (light pipe)', 's4', [[66.8, 75], [66.8, 65.3], [82.1, 65.3], [82.1, 75]], { h: 10, color: 'black', fullness: 0.5, ...LIGHT_PIPE }, 'drBel1'),
    run('Beliefs room — north half (light pipe)', 's4', [[66.8, 81.5], [66.8, 91.5], [82.1, 91.5], [82.1, 81.5]], { h: 10, color: 'black', fullness: 0.5, ...LIGHT_PIPE }, 'drBel2'),
    run('Beliefs room — west header (valance + light pipe)', 's4', [[66.8, 75], [66.8, 81.5]], { h: 10, color: 'black', fullness: 0.5, valance: 1.5, sharedEnds: true, ...LIGHT_PIPE }, 'drBelW'),
    run('Beliefs room — east header (valance)', 's4', [[82.1, 75], [82.1, 81.5]], { h: 10, color: 'black', fullness: 0.5, valance: 1.5, sharedEnds: true }, 'drBelE'),
    line('zoneArea', 'Beliefs room', 's4', [[66.8, 65.3], [82.1, 65.3], [82.1, 91.5], [66.8, 91.5]], { rho: 0.03, h: 10 }),
    it('signStand', 'Section 4 sign', 's4', 84.2, 84.5, 315, { title: 'Beliefs & Worldview', num: 4 }),
    // north row (faces south): Mirror · TV · Poster
    it('mirrors', 'Node 2 — Who am I? (illuminated mirrors)', 's4', 69.4, 86.8, 270, { w: 4.6, d: 2.2, n: 2 }, { id: 'nMirror' }),
    it('tvStand', 'Node 4 — What happens after this life? (TV, tree of life forms)', 's4', 74.0, 86.6, 270, { w: 4.8, screen: 'tree' }),
    it('diorama', 'Node 1 — Who is God? (8′×8′ layered diorama + poster)', 's4', 78.9, 87.2, 215, { w: 8, h: 8, d: 2, art: 'god', nits: 110, cct: 2900 }),
    // south row (faces north): Mirror · TV · Poster
    it('fiberTower', 'Node 5 — How does God remain accessible? (fibre-optic murti)', 's4', 69.4, 71.5, 90, {}, { id: 'nFiber' }),
    it('kiosk', 'Node 3 — Why do my actions matter? (touch-screen ripple)', 's4', 74.0, 71.8, 90, { nits: 300 }),
    it('diorama', 'Node 6 — Why is a Guru important? (8′×8′ map diorama + poster)', 's4', 78.9, 69.6, 145, { w: 8, h: 8, d: 2, art: 'guru', nits: 110, cct: 2900 }),
  );
  add(
    fxAt('Mirror face light W', 's4', 'artSpot', 'clamp', 68.25, 86.6, 7.4, [69.4, 83.8, 5.25], { ww: 1, cw: 0 }, 0.2),
    fxAt('Mirror face light E', 's4', 'artSpot', 'clamp', 70.55, 86.6, 7.4, [69.4, 83.8, 5.25], { ww: 1, cw: 0 }, 0.2),
    fxD('Fibre-optic murti accent', 's4', 'artSpot', 'drBelW', 1, [69.4, 71.8, 2.6], { ww: 1, cw: 0.4 }, 0.35),
  );

  // ——— 5 CORE VALUES (activity table between two angled lotus boards) ———
  const lotusN = it('nailWall', 'Lotus board — The Lotus (poster + nail art)', 's5', 46.6, 87.2, 302, { w: 8, h: 8, d: 2, table: false, poster: true }, { id: 'lotusN' });
  const lotusS = it('nailWall', 'Lotus board — nail art', 's5', 46.6, 68.6, 55, { w: 8, h: 8, d: 2, table: false, poster: false }, { id: 'lotusS' });
  const LN = sfOf(lotusN), LS = sfOf(lotusS);
  add(
    it('table', 'Activity — Hindu Mulya lotus peg board (Sankalp cards & bands)', 's5', 41.7, 77.7, 0, { w: 10, d: 4, h: 2.5 }),
    lotusN,
    lotusS,
    it('signStand', 'Section 5 sign', 's5', 62, 89.5, 0, { title: 'Hindu Core Values', num: 5 }),
  );
  const rakeN = ahead(lotusN.x, lotusN.y, 302, 6), rakeS = ahead(lotusS.x, lotusS.y, 55, 6);
  add(
    fxD('Lotus key N', 's5', 'cobPar100', 'drBel2', 2.5, at(LN('lotus'), 4.6), { ww: 1, cw: 1 }),
    fxD('Lotus poster zone N', 's5', 'gallery30', 'drBel2', 4.5, at(LN('poster'), 4.2), { ww: 1 }, 0.7),
    fxD('Lotus key S', 's5', 'cobPar100', 'drBel1', 3, at(LS('lotus'), 4.6), { ww: 1, cw: 1 }),
    fxD('Lotus board S art', 's5', 'gallery30', 'drBel1', 1, [LS('lotus').c.x - 1.5, LS('lotus').c.y + 1, 4.2], { ww: 1 }, 0.7),
    fxAt('Lotus rake N', 's5', 'rgbwPar200', 'floor', rakeN[0], rakeN[1], 0.75, [lotusN.x + 0.3, lotusN.y - 0.5, 5.5], { r: 1, g: 0.18, b: 0.25, w: 0.3 }, 0.7),
    fxAt('Lotus rake S', 's5', 'rgbwPar200', 'floor', rakeS[0], rakeS[1], 0.75, [lotusS.x + 0.3, lotusS.y + 0.5, 5.5], { r: 1, g: 0.4, b: 0, w: 0.3 }, 0.7),
  );

  // ——— CENTERPIECE + 6 ADHAR STAMBH (Shastras · Mandir · Sant, framed by the four red-square light towers) ———
  add(
    it('centerpiece', 'Centerpiece', 'infra', 50.05, 47.85, 0, { w: 24, d: 8, h: 1.2, divos: 60 }),
    it('stambh', 'Stambh — Shastras', 's6', 77.2, 57.2, 228, { w: 7, h: 10, d: 3, kind: 1 }),
    it('stambh', 'Stambh — Mandir', 's6', 82.0, 49.4, 180, { w: 7, h: 10, d: 3, kind: 0 }),
    it('stambh', 'Stambh — Sant', 's6', 78.3, 41.7, 139, { w: 7, h: 10, d: 3, kind: 2 }),
    it('signStand', 'Section 6 sign', 's6', 59, 38, 180, { title: 'Adhar Stambh', num: 6 }),
    rig('crank', 'Light tower SW', 'infra', 43.7, 31.6, 45, 14, 'twSW'),
    rig('crank', 'Light tower NW', 'infra', 43.7, 62.6, 315, 14, 'twNW'),
    rig('crank', 'Light tower SE', 'infra', 85.6, 32.1, 135, 14, 'twSE'),
    rig('crank', 'Light tower NE', 'infra', 85.6, 63.3, 225, 14, 'twNE'),
    rig('tbar', 'Adhar Stambh photo stand', 's6', 64.5, 48.5, 0, 11, 'tbS6'),
  );
  add(
    fx('Centerpiece key S', 'infra', 'cobPar200', 'twSW', 2.5, [50, 39.5, 2.5], { ww: 1 }, 1),
    fx('Centerpiece key N', 'infra', 'cobPar200', 'twNW', 2.5, [50, 56, 2.5], { ww: 1 }, 1),
    fx('Stambh rim SE', 's6', 'rgbwPar200', 'twSE', 2.5, [73.5, 47.5, 6], AMBER_RGBW, 0.45),
    fx('Stambh rim NE', 's6', 'rgbwPar200', 'twNE', 2.5, [73.5, 49.5, 6], AMBER_RGBW, 0.45),
    fx('Stambh photo key S', 's6', 'fresnel200', 'tbS6', 2, [73.5, 46.5, 5], { ww: 1, cw: 0.2 }, 0.65, { zoom: 40 }),
    fx('Stambh photo key N', 's6', 'fresnel200', 'tbS6', 1, [73.5, 50.5, 5], { ww: 1, cw: 0.2 }, 0.65, { zoom: 40 }),
    fxAt('Shastras graze', 's6', 'wallWash9x12', 'floor', 74.5, 54.2, 0.5, [76.6, 56.5, 7], SAFFRON_WW, 0.8),
    fxAt('Sant graze', 's6', 'wallWash9x12', 'floor', 75.3, 44.3, 0.5, [77.7, 42.2, 7], SAFFRON_WW, 0.8),
  );

  // ——— WEST COLUMN: LINE → PHOTO BOOTH → OUTREACH → CALENDAR → SANT MILAN / NEELKANTH VARNI → EXIT (S1) ———
  add(
    line('stanchions', 'Queue — lane 1', 'infra', [[14, 70.5], [30, 70.5]]),
    line('stanchions', 'Queue — lane 2', 'infra', [[5, 74.5], [28, 74.5]]),
    line('stanchions', 'Queue — lane 3', 'infra', [[7, 78.5], [30, 78.5]]),
    line('stanchions', 'Queue — lane 4', 'infra', [[5, 82.5], [28, 82.5]]),
    line('stanchions', 'Queue — lane 5', 'infra', [[7, 86.5], [30, 86.5]]),
    run('Booth divider — Photo booth | Sant Milan', 'infra', [[2.5, 43.15], [19.3, 43.15]], { h: 10, color: 'maroon', fullness: 0.5 }, 'drDivA'),
    run('Booth divider — Sant Milan | Neelkanth Varni', 'infra', [[2.5, 25.05], [19.3, 25.05]], { h: 10, color: 'maroon', fullness: 0.5 }, 'drDivB'),
    it('banner', 'Photo booth backdrop — Happy Diwali', 'photo', 4.6, 52.3, 0, { w: 10, h: 8, bottom: 0, title: 'Happy Diwali', sub: 'Diwali Exhibition 2026', style: 'photo', feet: true }),
    it('floorMark', 'Stand-here mark', 'photo', 8.4, 52.3, 0, {}),
    rig('tbar', 'Photo key stand', 'photo', 15.5, 48, 150, 8.5, 'tbPhL'),
    rig('tbar', 'Photo fill stand', 'photo', 15.5, 56.6, 210, 8.5, 'tbPhR'),
    it('table', 'Outreach table', 'infra', 36.5, 52.3, 180, { w: 6, d: 2.5, h: 2.5 }),
    it('signStand', 'Outreach sign', 'infra', 30, 57.5, 180, { title: 'Outreach', num: 0 }),
    it('table', 'Calendar table 1', 'infra', 31, 36, 90, { w: 6, d: 2.5, h: 2.5 }),
    it('table', 'Calendar table 2', 'infra', 38, 36, 90, { w: 6, d: 2.5, h: 2.5 }),
    it('banner', 'Sant Milan backdrop', 'infra', 4.6, 34, 0, { w: 10, h: 8, bottom: 0, title: 'Sant Milan', sub: 'Darshan & blessings', style: 'maroon', feet: true }),
    it('table', 'Sant Milan dais', 'infra', 7.5, 34, 0, { w: 7, d: 4, h: 1.2, mat: 'drapeMaroon' }),
    rig('tbar', 'Sant Milan stand', 'infra', 17, 34, 180, 10, 'tbSM'),
    it('banner', 'Neelkanth Varni backdrop', 'infra', 4.6, 14, 0, { w: 10, h: 8, bottom: 0, title: 'Neelkanth Varni', sub: 'Tapasvi · Yogi · Guide', style: 'night', feet: true }),
    it('table', 'Neelkanth Varni murti riser', 'infra', 7.2, 14, 0, { w: 5, d: 3.5, h: 3, mat: 'woodDark' }),
    rig('tbar', 'Neelkanth Varni stand', 'infra', 17, 14, 180, 10, 'tbNV'),
  );
  add(
    fx('Photo key', 'photo', 'fresnel200', 'tbPhL', 1.5, [8.4, 52.3, 5.2], { ww: 1, cw: 0.3 }, 0.45, { zoom: 40 }),
    fx('Photo fill', 'photo', 'fresnel200', 'tbPhR', 1.5, [8.4, 52.3, 5.2], { ww: 1, cw: 0.3 }, 0.24, { zoom: 45 }),
    fx('Sant Milan key', 'infra', 'fresnel200', 'tbSM', 1.5, [9.8, 34, 4.4], { ww: 1, cw: 0.2 }, 0.45, { zoom: 45 }),
    fx('Neelkanth Varni murti', 'infra', 'gallery30', 'tbNV', 1, [7.2, 14, 4], { ww: 1 }, 0.4),
    fx('Neelkanth Varni backdrop', 'infra', 'gallery30', 'tbNV', 2, [4.7, 14, 5], { ww: 1 }, 0.4),
  );

  const hq = (sx: number, sy: number) => H(sx, sy);
  const mandirSpot = hq(15.5, 12.4);
  const livingSpot = hq(17, 18);
  const lotusSpot = ahead(lotusN.x, lotusN.y, 302, 3.5);
  const probes: Probe[] = [
    { id: 'pb1', name: 'Welcome to Diwali', x: 48.8, y: 17.5, facing: 270, section: 'entry' },
    { id: 'pb2', name: 'India map — north side photo', x: 72, y: 24.6, facing: 90, section: 's1' },
    { id: 'pb3', name: 'In front of the festival posters', x: 72, y: 7.2, facing: 90, section: 's1' },
    { id: 'pb4', name: 'Rites — on a lily pad', x: 109.8, y: 18.2, facing: 180, section: 's2' },
    { id: 'pb5', name: 'House — by the Ghar Mandir', x: mandirSpot.x, y: mandirSpot.y, facing: 90, section: 's3' },
    { id: 'pb6', name: 'House — living room', x: livingSpot.x, y: livingSpot.y, facing: 150, section: 's3' },
    { id: 'pb7', name: 'Beliefs — at the Who am I? mirrors', x: 69.4, y: 83.6, facing: 90, section: 's4' },
    { id: 'pb8', name: 'Beliefs — centre aisle', x: 74.5, y: 78.4, facing: 0, section: 's4' },
    { id: 'pb9', name: 'Core values — at the lotus board', x: lotusSpot[0], y: lotusSpot[1], facing: 302, section: 's5' },
    { id: 'pb10', name: 'Adhar Stambh — group photo', x: 73.5, y: 48.5, facing: 180, section: 's6' },
    { id: 'pb11', name: 'Centerpiece — east side', x: 55.5, y: 47.85, facing: 0, section: 'infra' },
    { id: 'pb12', name: 'Photo booth', x: 8.4, y: 52.3, facing: 0, section: 'photo' },
    { id: 'pb13', name: 'Sant Milan', x: 10.5, y: 34, facing: 0, section: 'infra' },
    { id: 'pb14', name: 'Neelkanth Varni', x: 11, y: 14, facing: 0, section: 'infra' },
    { id: 'pb15', name: 'Queue line', x: 17, y: 80, facing: 270, section: 'infra' },
  ];

  return {
    version: 3,
    name: 'Diwali Exhibition 2026',
    venue: 'Assembly Hall · BAPS Milpitas (1430 California Circle)',
    items,
    probes,
    house: { enabled: true, level: 0.25, rows: 6, cols: 7, lumensEach: 9000, cct: 4000, cri: 80, beam: 100 },
    settings: { ceilingFt: 20, floorFinish: 'carpet', derate: 0.85, faceHeightFt: 5.25, gridFt: 2, bounce: true, stageHeightFt: 3.5, hazeBeams: false, wallRho: 0.6, ceilingRho: 0.5 },
    inventory: { ...DEFAULT_INVENTORY },
    artSpotVariant: 'framing20',
    updatedAt: Date.now(),
  };
}
