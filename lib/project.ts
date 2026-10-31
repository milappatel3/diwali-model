// Design for the Diwali Exhibition 2026 in the Assembly Hall (hall feet: origin = SW interior corner, +x east, +y north).
// v4: the layout follows the exhibition in Campus 3D (lib/campusEdits.ts → DEFAULT_EDITS.drapes / exItems): the client's
// pipe-and-drape drawing with 15 black drape runs, the queue line, photo booth, calendar tables, Sant Milan and Neelkanth
// Varni rooms in the west column, CAPA + India map + the 16-stage L-wall along the south, the TV kiosks and the walk-through
// house on the east, the Beliefs / Core Values room on the north and the Adhar Stambh bays in the middle room.
// Every light from v3 moved with its exhibit and was re-aimed; fixtures that hung on drapes that no longer exist now hang on
// the new runs (dc1 / dc3 light pipes) or on stands.
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
  const BLACK = { h: 12, color: 'black', fullness: 0.5 };

  // ——— SECTION / AREA BOXES (as in Campus 3D; section boxes first so their titles anchor the labels) ———
  add(
    zone('Hindu Festivals', 's1', 57.5, 87.6, 2.1, 30.7, true, 'zS1'),
    zone('Rites & Traditions', 's2', 87.8, 115.7, 2.1, 36, true, 'zS2'),
    zone('The Hindu Way of Life', 's3', 90.6, 117, 37, 84, true, 'zS3'),
    zone('Beliefs & Worldview', 's4', 52, 90.1, 61.7, 93.6, true, 'zS4'),
    zone('Core Values', 's5', 40.4, 52, 61.7, 93.6, true, 'zS5'),
    zone('Adhar Stambh', 's6', 40.8, 88.4, 30.7, 61.7, true, 'zS6'),
    zone('Line', 'infra', 3.6, 22.8, 54, 92.2),
    zone('Photo booth', 'photo', 23.45, 38.55, 67.8, 92.2),
    zone('Calendar distribution', 'infra', 4.1, 20.1, 29.75, 49.65),
    zone('Sant Milan', 'infra', 1.9, 19.9, 17.7, 27.6),
    zone('Neelkanth Varni', 'infra', 1.9, 19.9, 2.1, 17.7),
    zone('CAPA — BAPS Charities', 'entry', 42, 57, 3.75, 28.45),
    { ...zone('Hall doors', 'entry', 0.2, 3.4, 36.7, 43), params: { w: 3.2, d: 6.3, title: 'Hall doors', zone: true } },
    { ...zone('House entrance', 'infra', 97.1, 101.1, 56.6, 58.6), params: { w: 4, d: 2, title: 'Entrance', zone: true } },
    { ...zone('House exit', 'infra', 89.6, 91.6, 64.5, 68.5), params: { w: 2, d: 4, title: 'Exit', zone: true } },
  );

  // ——— PIPE & DRAPE: the 15 black 12′ runs from Campus 3D (dc1 and dc3 carry a steel light pipe) ———
  const DR: [string, string, SectionId, [number, number], [number, number], boolean][] = [
    ['dn', 'North run (Beliefs room)', 's4', [39, 93.6], [88.9, 93.6], false],
    ['dwMid', 'Beliefs room — west wall (behind the lotus)', 's5', [40.4, 93.6], [40.4, 52.4], false],
    ['dmid', 'Centre divider', 'infra', [38.4, 52.4], [66, 52.4], false],
    ['dhw', 'Beliefs room — east wall', 's4', [90.1, 95], [90.1, 72], false],
    ['dc1', 'Beliefs | Adhar Stambh divider (light pipe)', 's4', [51.2, 61.7], [88.9, 61.7], true],
    ['dc2', 'Adhar Stambh — east wall', 's6', [88.4, 61.7], [88.4, 31.2], false],
    ['dc3', 'Festivals | Adhar Stambh divider (light pipe)', 's1', [39.5, 30.7], [88.4, 30.7], true],
    ['dcapaW', 'CAPA — back wall', 'entry', [40.8, 30.7], [40.8, 2.1], false],
    ['dbot', 'South run (festival posters)', 's1', [59.4, 2.1], [114.2, 2.1], false],
    ['deast', 'East run (Rites / TVs)', 's2', [115.7, 58.9], [115.7, 2.1], false],
    ['dwl', 'West run (Sant Milan / Neelkanth Varni)', 'infra', [1.9, 29.8], [1.9, 2.1], false],
    ['dbotL', 'South run (west)', 'infra', [0.8, 2.1], [40.8, 2.1], false],
    ['dsmT', 'Sant Milan — north wall', 'infra', [1.9, 27.6], [19.9, 27.6], false],
    ['dsmR', 'Sant Milan — east wall', 'infra', [19.9, 27.6], [19.9, 17.7], false],
    ['dsmB', 'Sant Milan | Neelkanth Varni divider', 'infra', [1.9, 17.7], [19.9, 17.7], false],
  ];
  for (const [k, name, sec, a, b, pipe] of DR) add(run(name, sec, [a, b], pipe ? { ...BLACK, ...LIGHT_PIPE } : BLACK, 'dr_' + k));

  // ——— LINE (serpentine stanchion queue, 6 rows) ———
  const qRows = [57, 63.5, 70, 76.5, 83, 89.5];
  const qPts: [number, number][] = [];
  qRows.forEach((y, i) => (i % 2 === 0 ? qPts.push([4.6, y], [21.8, y]) : qPts.push([21.8, y], [4.6, y])));
  add(line('stanchions', 'Queue line (6 rows)', 'infra', qPts));

  // ——— PHOTO BOOTH (backdrop on the west side, facing east) ———
  add(
    it('banner', 'Photo booth backdrop — Happy Diwali', 'photo', 24.1, 80, 0, { w: 10, h: 8, bottom: 0, title: 'Happy Diwali', sub: 'Diwali Exhibition 2026', style: 'photo', feet: true }),
    it('floorMark', 'Stand-here mark', 'photo', 29.6, 80, 0, {}),
    rig('tbar', 'Photo key stand', 'photo', 35.8, 75.4, 145, 8.5, 'tbPhL'),
    rig('tbar', 'Photo fill stand', 'photo', 35.8, 84.6, 215, 8.5, 'tbPhR'),
  );
  add(
    fx('Photo key', 'photo', 'fresnel200', 'tbPhL', 1.5, [29.6, 80, 5.2], { ww: 1, cw: 0.3 }, 0.45, { zoom: 40 }),
    fx('Photo fill', 'photo', 'fresnel200', 'tbPhR', 1.5, [29.6, 80, 5.2], { ww: 1, cw: 0.3 }, 0.24, { zoom: 45 }),
  );

  // ——— CALENDAR DISTRIBUTION (two 10′ tables at the hall doors) ———
  add(
    it('table', 'Calendar table 1', 'infra', 8.6, 39.7, 90, { w: 10, d: 2.5, h: 2.5 }),
    it('table', 'Calendar table 2', 'infra', 15.6, 39.7, 90, { w: 10, d: 2.5, h: 2.5 }),
  );

  // ——— SANT MILAN (drape room x 1.9–19.9, y 17.7–27.6; sants seated on the west side facing east) ———
  add(
    it('banner', 'Sant Milan backdrop', 'infra', 2.6, 22.65, 0, { w: 8, h: 8, bottom: 0, title: 'Sant Milan', sub: 'Darshan & blessings', style: 'maroon', feet: true }),
    it('table', 'Sant Milan table', 'infra', 11.5, 22.65, 90, { w: 8, d: 2.4, h: 2.6, mat: 'drapeMaroon' }),
    rig('tbar', 'Sant Milan stand', 'infra', 18.4, 22.65, 180, 10, 'tbSM'),
  );
  add(fx('Sant Milan key', 'infra', 'fresnel200', 'tbSM', 1.5, [9.4, 22.65, 4.2], { ww: 1, cw: 0.2 }, 0.45, { zoom: 45 }));

  // ——— NEELKANTH VARNI (room x 1.9–19.9, y 2.1–17.7; murti against the south run, facing north) ———
  add(
    it('banner', 'Neelkanth Varni backdrop', 'infra', 12.1, 2.9, 90, { w: 10, h: 8, bottom: 0, title: 'Neelkanth Varni', sub: 'Tapasvi · Yogi · Guide', style: 'night', feet: true }),
    it('table', 'Neelkanth Varni murti riser', 'infra', 12.1, 6, 90, { w: 5, d: 3.5, h: 3, mat: 'woodDark' }),
    rig('tbar', 'Neelkanth Varni stand', 'infra', 12.1, 15.8, 270, 10, 'tbNV'),
  );
  add(
    fx('Neelkanth Varni murti', 'infra', 'gallery30', 'tbNV', 1, [12.1, 6, 4], { ww: 1 }, 0.4),
    fx('Neelkanth Varni backdrop', 'infra', 'gallery30', 'tbNV', 2, [12.1, 3, 5], { ww: 1 }, 0.4),
  );

  // ——— CAPA — BAPS CHARITIES (booth x 42–57 against the CAPA back wall, facing east) ———
  add(
    it('banner', 'CAPA backdrop — Light Beyond the Celebration', 'entry', 42.6, 16.1, 0, { w: 12, h: 8, bottom: 0, title: 'BAPS Charities', sub: 'Light Beyond the Celebration', style: 'maroon', feet: true }),
    it('table', 'CAPA table', 'entry', 46.5, 16.1, 90, { w: 8, d: 2.5, h: 2.5, mat: 'drapeMaroon' }),
    rig('tbar', 'CAPA stand', 'entry', 55.4, 16.1, 180, 10, 'tbCapa'),
  );
  add(
    fx('CAPA backdrop L', 'entry', 'gallery30', 'tbCapa', 0.5, [42.7, 12.6, 5], { ww: 1 }, 0.55),
    fx('CAPA backdrop R', 'entry', 'gallery30', 'tbCapa', 2.5, [42.7, 19.6, 5], { ww: 1 }, 0.55),
    fx('CAPA table key', 'entry', 'fresnel200', 'tbCapa', 1.5, [47, 16.1, 3.4], { ww: 1, cw: 0.2 }, 0.35, { zoom: 45 }),
  );

  // ——— 1 HINDU FESTIVALS (India map; festival posters on the south run) ———
  const PY = 2.28;
  add(
    it('mapDeck', 'Interactive India map — Many Traditions. One Light.', 's1', 72.2, 16.4, 90, { w: 12, d: 12, h: 3, divos: 44 }),
    it('banner', 'Header — Many Traditions. One Light.', 's1', 72.5, PY + 0.04, 90, { w: 18, h: 2.1, bottom: 7.4, title: 'MANY TRADITIONS. ONE LIGHT.', sub: 'Hindu Festivals', style: 'cream', feet: false, onDrape: true }),
    it('signStand', 'Section 1 sign', 's1', 61.5, 26, 180, { title: 'Hindu Festivals', num: 1 }),
    { ...rig('pipebar', 'Poster light pipe W', 's1', 66, 7.8, 90, 10, 'pbF1'), params: { h: 10, w: 12 } },
    { ...rig('pipebar', 'Poster light pipe E', 's1', 79.5, 7.8, 90, 10, 'pbF2'), params: { h: 10, w: 12 } },
  );
  const posterX = (i: number) => 60.3 + i * 3.45;
  for (let i = 0; i < 8; i++) add(it('poster', `Poster — ${FESTIVAL_POSTERS[i]}`, 's1', posterX(i), PY, 90, { w: 2.4, h: 5, bottom: 1.6, title: FESTIVAL_POSTERS[i] }));
  for (let i = 0; i < 8; i++) add(fx(`Posters ${i + 1}`, 's1', 'gallery30', i < 4 ? 'pbF1' : 'pbF2', 0, [posterX(i), PY + 0.02, 4.1], { ww: 1 }, 0.38, { u: posterX(i) - (i < 4 ? 66 : 79.5) }));
  // map keys hang on the dc3 light pipe (y 30.7, starts at x 39.5)
  add(
    fxD('Map key W', 's1', 'cobPar100', 'dr_dc3', 30, [69.7, 17.4, 3.2], { ww: 1, cw: 1 }),
    fxD('Map key E', 's1', 'cobPar100', 'dr_dc3', 35, [74.7, 17.4, 3.2], { ww: 1, cw: 1 }),
    fxD('Map photo key', 's1', 'fresnel200', 'dr_dc3', 32.7, [72.2, 24.4, 5], { ww: 1, cw: 0.25 }, 0.12, { zoom: 45 }),
  );

  // ——— 2 RITES & TRADITIONS (engraved L-wall in the south-east corner, lily-pad path) — same place as before ———
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

  // ——— TV KIOSKS (four, between Rites and the house, angled toward the walkway) ———
  ([[94, 50.1, 305], [112.4, 50.4, 247], [97, 40, 300], [110.3, 40, 253]] as [number, number, number][]).forEach(([x, y, r], i) =>
    add(it('kiosk', `TV / touch-screen kiosk ${i + 1}`, 's3', x, y, r, { nits: 300 })));

  // ——— 3 HINDU WAY OF LIFE (24′×24′ walk-through house; entrance on the south face, exit on the west face) ———
  const house = it('house', 'Hindu House (walk-through)', 's3', 103.6, 71.3, 270, { w: 24, d: 24, h: 8, wall: 2, entry: [10.5, 13.5], exit: [1.5, 4.5], tau: 0.55 }, { id: 'house' });
  add(
    house,
    it('banner', 'House title — The Hindu Way of Life (south face)', 's3', 109, 59.1, 270, { w: 9, h: 2.5, bottom: 5.4, title: 'THE HINDU WAY OF LIFE', sub: 'Hindu Jivan Shaili', style: 'cream', feet: false, onDrape: true }),
    it('signStand', 'Section 3 sign', 's3', 95.5, 56, 270, { title: 'The Hindu Way of Life', num: 3 }),
    { ...rig('pipebar', 'House light pipe (east, south half)', 's3', 117.6, 67.5, 180, 12, 'pbHouseS'), params: { h: 12, w: 10 } },
    { ...rig('pipebar', 'House light pipe (east, north half)', 's3', 117.6, 75.3, 180, 12, 'pbHouseN'), params: { h: 12, w: 10 } },
    rig('tbar', 'House title stand', 's3', 104.5, 51, 90, 10, 'tbHouse'),
  );
  const H = houseXY(house);
  const hp = (sx: number, sy: number): [number, number, number] => { const q = H(sx, sy); return [q.x, q.y, 2.5]; };
  add(
    fx('House glow — entrance side', 's3', 'cobPar200', 'pbHouseS', 0, hp(16, 8), { ww: 1 }, 1, { u: -0.7 }),
    fx('House glow — reading/exit', 's3', 'cobPar200', 'pbHouseS', 0, hp(7, 9), { ww: 1 }, 1, { u: 1.8 }),
    fx('House glow — mandir/living', 's3', 'cobPar200', 'pbHouseN', 0, hp(16, 15), { ww: 1 }, 1, { u: -1.5 }),
    fx('House glow — kitchen', 's3', 'cobPar200', 'pbHouseN', 0, hp(9, 18), { ww: 1 }, 1, { u: 2.5 }),
    fx('House title banner spot', 's3', 'gallery30', 'tbHouse', 1.5, [109, 59.05, 6.65], { ww: 1 }, 1),
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

  // ——— 4 BELIEFS & WORLDVIEW + 5 CORE VALUES (one black drape room x 40.4–90.1, y 61.7–93.6) ———
  add(
    line('zoneArea', 'Beliefs room', 's4', [[40.4, 61.7], [90.1, 61.7], [90.1, 93.6], [40.4, 93.6]], { rho: 0.03, h: 12 }),
    it('signStand', 'Section 4 sign', 's4', 87, 69, 180, { title: 'Beliefs & Worldview', num: 4 }),
    it('mirrors', 'Node 2 — Who am I? (illuminated mirrors)', 's4', 62.8, 88, 270, { w: 10, d: 4, n: 4 }, { id: 'nMirror' }),
    it('diorama', 'Node 1 — Who is God? (8′×8′ layered diorama + poster)', 's4', 81.3, 88, 270, { w: 8, h: 8, d: 2, art: 'god', nits: 110, cct: 2900 }),
    it('diorama', 'Node 6 — Why is a Guru important? (8′×8′ map diorama + poster)', 's4', 72.8, 68.7, 90, { w: 8, h: 8, d: 2, art: 'guru', nits: 110, cct: 2900 }),
    it('fiberTower', 'Node 5 — Nilkanth Varni box (fibre-optic murti)', 's4', 57, 68.7, 90, {}, { id: 'nFiber' }),
  );
  add(
    fxAt('Mirror face light W', 's4', 'artSpot', 'clamp', 60.3, 87.8, 7.4, [62.8, 85, 5.25], { ww: 1, cw: 0 }, 0.2),
    fxAt('Mirror face light E', 's4', 'artSpot', 'clamp', 65.3, 87.8, 7.4, [62.8, 85, 5.25], { ww: 1, cw: 0 }, 0.2),
    fxD('Fibre-optic murti accent', 's4', 'artSpot', 'dr_dc1', 5.8, [57, 68.7, 2.6], { ww: 1, cw: 0.4 }, 0.35),
  );
  const lotusN = it('nailWall', 'Lotus activity — The Lotus (poster + nail art)', 's5', 42.9, 80, 0, { w: 12, h: 8, d: 2, table: false, poster: true }, { id: 'lotusN' });
  const LN = sfOf(lotusN);
  add(
    lotusN,
    it('signStand', 'Section 5 sign', 's5', 46, 90, 0, { title: 'Hindu Core Values', num: 5 }),
    rig('tbar', 'Lotus stand', 's5', 51, 80, 180, 10, 'tbLotus'),
  );
  const rakeN = ahead(lotusN.x, lotusN.y, 0, 6);
  add(
    fx('Lotus key', 's5', 'cobPar100', 'tbLotus', 1, at(LN('lotus'), 4.6), { ww: 1, cw: 1 }),
    fx('Lotus poster zone', 's5', 'gallery30', 'tbLotus', 2, at(LN('poster'), 4.2), { ww: 1 }, 0.7),
    fxAt('Lotus rake', 's5', 'rgbwPar200', 'floor', rakeN[0], rakeN[1], 0.75, [lotusN.x + 0.3, lotusN.y - 0.5, 5.5], { r: 1, g: 0.18, b: 0.25, w: 0.3 }, 0.7),
  );

  // ——— 6 ADHAR STAMBH (Shastra · Mandir · Sant bays in the middle room, framed by four light towers) ———
  const BAY = { w: 10.5, h: 10, d: 3 };
  add(
    it('stambh', 'Stambh — Shastras', 's6', 78.6, 55.4, 235, { ...BAY, kind: 1 }),
    it('stambh', 'Stambh — Mandir', 's6', 82.5, 48.2, 180, { ...BAY, kind: 0 }),
    it('stambh', 'Stambh — Sant', 's6', 78.6, 40.9, 125, { ...BAY, kind: 2 }),
    it('signStand', 'Section 6 sign', 's6', 59, 38, 180, { title: 'Adhar Stambh', num: 6 }),
    rig('crank', 'Light tower SW', 'infra', 42.8, 33, 45, 14, 'twSW'),
    rig('crank', 'Light tower NW', 'infra', 52.5, 59.5, 315, 14, 'twNW'),
    rig('crank', 'Light tower SE', 'infra', 86.2, 33, 135, 14, 'twSE'),
    rig('crank', 'Light tower NE', 'infra', 86.2, 59.5, 225, 14, 'twNE'),
    rig('tbar', 'Adhar Stambh photo stand', 's6', 64.5, 48.2, 0, 11, 'tbS6'),
  );
  add(
    fx('Sant bay key', 's6', 'cobPar200', 'twSW', 2.5, [77.2, 43, 5.5], { ww: 1 }, 1),
    fx('Shastra bay key', 's6', 'cobPar200', 'twNW', 2.5, [77.2, 53.4, 5.5], { ww: 1 }, 1),
    fx('Stambh rim SE', 's6', 'rgbwPar200', 'twSE', 2.5, [74, 47, 6], AMBER_RGBW, 0.45),
    fx('Stambh rim NE', 's6', 'rgbwPar200', 'twNE', 2.5, [74, 49.5, 6], AMBER_RGBW, 0.45),
    fx('Stambh photo key S', 's6', 'fresnel200', 'tbS6', 2, [74, 46.4, 5], { ww: 1, cw: 0.2 }, 0.65, { zoom: 40 }),
    fx('Stambh photo key N', 's6', 'fresnel200', 'tbS6', 1, [74, 50, 5], { ww: 1, cw: 0.2 }, 0.65, { zoom: 40 }),
    fxAt('Shastras graze', 's6', 'wallWash9x12', 'floor', 76.3, 52.1, 0.5, [78, 54.6, 7], SAFFRON_WW, 0.8),
    fxAt('Mandir graze', 's6', 'wallWash9x12', 'floor', 78.5, 48.2, 0.5, [81.8, 48.2, 7], SAFFRON_WW, 0.8),
    fxAt('Sant graze', 's6', 'wallWash9x12', 'floor', 76.3, 44.2, 0.5, [78, 41.6, 7], SAFFRON_WW, 0.8),
  );

  const hq = (sx: number, sy: number) => H(sx, sy);
  const mandirSpot = hq(15.5, 12.4);
  const livingSpot = hq(17, 18);
  const lotusSpot = ahead(lotusN.x, lotusN.y, 0, 3.5);
  const probes: Probe[] = [
    { id: 'pb1', name: 'CAPA — BAPS Charities', x: 49, y: 16.1, facing: 0, section: 'entry' },
    { id: 'pb2', name: 'India map — north side photo', x: 72.2, y: 24.4, facing: 90, section: 's1' },
    { id: 'pb3', name: 'In front of the festival posters', x: 72, y: 6, facing: 90, section: 's1' },
    { id: 'pb4', name: 'Rites — on a lily pad', x: 109.8, y: 18.2, facing: 180, section: 's2' },
    { id: 'pb5', name: 'House — by the Ghar Mandir', x: mandirSpot.x, y: mandirSpot.y, facing: 90, section: 's3' },
    { id: 'pb6', name: 'House — living room', x: livingSpot.x, y: livingSpot.y, facing: 150, section: 's3' },
    { id: 'pb7', name: 'Beliefs — at the Who am I? mirrors', x: 62.8, y: 84.8, facing: 90, section: 's4' },
    { id: 'pb8', name: 'Beliefs — centre aisle', x: 70, y: 78, facing: 0, section: 's4' },
    { id: 'pb9', name: 'Core values — at the lotus board', x: lotusSpot[0], y: lotusSpot[1], facing: 0, section: 's5' },
    { id: 'pb10', name: 'Adhar Stambh — group photo', x: 74, y: 48.2, facing: 180, section: 's6' },
    { id: 'pb11', name: 'Adhar Stambh — approach', x: 60, y: 45, facing: 0, section: 's6' },
    { id: 'pb12', name: 'Photo booth', x: 29.6, y: 80, facing: 0, section: 'photo' },
    { id: 'pb13', name: 'Sant Milan', x: 10, y: 22.65, facing: 0, section: 'infra' },
    { id: 'pb14', name: 'Neelkanth Varni', x: 12.1, y: 9.5, facing: 90, section: 'infra' },
    { id: 'pb15', name: 'Queue line', x: 13, y: 80, facing: 270, section: 'infra' },
  ];

  return {
    version: 4,
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
