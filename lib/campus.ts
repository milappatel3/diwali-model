// Campus model data, extracted from Hindu_Temple_Milpitas_Campus.dwg by scripts/extract_campus.py.
// All coordinates are FEET in the hall frame (origin = Assembly Hall SW interior corner, +x east, +y north).
export interface PolyJ {
  o: number[][];
  h: number[][][];
  g?: 'ext' | 'int' | 'tall' | 'oop';
  z?: number;
  _i?: number; // original index (set by editedData)
}
export type DoorJ = { t: 'leaf'; r: number[][]; x: number } | { t: 'open'; a: number[]; b: number[]; x: number };
export interface CampusData {
  meta: { units: string; origin_dwg_in: number[] };
  footprint: { o: number[][] };
  notInPlan: PolyJ | null;
  walls: PolyJ[];
  glass: number[][];
  doors: DoorJ[];
  rooms: { n: string; x: number; y: number }[];
  roofs: { all: PolyJ[]; noHall: PolyJ[]; oop: PolyJ | null };
  site: {
    hull: number[][];
    planters: PolyJ[];
    walks: PolyJ[];
    stalls: number[][];
    fences: number[][];
    rails: number[][];
    conc: number[][];
    curbs: number[][];
    trees: number[][];
    ada: number[][];
    hydrants: number[][];
    slots: number[][];
    poles: number[][];
  };
}

let cache: Promise<CampusData> | null = null;
/** Loaded on demand so the 230 kB model stays out of the main bundle. */
export function loadCampus(): Promise<CampusData> {
  return (cache ??= import('./campus.json').then((m) => ((m as any).default ?? m) as unknown as CampusData));
}

/** Centre of the main (foyer) entrance on the south facade, from the door leaves in the DWG. */
export const ENTRANCE = { x: -34.4, y: -24.3, span: 50.5 };

/** DWG inches -> hall feet (same transform the extractor used). */
export const dwgX = (X: number) => (X - 45224.6) / 12;
export const dwgY = (Y: number) => (Y - 815.3) / 12;

/** Halls drawn at full ceiling height (feet rects: x0,x1,y0,y1) */
export const TALL_ZONES: [number, number, number, number][] = [
  [dwgX(45150), dwgX(47200), dwgY(780), dwgY(1980)], // Assembly Hall + stage
  [dwgX(45100), dwgX(46700), dwgY(2050), dwgY(3200)], // Mahila Sabha Hall
  [dwgX(44300), dwgX(45040), dwgY(2130), dwgY(2920)], // Mandir Hall (x -75..-17, y 111..174)
  [dwgX(43300), dwgX(44550), dwgY(2250), dwgY(3150)], // Gymnasium
];
export const inTall = (x: number, y: number) => TALL_ZONES.some(([a, b, c, d]) => x >= a && x <= b && y >= c && y <= d);

/** Spaces worth a permanent label in the 3D view */
export const MAJOR_ROOM = /^(assembly hall|foyer|mandir hall|mahila sabha hall|gymnasium|kitchen|library|womens dining|mens dining|multi room|open space)$/i;
