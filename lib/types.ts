// Core data model. All plan dimensions are in FEET in "hall coordinates":
// origin = south-west interior corner of the Assembly Hall floor, +x = east, +y = north, z = up.
// Rotation `rot` is the direction the item's FRONT faces, degrees CCW from +x (east).
//   rot 90 = faces north, rot 270 = faces south, rot 0 = faces east, rot 180 = faces west.

export type V2 = { x: number; y: number };
export type V3 = { x: number; y: number; z: number };

export type SectionId = 'entry' | 's1' | 's2' | 's3' | 's4' | 's5' | 's6' | 'photo' | 'stage' | 'infra';

export interface Item {
  id: string;
  type: string; // catalog key
  name: string;
  section: SectionId;
  x: number;
  y: number;
  rot: number;
  z?: number; // base elevation (ft) — e.g. stage deck
  params: Record<string, any>;
  points?: V2[]; // polyline items (drape runs, stanchion lines), relative to x,y
  locked?: boolean;
  hidden?: boolean;
  note?: string;
}

export interface FixtureState {
  dim: number; // master 0..1
  ch: Record<string, number>; // per emitter channel 0..1
  zoom?: number; // beam deg if zoomable
}

export interface HouseLights {
  enabled: boolean;
  level: number; // 0..1
  rows: number;
  cols: number;
  lumensEach: number;
  cct: number;
  cri: number;
  beam: number;
}

export interface Settings {
  ceilingFt: number; // hall ceiling / bottom of structure
  floorFinish: 'carpet' | 'vinyl' | 'concrete';
  derate: number; // thermal + dirt derate for budget fixtures
  faceHeightFt: number; // 5.25 ft ~ 1.6 m (adult) — adjustable for kids 4 ft
  gridFt: number; // calc grid
  bounce: boolean; // include inter-reflection estimate
  stageHeightFt: number;
  hazeBeams: boolean;
  wallRho: number;
  ceilingRho: number;
}

export interface Probe {
  id: string;
  name: string;
  x: number;
  y: number;
  facing: number; // deg — direction the FACE points (toward the camera)
  heightFt?: number;
  section?: SectionId;
}

export interface Project {
  version: number;
  name: string;
  venue: string;
  items: Item[];
  probes: Probe[];
  house: HouseLights;
  settings: Settings;
  inventory: Record<string, number>; // fixture model -> owned qty
  artSpotVariant: 'framing20' | 'pinspot10' | 'gallery30';
  updatedAt: number;
}

// Geometry primitives produced by catalog items for the photometric engine & 3D.
export type MatKey =
  | 'drapeBlack' | 'drapeIvory' | 'drapeMaroon' | 'plywood' | 'mdf' | 'mdfPainted' | 'wood' | 'woodDark'
  | 'drywall' | 'fabricSheer' | 'poster' | 'banner' | 'metal' | 'chrome' | 'black' | 'mirror' | 'glass'
  | 'carpet' | 'plant' | 'cushion' | 'gold' | 'screen' | 'stone' | 'acrylic' | 'paper' | 'white'
  | 'paintOchre' | 'paintPeach' | 'paintSaffron' | 'paintSage' | 'paintCream' | 'couchTeal' | 'granite' | 'terracotta';

export interface Solid {
  // oriented box in FEET: center, size (sx along local x, sy along local y, sz up), yaw (deg CCW)
  c: V3;
  s: V3;
  yaw: number;
  mat: MatKey;
  tau?: number; // transmittance for translucent (fabric) — light passes & diffuses
  shadow?: boolean; // default true
  vis?: boolean; // false = photometric occluder only; the 3D view draws a detailed model instead
  label?: string;
}

export interface Surface {
  id: string;
  itemId: string;
  name: string;
  c: V3; // center ft
  n: V3; // unit normal (world)
  w: number; // ft along "right" axis
  h: number; // ft vertical extent (or along second axis)
  up: V3; // unit "up" axis of the surface rect
  kind: 'poster' | 'panel' | 'diorama' | 'banner' | 'tabletop' | 'screen' | 'mirror';
  target: [number, number]; // recommended lux range
  section: SectionId;
}

export interface Emitter {
  // diffuse area emitter (self-lit dioramas, screens, practical lamps, LED strings)
  id: string;
  itemId: string;
  name: string;
  c: V3; // ft
  n: V3 | null; // null = isotropic point (bulb)
  areaFt2: number;
  nits?: number; // luminance cd/m2 for panels
  lumens?: number; // for isotropic bulbs
  rgb: [number, number, number];
  cct: number;
  cri: number;
  uv?: boolean;
}
