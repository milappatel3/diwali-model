// Assembly Hall geometry, taken from "Hindu_Temple_Milpitas_Campus.dwg" (1430 California Circle, Milpitas).
// Drawing units are inches. Hall origin (0,0) = DWG (45224.6, 815.3) = south-west interior corner of the hall floor.
// All values below are FEET in hall coordinates (+x east toward the stage, +y north).
import type { V2 } from './types';

export const HALL = {
  dwgOrigin: { x: 45224.6, y: 815.3, units: 'in' },
  // audience floor (interior faces of walls)
  W: 119.48, // west wall (x=0) to stage front edge — DWG 45224.6 → 46658.4
  D: 95.17, // south wall (y=0) to north wall — DWG 815.3 → 1957.3
  // side passages beside the stage continue east at floor level
  southPassage: { x0: 119.48, x1: 125.08, y0: 0, y1: 12.67 },
  northPassage: { x0: 119.48, x1: 124.42, y0: 82.67, y1: 95.17 },
  stage: {
    x0: 119.48, // front edge (DWG layer A-Flor-Strs, 46658.4)
    x1: 160.38, // east wall 47149.2
    y0: 12.67, // DWG 967.3
    y1: 82.67, // DWG 1807.3
    stairs: [
      { x0: 119.48, x1: 124.42, y0: 12.67, y1: 18.67, dir: 'n' as const },
      { x0: 119.48, x1: 124.42, y0: 76.67, y1: 82.67, dir: 's' as const },
    ],
  },
  // rooms that sit on the stage corners (solid for our purposes)
  stageRooms: [
    { name: 'Audio Visual / Costume', x0: 125.08, x1: 147.08, y0: 0, y1: 18.67 },
    { name: 'Sabha Team Room', x0: 124.42, x1: 137.08, y0: 76.67, y1: 95.17 },
  ],
} as const;

export interface Opening {
  id: string;
  wall: 'S' | 'N' | 'W' | 'E';
  a: number; // start along wall (ft)
  b: number; // end
  kind: 'door-pair' | 'door' | 'opening' | 'glazing';
  label: string;
  swing?: 'out' | 'in';
  exit?: boolean;
}

// Openings measured from DWG door leaves / gaps (A-Door, I-Wall, A-Glaz layers)
export const OPENINGS: Opening[] = [
  { id: 'W-main', wall: 'W', a: 36.67, b: 58.67, kind: 'opening', label: 'Main entrance from Foyer (22′ open)', exit: true },
  { id: 'W-gl1', wall: 'W', a: 20.0, b: 34.0, kind: 'glazing', label: 'Storefront glazing to Foyer' },
  { id: 'W-gl2', wall: 'W', a: 61.5, b: 83.3, kind: 'glazing', label: 'Storefront glazing to Foyer' },
  { id: 'S1', wall: 'S', a: 7.7, b: 15.9, kind: 'door-pair', label: 'Exit to Sabha Hall exit way', swing: 'out', exit: true },
  { id: 'S2a', wall: 'S', a: 26.1, b: 32.4, kind: 'door-pair', label: 'Exit (pair)', swing: 'out', exit: true },
  { id: 'S2b', wall: 'S', a: 34.5, b: 40.8, kind: 'door-pair', label: 'Exit (pair)', swing: 'out', exit: true },
  { id: 'S2c', wall: 'S', a: 43.4, b: 46.4, kind: 'door', label: 'Door', swing: 'in', exit: true },
  { id: 'S4', wall: 'S', a: 101.2, b: 104.2, kind: 'door', label: 'Door to Multi room corridor', swing: 'in', exit: true },
  { id: 'S5a', wall: 'S', a: 110.1, b: 116.4, kind: 'door-pair', label: 'Exit (pair)', swing: 'out', exit: true },
  { id: 'S5b', wall: 'S', a: 117.0, b: 123.3, kind: 'door-pair', label: 'Exit (pair) — south passage', swing: 'out', exit: true },
  { id: 'N1', wall: 'N', a: 7.7, b: 13.4, kind: 'door-pair', label: 'Door pair to corridor', swing: 'out', exit: true },
  { id: 'N1b', wall: 'N', a: 15.9, b: 18.9, kind: 'door', label: 'Door', swing: 'out', exit: true },
  { id: 'N2a', wall: 'N', a: 110.3, b: 116.5, kind: 'door-pair', label: 'Door pair to Mahila Sabha Hall', swing: 'out', exit: true },
  { id: 'N2b', wall: 'N', a: 117.1, b: 123.4, kind: 'door-pair', label: 'Door pair — north passage', swing: 'out', exit: true },
];

export function openingSegment(o: Opening): [V2, V2] {
  switch (o.wall) {
    case 'S':
      return [{ x: o.a, y: 0 }, { x: o.b, y: 0 }];
    case 'N':
      return [{ x: o.a, y: HALL.D }, { x: o.b, y: HALL.D }];
    case 'W':
      return [{ x: 0, y: o.a }, { x: 0, y: o.b }];
    default:
      return [{ x: HALL.stage.x1, y: o.a }, { x: HALL.stage.x1, y: o.b }];
  }
}

/** Floor polygon for the whole room incl. stage (used for bounds & calc grid) */
export const ROOM_POLY: V2[] = [
  { x: 0, y: 0 },
  { x: 125.08, y: 0 },
  { x: 125.08, y: 18.67 },
  { x: 160.38, y: 18.67 },
  { x: 160.38, y: 76.67 },
  { x: 124.42, y: 76.67 },
  { x: 124.42, y: 95.17 },
  { x: 0, y: 95.17 },
];

/** Audience floor (level 0) polygon — where the exhibition lives */
export const FLOOR_POLY: V2[] = [
  { x: 0, y: 0 },
  { x: 125.08, y: 0 },
  { x: 125.08, y: 12.67 },
  { x: 119.48, y: 12.67 },
  { x: 119.48, y: 82.67 },
  { x: 124.42, y: 82.67 },
  { x: 124.42, y: 95.17 },
  { x: 0, y: 95.17 },
];

export const HALL_FACTS = [
  ['Audience floor', '119′ 6″ × 95′ 2″ (≈ 11,370 sq ft) — no interior columns'],
  ['Stage', '≈ 41′ deep × 70′ wide at the front edge, stairs at both ends'],
  ['Main entrance', '22′ opening on the west wall from the Foyer'],
  ['Exits', '13 door leaves/pairs on the south and north walls (keep clear)'],
  ['West wall', 'Storefront glazing into the Foyer either side of the entrance'],
  ['Ceiling', 'Not in the 2D drawing — default 20′ (neighbouring California Circle flex buildings are 20–22′ clear). Verify on site.'],
];
