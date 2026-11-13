// Diwali 2027 · "Welcome to India" — first draft of the exhibition in the Assembly Hall, from the planning Whiteboard
// (dimensioned layout, Nov 13). Hall feet: origin = SW interior corner, +x east, +y north.
//
// The Whiteboard measured y SOUTH from the north wall on a 116 × 89 ft hall (drape plan). The DWG hall is 119.5 × 95.2 ft,
// so the extra ~6 ft goes in the middle: things along the south wall keep their distance from the south wall
// (y = 89 − y_wb) and things along the north wall keep their distance from the north wall (y = 95.17 − y_wb).
// Akshardham, in the middle, takes up the difference. x is unchanged (the entrance and north exit doors line up with the DWG).
//
// Heights: every poster / drape wall is 8 ft. Other heights are inferred from the sketches and noted on each piece.
import type { Item, SectionId, V2 } from './types';

let n = 0;
const id = (p: string) => `y27${p}${++n}`;
type Part = [number, number, number, number, number, number, string, string?, number?];

function it(type: string, name: string, section: SectionId, x: number, y: number, rot: number, params: Record<string, any> = {}, extra: Partial<Item> = {}): Item {
  return { id: id(type.slice(0, 3)), type, name, section, x, y, rot, params, ...extra };
}
function piece(name: string, section: SectionId, x: number, y: number, rot: number, w: number, d: number, h: number, parts: Part[], extra: Record<string, any> = {}): Item {
  return it('setPiece', name, section, x, y, rot, { title: name, w, d, h, parts, ...extra });
}
/** 8 ft black pipe & drape between two points */
function drape(name: string, section: SectionId, a: [number, number], b: [number, number]): Item {
  return { id: id('drp'), type: 'drape', name, section, x: a[0], y: a[1], rot: 0, params: { h: 8, color: 'black', fullness: 0.5 }, points: [{ x: 0, y: 0 }, { x: b[0] - a[0], y: b[1] - a[1] }] };
}
function zone(name: string, section: SectionId, x0: number, x1: number, y0: number, y1: number): Item {
  return it('booth', name, section, (x0 + x1) / 2, (y0 + y1) / 2, 90, { w: x1 - x0, d: y1 - y0, title: name, zone: true });
}
/** poster on an 8 ft wall: 3.5 × 5 ft, bottom at 2 ft. rot = direction the poster faces. */
function poster(title: string, section: SectionId, x: number, y: number, rot: number, w = 3.5): Item {
  return it('poster', title, section, x, y, rot, { w, h: 5, bottom: 2, title });
}

/** three-tier ring of diyas (Ayodhya), d = outer diameter */
function diyaRing(): { parts: Part[]; glow: any[] } {
  const parts: Part[] = [];
  const glow: any[] = [];
  const tiers = [4.6, 3.4, 2.2]; // mid-radius of each tier
  tiers.forEach((r, k) => {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 2 * Math.PI;
      parts.push([r * Math.cos(a), r * Math.sin(a), k * 0.5, (2 * Math.PI * r) / 12 + 0.15, 1.2, 0.5, 'sandstone', `diya ring, step ${k + 1}`, (a * 180) / Math.PI + 90]);
      glow.push({ u: r * Math.cos(a), v: r * Math.sin(a), z: (k + 1) * 0.5 + 0.1, lumens: 20, cct: 1900, name: 'LED diyas' });
    }
  });
  parts.push([0, 0, 0, 2.4, 2.4, 1.5, 'sandstone', 'centre plinth'], [0, 0, 1.5, 0.8, 0.8, 1, 'gold', 'centre lamp']);
  glow.push({ u: 0, v: 0, z: 2.6, lumens: 120, cct: 1900, name: 'centre lamp' });
  return { parts, glow };
}

/** Puri ratha: printed body on a deck with foam wheels and a tiered cloth canopy (~11.5 ft) */
function chariot(a: string, b: string): Part[] {
  const out: Part[] = [[0, 0, 0, 6, 6, 2.5, 'woodDark', 'chariot deck']];
  for (const su of [-3.25, 3.25]) for (const sv of [-1.6, 1.6]) out.push([su, sv, 0, 0.5, 2.8, 2.8, 'black', 'foam wheel']);
  for (const su of [-2.6, 2.6]) for (const sv of [-2.6, 2.6]) out.push([su, sv, 2.5, 0.3, 0.3, 3.5, 'wood', 'canopy post']);
  for (let k = 0; k < 5; k++) out.push([0, 0, 6 + k * 0.9, 6.4 - k * 1.2, 6.4 - k * 1.2, 0.9, k % 2 ? b : a, 'cloth canopy tier']);
  out.push([0, 0, 10.5, 0.6, 0.6, 1, 'gold', 'kalash']);
  return out;
}

/** layered white mountain, w wide, d deep, h tall, in 5 layers */
function mountain(w: number, d: number, h: number): Part[] {
  const out: Part[] = [];
  for (let k = 0; k < 5; k++) out.push([0, -k * 0.35, (k * h) / 5, w * (1 - k * 0.17), d * (1 - k * 0.17), h / 5, k < 1 ? 'rock' : 'snow', 'layered mountain (projection-mapped)']);
  return out;
}

/** raised stone-faced pool, rot 90 (u = east, v = north) */
function pool(name: string, x0: number, x1: number, y0: number, y1: number, water: string, extra: Part[] = []): Item {
  const w = x1 - x0, d = y1 - y0;
  return piece(name, 's4', (x0 + x1) / 2, (y0 + y1) / 2, 90, w, d, 1.5, [[0, 0, 0, w, d, 1.4, 'stone', 'stone-faced pool wall'], [0, 0, 1.4, w - 1, d - 1, 0.06, water, 'water'], ...extra], { note: 'Real water, about 12″ deep, in a lined tank behind the stone facing.' });
}

export function plan2027Items(): Item[] {
  n = 0;
  const items: Item[] = [];
  const add = (...xs: Item[]) => items.push(...xs);

  // ——— ZONES ———
  add(
    zone('1 · Welcome to India', 'entry', 25.5, 50, 0, 26),
    zone('2 · Ayodhya (Multi Room)', 's1', 53, 89, -27.5, -3),
    zone('3 · Rameswaram → Kanyakumari (the boat)', 's2', 61, 89, 0, 26),
    zone('4 · Jagannath Puri', 's3', 89, 116, 0, 26),
    zone('5 · Kashi ghats', 's4', 89, 116, 26, 72.2),
    zone('6 · Triveni Sangam', 's4', 96, 116, 72.2, 92.2),
    zone('7 · Himalaya · Char Dham', 's5', 49, 89, 56.2, 79.2),
    zone('8 · Nilkanth Varni abhishek', 's5', 33, 48, 56.2, 79.2),
    zone('9 · BAPS & Satsang (Akshardham)', 's6', 25, 88, 26, 56.2),
    zone('North corridor (snow, to the abhishek queue)', 's5', 48, 96, 79.2, 92.2),
    zone('Walkway from the stage', 'infra', 25, 32, 56.2, 79.2),
    zone('Exit lane (to the north doors)', 'infra', 17, 25, 26, 95),
    zone('Line / queue (empty)', 'infra', 4, 17, 67.2, 91.2),
    zone('Calendars', 'infra', 3, 18, 3, 22),
    zone('Sant Milan', 'infra', 19, 24, 3, 22),
    zone('Corridor to the Multi Room', 'infra', 50, 61, 0, 26),
  );

  // ——— PIPE & DRAPE (all 8 ft) ———
  add(
    drape('Welcome tunnel — west wall', 'entry', [25.5, 0.3], [25.5, 26]),
    drape('Welcome tunnel — east wall', 'entry', [41.5, 0.3], [41.5, 13]),
    drape('Welcome room — east wall', 'entry', [50, 9], [50, 26]),
    drape('BAPS & Satsang — south wall (message panels)', 's6', [17, 26], [108, 26]),
    drape('Boat room — west wall', 's2', [61, 0.3], [61, 26]),
    drape('Boat room | Puri (exit at the north end)', 's2', [89, 0.3], [89, 18]),
    drape('Puri — east wall', 's3', [116, 0.3], [116, 26]),
    drape('Kashi — west wall', 's4', [89, 26], [89, 72.2]),
    drape('Sangam — west wall', 's4', [96, 83.5], [96, 94.9]),
    drape('BAPS & Satsang — north wall (guru panel) / Himalaya back', 's6', [32, 56.2], [89, 56.2]),
    drape('Stage walkway — west wall', 'infra', [25, 56.2], [25, 92]),
    drape('Exit lane — west wall', 'infra', [17, 26], [17, 90]),
  );

  // ——— 1 · WELCOME (festive; content to come) ———
  const toranGlow = Array.from({ length: 14 }, (_, i) => ({ u: i % 2 ? 7.6 : -7.6, v: -6 + (Math.floor(i / 2) * 12) / 6, z: 7.2, lumens: 12, cct: 1900, name: 'diya string' }));
  add(
    it('banner', 'Welcome to India — header', 'entry', 33.5, 1.2, 270, { w: 14, h: 2.5, bottom: 7.5, title: 'Welcome to India', style: 'saffron', feet: false }),
    piece('Violet tunnel canopy', 'entry', 33.5, 6.65, 90, 16, 12.7, 8, [[0, 0, 7.85, 16, 12.7, 0.15, 'violet', 'violet fabric ceiling over the tunnel']], { note: 'Dark violet fabric ceiling at 8 ft; the tunnel walls are the drape runs.' }),
    piece('Marigold torans + diya strings (tunnel)', 'entry', 33.5, 6.65, 90, 16, 12.7, 8, [
      [-7.85, 0, 6.9, 0.2, 12.7, 0.7, 'paintSaffron', 'marigold toran'], [7.85, 0, 6.9, 0.2, 12.7, 0.7, 'paintSaffron', 'marigold toran'],
    ], { glow: toranGlow }),
    it('banner', 'Intro wall A (8 × 8, L corner)', 'entry', 29.8, 25.6, 270, { w: 8, h: 8, bottom: 0, title: 'Intro wall A — Welcome to India', style: 'saffron', feet: false, onDrape: true }),
    it('banner', 'Intro wall B (8 × 8, L corner)', 'entry', 25.9, 21.8, 0, { w: 8, h: 8, bottom: 0, title: 'Intro wall B — the journey ahead', style: 'saffron', feet: false, onDrape: true }),
    piece('Rangoli (floor)', 'entry', 39, 19, 90, 7, 7, 0.05, [[0, 0, 0, 7, 7, 0.03, 'paintSaffron', 'rangoli floor graphic'], [0, 0, 0.03, 4.5, 4.5, 0.02, 'drapeMaroon', 'rangoli centre']]),
  );

  // ——— 2 · AYODHYA (Multi Room) ———
  const ring = diyaRing();
  add(piece('Circle of diyas (10 ft, three steps)', 's1', 71, -14, 90, 10.4, 10.4, 2.5, ring.parts, { glow: ring.glow, note: 'The one main piece: three 6″ steps of LED diyas around a centre lamp.' }));
  ['Birth of Shri Ram', 'Exile to the forest', 'Bharat and the padukas', 'Victory over Ravan', 'The return to Ayodhya'].forEach((t, i) => add(poster(`Shri Ram · ${t}`, 's1', 57 + i * 7, -27.3, 90, 4)));
  ['The first Diwali: Ayodhya lit with diyas', 'Why we light diyas', 'Diwali today'].forEach((t, i) => add(poster(`Diwali’s origin · ${t}`, 's1', 65 + i * 6.5, -3.1, 270, 4)));
  add(poster('Nilkanth Varni · Ghanshyam in Ayodhya', 's1', 53.4, -9, 0, 4), poster('Nilkanth Varni · Leaving home at 11', 's1', 53.4, -16, 0, 4));
  add(piece('Annakut display (option)', 's1', 85, -15, 180, 8, 3.5, 4.5, [
    [0, 0, 0, 8, 3, 2.5, 'drapeMaroon', 'skirted table'], [0, -0.4, 2.5, 6.5, 2, 0.7, 'gold', 'food tier'], [0, -0.7, 3.2, 4.5, 1.4, 0.7, 'gold', 'food tier'], [0, -0.9, 3.9, 2.5, 0.9, 0.6, 'gold', 'food tier'],
  ], { note: 'Option to fill the room: a small annakut of food offerings.' }));

  // ——— 3 · RAMESWARAM → KANYAKUMARI: the boat (walled room) ———
  add(
    piece('The boat (to Kanyakumari)', 's2', 73, 13.5, 0, 6.5, 20, 7.2, [
      [0, -0.5, 0, 6, 15, 0.67, 'woodDark', 'boat deck: stage decks at 8″'],
      [0, 7.6, 0, 4, 1.2, 0.67, 'woodDark', 'bow'], [0, 8.6, 0, 2, 0.8, 0.67, 'woodDark', 'bow tip'],
      [3.1, 0, 0, 0.2, 16, 2.2, 'paintCream', 'hull side + rail for seva stones'], [3.2, 0, 1.6, 0.05, 16, 0.3, 'drapeMaroon', 'hull stripe'],
      [-3.1, -2.5, 0, 0.2, 11, 2.2, 'paintCream', 'hull side'], [-3.2, -2.5, 1.6, 0.05, 11, 0.3, 'drapeMaroon', 'hull stripe'], [-3.1, 6.6, 0, 0.2, 2, 2.2, 'paintCream', 'hull side (bow)'],
      [2.8, -3.5, 0.67, 0.25, 0.25, 6.3, 'wood', 'canopy post'], [2.8, 3.5, 0.67, 0.25, 0.25, 6.3, 'wood', 'canopy post'], [-2.8, -3.5, 0.67, 0.25, 0.25, 6.3, 'wood', 'canopy post'], [-2.8, 3.5, 0.67, 0.25, 0.25, 6.3, 'wood', 'canopy post'],
      [0, 0, 7, 6.4, 8, 0.15, 'paintSaffron', 'colourful cloth canopy'],
      [0, -8.75, 0, 3, 1.5, 0.33, 'stone', 'ramp on (stern)'], [-4.2, 4.5, 0, 2, 3, 0.33, 'stone', 'ramp off (bow side)'],
    ], { note: 'Reuses the Dwarka boat build: rented stage decks, plywood hull sides, cloth canopy on four posts, ramps on and off.' }),
    piece('Sea light on the floor', 's2', 73, 13.5, 0, 16, 24, 0.03, [[0, 0, 0, 16, 24, 0.02, 'water', 'rippling sea light on the floor']]),
    piece('Sea projection (north wall)', 's2', 70, 25.7, 270, 12, 0.2, 7, [[0, 0, 1.5, 12, 0.1, 5.5, 'water', 'projected sea']], { face: true, faceZ: 4.25, faceH: 5.5, glow: [{ u: 0, v: 0.1, z: 4.25, nits: 40, area: 66, cct: 6500, dir: 'front', name: 'sea projection' }] }),
    piece('Sea projection (south wall)', 's2', 71, 0.3, 90, 10, 0.2, 7, [[0, 0, 1.5, 10, 0.1, 5.5, 'water', 'projected sea']], { face: true, faceZ: 4.25, faceH: 5.5, glow: [{ u: 0, v: 0.1, z: 4.25, nits: 40, area: 55, cct: 6500, dir: 'front', name: 'sea projection' }] }),
    piece('Three-seas horizon (sunrise → sunset)', 's2', 88.7, 8.5, 180, 15, 0.3, 8, [[0, 0, 0, 15, 0.3, 8, 'water', 'horizon wall: three blues, light loop']], { face: true, glow: [{ u: 0, v: 0.2, z: 4, nits: 60, area: 120, cct: 3000, dir: 'front', name: 'horizon light loop' }] }),
    piece('Nilkanth carrying Sevakram’s bundle (silhouette)', 's2', 63.5, 4, 90, 2.2, 0.3, 6, [[0, 0, 0, 2.2, 0.15, 6, 'black', 'life-size silhouette']]),
    piece('Sevakram’s bundle (lift it)', 's2', 66, 4.5, 90, 2, 2, 2.4, [[0, 0, 0, 2, 2, 1.5, 'wood', 'plinth'], [0, 0, 1.5, 1.4, 1, 0.9, 'paintCream', 'cloth bundle, ~20 lb']]),
    it('floorMark', 'Footprints turn north: “12,000 km. He turned around and kept walking.”', 's2', 86, 21, 0, { text: '12,000 km' }),
    poster('Rameswaram · Ramanathaswamy Temple', 's2', 61.3, 6, 0),
    poster('Rameswaram · Corridors and the 22 wells', 's2', 61.3, 12, 0),
    poster('Rameswaram · How the Setu was built', 's2', 61.3, 18, 0),
    poster('Rameswaram · Nilkanth and Sevakram', 's2', 63.5, 0.35, 90),
    poster('Kanyakumari · Kumari Amman', 's2', 79, 0.35, 90),
    poster('Kanyakumari · Vivekananda Rock', 's2', 79.5, 25.65, 270),
    poster('Kanyakumari · Where three seas meet', 's2', 83, 25.65, 270),
    poster('Kanyakumari · Nilkanth at the tip', 's2', 86.5, 25.65, 270),
  );

  // ——— 4 · JAGANNATH PURI (room; three raths on the south wall; exit near the east wall into Kashi) ———
  const RATH: [string, string, string][] = [
    ['Jagannath’s ratha (red-yellow)', 'drapeMaroon', 'paintSaffron'],
    ['Subhadra’s ratha (red-black)', 'drapeMaroon', 'black'],
    ['Balabhadra’s ratha (red-green)', 'drapeMaroon', 'paintSage'],
  ];
  RATH.forEach(([name, a, b], i) => add(piece(name, 's3', 94 + i * 8.5, 5, 90, 7, 6.5, 11.5, chariot(a, b), { note: 'Printed body, foam wheels, cloth canopy; about 11½ ft tall.' })));
  add(poster('Puri · The Rath Yatra', 's3', 93, 25.65, 270), poster('Puri · Nilkanth at Jagannath Puri (forgiveness)', 's3', 99, 25.65, 270));

  // ——— 5 · KASHI ———
  const bleach: Part[] = [0, 1, 2, 3].map((k) => [0, -k * 0.875, k * 0.8, 40, 7 - k * 1.75, 0.8, 'sandstone', 'sandstone bleacher step']);
  const ghats: Part[] = [];
  for (let i = 0; i < 6; i++) ghats.push([-17.5 + i * 7, 0, 0, 5.5, 0.4, 12, 'sandstone', 'printed ghat flat (12 ft), projection-mapped'], [-17.5 + i * 7, 0, 12, 3, 0.4, 1.5, 'paintSaffron', 'chhatri top']);
  const diyas = Array.from({ length: 16 }, (_, i) => ({ u: i % 2 ? 2 : -2, v: -18 + (i * 36) / 15, z: 1.0, lumens: 15, cct: 1900, name: 'floating diya' }));
  add(
    piece('Kashi bleachers (4 steps)', 's4', 93.5, 49, 0, 40, 7, 3.2, bleach, { note: 'Sturdy sandstone-look bleachers facing the Ganga, about 3 ft at the back.' }),
    piece('Six 12-ft ghat flats (projection on this side)', 's4', 89.6, 49, 0, 40, 0.4, 13.5, ghats, { note: 'Projection-mapped: the first of the two projection sides.' }),
    piece('The Ganga (water channel)', 's4', 109, 50.75, 90, 10, 39.5, 1.2, [
      [0, 0, 0, 9, 38.5, 0.9, 'water', 'water, ~10″ deep'],
      [-4.75, 0, 0, 0.5, 39.5, 1.2, 'stone', 'ghat edge'], [4.75, 0, 0, 0.5, 39.5, 1.2, 'stone', 'edge'], [0, -19.5, 0, 10, 0.5, 1.2, 'stone', 'edge'],
    ], { glow: diyas, note: 'Lined channel starting 5 ft in from the Puri exit; floating LED diyas drift north to the Sangam.' }),
    piece('Aarti projection wall (east side)', 's4', 116.8, 49, 180, 38, 0.2, 8.5, [[0, 0, 0.5, 38, 0.2, 8, 'screen', 'projection surface']], { face: true, faceZ: 4.5, faceH: 8, glow: [{ u: 0, v: 0.15, z: 4.5, nits: 30, area: 300, cct: 2600, dir: 'front', name: 'aarti projection' }] }),
  );

  // ——— 6 · TRIVENI SANGAM ———
  add(
    piece('Channel into the Sangam', 's4', 109, 71.9, 90, 4, 3.2, 1, [[0, 0, 0, 4, 3.2, 0.9, 'water', 'feed channel']]),
    pool('Sangam · Yamuna (green)', 97, 104, 84.2, 91.2, 'waterGreen'),
    pool('Sangam · the meeting (corner pool)', 105, 115, 82.2, 92.2, 'water', [[0, 0, 1.45, 0.8, 0.8, 14, 'acrylic', 'beam of light']]),
    pool('Sangam · Ganga (blue)', 105, 115, 73.2, 81.2, 'water'),
    piece('Sangam projection (west side)', 's4', 96.25, 89, 0, 11, 0.2, 8, [[0, 0, 0.5, 11, 0.1, 7, 'screen', 'projection surface']], { face: true, faceZ: 4, faceH: 7, glow: [{ u: 0, v: 0.1, z: 4, nits: 30, area: 77, cct: 5000, dir: 'front', name: 'Sangam projection' }] }),
    piece('Sangam projection (north wall)', 's4', 106, 94.9, 270, 18, 0.2, 9, [[0, 0, 2, 18, 0.1, 7, 'screen', 'projection surface']], { face: true, faceZ: 5.5, faceH: 7, glow: [{ u: 0, v: 0.1, z: 5.5, nits: 30, area: 126, cct: 5000, dir: 'front', name: 'Sangam projection' }] }),
  );

  // ——— 7 · HIMALAYA (snowy and cold as you enter) ———
  add(piece('Snow floor + drifts', 's5', 72.5, 74.2, 90, 47, 36, 1.5, [
    [0, 0, 0, 47, 36, 0.06, 'snow', 'white snow floor cloth'],
    [-18, 16.5, 0, 6, 2, 1.2, 'snow', 'snow drift'], [-2, 16.8, 0, 8, 1.5, 0.9, 'snow', 'snow drift'], [14, 16.5, 0, 6, 2, 1.4, 'snow', 'snow drift'], [21, 3, 0, 3, 5, 1, 'snow', 'snow drift'],
  ], { note: 'Cold, snowy feel from the corridor in: white floor cloth, drifts along the walls (cool light and a cold breeze to come).' }));
  ['Yamunotri', 'Gangotri', 'Kedarnath', 'Badrinath'].forEach((t, i) => {
    const cx = 56 + i * 8;
    add(piece(`Mountain · ${t}`, 's5', cx, 61.2, 90, 8, 9.5, 11, mountain(8, 9.5, 11), { note: 'White layered mountain, 8 ft wide, ~11 ft tall, projection-mapped so it comes alive.' }));
    add(piece(`${t} · its own small item`, 's5', cx, 68, 90, 3, 2, 6, [[0, 0, 0, 3, 2, 4.5, 'paintCream', 'small item (temple / story)'], [0, 0, 4.5, 2, 1.4, 1.5, 'paintSaffron', 'shikhar']]));
  });

  // ——— 8 · NILKANTH VARNI ———
  add(
    it('riser', 'Nilkanth abhishek stage (15 × 15)', 's5', 40.5, 63.7, 90, { w: 15, d: 15, h: 1.5, skirt: 'black', steps: true }),
    piece('Rocky cave + Nilkanth murti', 's5', 40.5, 59.5, 90, 12, 5, 9.5, [
      [0, -1.5, 0, 12, 1.5, 9, 'rock', 'cave back'], [-5.25, 0.5, 0, 1.5, 5, 8, 'rock', 'cave side'], [5.25, 0.5, 0, 1.5, 5, 8, 'rock', 'cave side'],
      [0, 0.5, 8, 12, 5, 1.5, 'rock', 'cave roof'], [0, 0.4, 0, 1.2, 1.2, 3.5, 'gold', 'Nilkanth Varni murti'],
    ]),
    { id: id('stn'), type: 'stanchions', name: 'Abhishek queue', section: 's5', x: 48, y: 79, rot: 0, params: { spacing: 7, color: 'maroon' }, points: ([[48, 79], [34.5, 79], [34.5, 75.4], [47, 75.4], [47, 72]] as [number, number][]).map(([x, y]) => ({ x: x - 48, y: y - 79 })) as V2[] },
  );

  // ——— 9 · BAPS & SATSANG (the middle area) ———
  add(
    piece('Akshardham model', 's6', 79, 38, 180, 12, 10, 8.5, [
      [0, 0, 0, 12, 10, 2.5, 'stone', 'plinth'], [0, 0, 2.5, 10, 8, 0.8, 'sandstone', 'jagati'], [0, 0, 3.3, 6, 5, 3, 'sandstone', 'mandir'],
      [0, 0, 6.3, 2.4, 2.4, 1.6, 'sandstone', 'central dome'], [-2.4, -1.8, 6.3, 1.2, 1.2, 1, 'sandstone', 'dome'], [2.4, -1.8, 6.3, 1.2, 1.2, 1, 'sandstone', 'dome'],
      [-2.4, 1.8, 6.3, 1.2, 1.2, 1, 'sandstone', 'dome'], [2.4, 1.8, 6.3, 1.2, 1.2, 1, 'sandstone', 'dome'], [0, 0, 7.9, 0.4, 0.4, 0.6, 'gold', 'kalash'],
    ], { note: 'Detailed model on a 2½ ft plinth; size from the plan (10 × 12 ft), height inferred.' }),
    it('banner', 'Guru parampara portrait panel', 's6', 62, 55.9, 270, { w: 24, h: 6, bottom: 1, title: 'Guru parampara', style: 'saffron', feet: false, onDrape: true }),
  );
  for (let i = 0; i < 7; i++) add(poster(`BAPS & Satsang · Key message ${i + 1}`, 's6', 30 + i * 7, 26.2, 90, 4));

  return items;
}
