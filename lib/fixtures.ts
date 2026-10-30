// Fixture library with photometric design values.
// Numbers are conservative "design" values from the research pass: generic Amazon/AliExpress listings exaggerate
// wattage, so output was calibrated against published Chauvet / ADJ / Stairville photometric reports
// (generic RGBW par ≈ 55–60% of a Chauvet COLORdash H18X). A global derate (Settings.derate, default 0.85)
// is applied on top for thermal droop after warm-up.
import { kelvinRGB } from './geom';

export type Profile = 'gauss' | 'flat' | 'lambert';

export interface Channel {
  key: string; // 'w','r','g','b','a','ww','cw','uv'
  label: string;
  lm: number; // lumens at 100% (design value, before derate)
  rgb: [number, number, number]; // linear RGB of the emitted light (for rendering & colour metrics)
  cri: number; // effective CRI contribution of this emitter
  watts: number; // electrical watts at 100%
  uvW?: number; // radiant UV-A watts (UV channel only)
  cct?: number;
}

export interface FixtureModel {
  key: string;
  name: string;
  short: string;
  category: 'wash' | 'spot' | 'wall' | 'uv' | 'profile' | 'fresnel' | 'gallery' | 'uplight';
  body: 'par' | 'cob' | 'bar' | 'mini' | 'flood' | 'leko' | 'fresnel' | 'track' | 'uplight';
  channels: Channel[];
  beam: number; // deg (50% intensity)
  field: number; // deg (10%)
  profile: Profile;
  zoom?: [number, number];
  shutters?: boolean;
  barnDoors?: boolean;
  lineSourceFt?: number; // wall washer length (modelled as a row of emitters)
  dmx: { mode: string; ch: number }[];
  weightLb: number;
  sizeIn: { w: number; h: number; d: number };
  ip: string;
  idleW: number;
  owned: boolean; // part of the client's current kit
  price?: [number, number];
  ali?: string; // AliExpress search phrase
  notes: string[];
  defaultCh: Record<string, number>;
}

const R: [number, number, number] = [1, 0.035, 0.01];
const G: [number, number, number] = [0.08, 1, 0.12];
const B: [number, number, number] = [0.07, 0.05, 1];
const A: [number, number, number] = [1, 0.42, 0.02];
const UVc: [number, number, number] = [0.32, 0.0, 1];
const K = (k: number) => kelvinRGB(k);

export const FIXTURES: Record<string, FixtureModel> = {
  rgbwPar200: {
    key: 'rgbwPar200',
    name: '200W RGBW 4-in-1 LED Par (18×10W quad)',
    short: 'RGBW Par',
    category: 'wash',
    body: 'par',
    channels: [
      { key: 'r', label: 'Red', lm: 560, rgb: R, cri: 50, watts: 28 },
      { key: 'g', label: 'Green', lm: 900, rgb: G, cri: 50, watts: 30 },
      { key: 'b', label: 'Blue', lm: 240, rgb: B, cri: 50, watts: 30 },
      { key: 'w', label: 'White ~7000K', lm: 1300, rgb: K(7000), cri: 72, watts: 30, cct: 7000 },
    ],
    beam: 22,
    field: 40,
    profile: 'gauss',
    dmx: [
      { mode: '8ch', ch: 8 },
      { mode: '4ch RGBW', ch: 4 },
    ],
    weightLb: 5.5,
    sizeIn: { w: 10, h: 11, d: 10 },
    ip: 'IP20',
    idleW: 4,
    owned: true,
    notes: [
      '“200W” is the sum of emitter ratings; real draw ≈ 120 W with everything on, ≈ 30 W white-only.',
      'White emitter ≈ 40% of total output, ≈ 7000 K, CRI ≈ 70 — use for colour & atmosphere, not as a face key light.',
      'Design values: white-only ≈ 865 lx @ 3 m, ≈ 311 lx @ 5 m (centre beam).',
    ],
    defaultCh: { r: 0.55, g: 0.22, b: 0, w: 1 },
  },
  cobPar100: {
    key: 'cobPar100',
    name: '100W COB Par, warm/cool bi-colour (barn doors)',
    short: 'COB 100',
    category: 'wash',
    body: 'cob',
    channels: [
      { key: 'ww', label: 'Warm 3200K', lm: 1750, rgb: K(3200), cri: 80, watts: 45, cct: 3200 },
      { key: 'cw', label: 'Cool 5600K', lm: 1750, rgb: K(5600), cri: 80, watts: 45, cct: 5600 },
    ],
    beam: 45,
    field: 70,
    profile: 'gauss',
    barnDoors: true,
    dmx: [{ mode: '3ch', ch: 3 }],
    weightLb: 5.3,
    sizeIn: { w: 9, h: 10, d: 9 },
    ip: 'IP20',
    idleW: 3,
    owned: true,
    notes: [
      'Reflector COB, ≈ 45° beam / 70° field. Both channels at full ≈ 3,500 lm (≈ 578 lx @ 3 m).',
      'CRI ≈ 80 — acceptable fill for faces, warm channel looks best on skin.',
    ],
    defaultCh: { ww: 1, cw: 0.35 },
  },
  wallWash9x12: {
    key: 'wallWash9x12',
    name: 'Wall Washer Bar 9×12W RGBW 4-in-1',
    short: 'Wall Wash',
    category: 'wall',
    body: 'bar',
    channels: [
      { key: 'r', label: 'Red', lm: 360, rgb: R, cri: 50, watts: 17 },
      { key: 'g', label: 'Green', lm: 620, rgb: G, cri: 50, watts: 18 },
      { key: 'b', label: 'Blue', lm: 220, rgb: B, cri: 50, watts: 18 },
      { key: 'w', label: 'White ~7500K', lm: 800, rgb: K(7500), cri: 68, watts: 18, cct: 7500 },
    ],
    beam: 25,
    field: 40,
    profile: 'gauss',
    lineSourceFt: 1.6,
    dmx: [
      { mode: '8ch', ch: 8 },
      { mode: '4ch', ch: 4 },
    ],
    weightLb: 7,
    sizeIn: { w: 19, h: 5, d: 4 },
    ip: 'IP20',
    idleW: 3,
    owned: true,
    notes: ['Best as an up-light / grazer on drape, banners or textured wood. Modelled as a row of 9 emitters.'],
    defaultCh: { r: 1, g: 0.32, b: 0, w: 0.2 },
  },
  artFraming20: {
    key: 'artFraming20',
    name: 'LED Art Spot — 20W mini profile (shutters, warm/cool)',
    short: 'Art Spot',
    category: 'profile',
    body: 'mini',
    channels: [
      { key: 'ww', label: 'Warm 3000K', lm: 160, rgb: K(3000), cri: 82, watts: 10, cct: 3000 },
      { key: 'cw', label: 'Cool 6000K', lm: 160, rgb: K(6000), cri: 80, watts: 10, cct: 6000 },
    ],
    beam: 15,
    field: 17,
    profile: 'flat',
    zoom: [10, 30],
    shutters: true,
    dmx: [{ mode: '2ch', ch: 2 }],
    weightLb: 3,
    sizeIn: { w: 4, h: 6, d: 9 },
    ip: 'IP20',
    idleW: 2,
    owned: true,
    notes: ['Hard-edged gallery spot: imaging optics pass only ≈ 20% of the COB light, ≈ 300 lm delivered.', 'Ideal for one poster at 2–4 m; shutters keep light off the drape.'],
    defaultCh: { ww: 1, cw: 0 },
  },
  artPinspot10: {
    key: 'artPinspot10',
    name: 'LED Art Spot — 10W RGBW pinspot',
    short: 'Pinspot',
    category: 'spot',
    body: 'mini',
    channels: [
      { key: 'r', label: 'Red', lm: 32, rgb: R, cri: 50, watts: 3 },
      { key: 'g', label: 'Green', lm: 50, rgb: G, cri: 50, watts: 3 },
      { key: 'b', label: 'Blue', lm: 13, rgb: B, cri: 50, watts: 3 },
      { key: 'w', label: 'White', lm: 75, rgb: K(6500), cri: 70, watts: 3, cct: 6500 },
    ],
    beam: 6,
    field: 11,
    profile: 'gauss',
    dmx: [{ mode: '6ch', ch: 6 }],
    weightLb: 2.3,
    sizeIn: { w: 4, h: 6, d: 6 },
    ip: 'IP20',
    idleW: 2,
    owned: true,
    notes: ['Very narrow (≈ 6°) — a 0.5 m pool at 5 m. Good for a murti or a small object, not for posters.'],
    defaultCh: { r: 0.3, g: 0.1, b: 0, w: 1 },
  },
  artGallery30: {
    key: 'artGallery30',
    name: 'LED Art Spot — 30W gallery spot 3000K CRI90',
    short: 'Gallery 30',
    category: 'gallery',
    body: 'track',
    channels: [{ key: 'ww', label: 'Warm 3000K', lm: 1500, rgb: K(3000), cri: 90, watts: 28, cct: 3000 }],
    beam: 24,
    field: 40,
    profile: 'gauss',
    dmx: [{ mode: 'non-DMX (dimmer)', ch: 0 }],
    weightLb: 2,
    sizeIn: { w: 3.5, h: 7, d: 7 },
    ip: 'IP20',
    idleW: 1,
    owned: true,
    notes: ['≈ 840 lx @ 3 m. Great poster light; CRI 90 renders skin well.'],
    defaultCh: { ww: 1 },
  },
  uvFlood100: {
    key: 'uvFlood100',
    name: 'UV Flood Light 100W (395–405 nm)',
    short: 'UV Flood',
    category: 'uv',
    body: 'flood',
    channels: [{ key: 'uv', label: 'UV-A 395nm', lm: 6, rgb: UVc, cri: 0, watts: 60, uvW: 12 }],
    beam: 100,
    field: 140,
    profile: 'lambert',
    dmx: [{ mode: 'none (on/off)', ch: 0 }],
    weightLb: 4,
    sizeIn: { w: 11, h: 9, d: 3 },
    ip: 'IP66',
    idleW: 0,
    owned: true,
    notes: [
      'Adds essentially nothing to lux (395 nm is almost invisible to the eye / phone exposure).',
      'Makes fluorescent paint, white fabric and teeth glow; ≈ 40 µW/cm² at 3 m. Keep away from the face-photo zones.',
    ],
    defaultCh: { uv: 1 },
  },
  // ——— Purchase candidates (AliExpress) ———
  leko200: {
    key: 'leko200',
    name: '200W LED Ellipsoidal / Profile 3200K CRI95 (26° fixed)',
    short: 'Leko 200',
    category: 'profile',
    body: 'leko',
    channels: [{ key: 'ww', label: 'Warm 3200K', lm: 5000, rgb: K(3200), cri: 95, watts: 200, cct: 3200 }],
    beam: 19,
    field: 26,
    profile: 'flat',
    shutters: true,
    dmx: [{ mode: '3ch', ch: 3 }],
    weightLb: 22,
    sizeIn: { w: 10, h: 18, d: 30 },
    ip: 'IP20',
    idleW: 8,
    owned: false,
    price: [250, 450],
    ali: 'LED profile spot 200W warm white CRI95 ellipsoidal leko shutter',
    notes: ['≈ 2,400 lx @ 5 m — enough to dim way down. Shutters frame a poster or a face zone precisely.', 'Fans are audible; heavy (≈ 10 kg) — crank stand or truss, not a T-bar.'],
    defaultCh: { ww: 1 },
  },
  fresnel200: {
    key: 'fresnel200',
    name: '200W Bi-colour COB Fresnel CRI95 (zoom 15–50°, barn doors)',
    short: 'Fresnel 200',
    category: 'fresnel',
    body: 'fresnel',
    channels: [
      { key: 'ww', label: 'Warm 3200K', lm: 4000, rgb: K(3200), cri: 95, watts: 100, cct: 3200 },
      { key: 'cw', label: 'Daylight 5600K', lm: 4000, rgb: K(5600), cri: 95, watts: 100, cct: 5600 },
    ],
    beam: 35,
    field: 60,
    profile: 'gauss',
    zoom: [15, 50],
    barnDoors: true,
    dmx: [{ mode: '4ch', ch: 4 }],
    weightLb: 13,
    sizeIn: { w: 12, h: 13, d: 14 },
    ip: 'IP20',
    idleW: 6,
    owned: false,
    price: [180, 320],
    ali: '200W bi-color LED fresnel COB CRI 95 DMX barn door studio',
    notes: ['The face/photo light: soft, high-CRI, zoomable. Ask the seller for a spectrometer reading (R9 > 50).'],
    defaultCh: { ww: 1, cw: 0.25 },
  },
  cobPar200: {
    key: 'cobPar200',
    name: '200W COB Par 3000K CRI90 (warm white)',
    short: 'COB 200',
    category: 'wash',
    body: 'cob',
    channels: [{ key: 'ww', label: 'Warm 3000K', lm: 6000, rgb: K(3000), cri: 90, watts: 180, cct: 3000 }],
    beam: 50,
    field: 80,
    profile: 'gauss',
    barnDoors: true,
    dmx: [{ mode: '2ch', ch: 2 }],
    weightLb: 8,
    sizeIn: { w: 11, h: 12, d: 11 },
    ip: 'IP20',
    idleW: 4,
    owned: false,
    price: [60, 130],
    ali: '200W COB LED par warm white CRI 90 DMX stage light',
    notes: ['Cheap, bright, wide. Used to light the house through its sheer fabric ceiling.'],
    defaultCh: { ww: 1 },
  },
  gallery30: {
    key: 'gallery30',
    name: '30W COB Track/Clamp Spot 3000K CRI90 24°',
    short: 'Track 30',
    category: 'gallery',
    body: 'track',
    channels: [{ key: 'ww', label: 'Warm 3000K', lm: 1500, rgb: K(3000), cri: 90, watts: 28, cct: 3000 }],
    beam: 24,
    field: 40,
    profile: 'gauss',
    dmx: [{ mode: 'non-DMX', ch: 0 }],
    weightLb: 2,
    sizeIn: { w: 3.5, h: 7, d: 7 },
    ip: 'IP20',
    idleW: 1,
    owned: false,
    price: [15, 40],
    ali: '30W COB LED track spotlight CRI90 3000K 24 degree + pipe clamp adapter',
    notes: ['Mount on a T-bar or the drape crossbar with a 1.5″ pipe clamp + track adapter. ≈ 840 lx @ 3 m.'],
    defaultCh: { ww: 1 },
  },
  batteryUp: {
    key: 'batteryUp',
    name: 'Battery Wireless-DMX Uplight 6×18W RGBWA+UV',
    short: 'Battery Up',
    category: 'uplight',
    body: 'uplight',
    channels: [
      { key: 'r', label: 'Red', lm: 250, rgb: R, cri: 50, watts: 12 },
      { key: 'g', label: 'Green', lm: 400, rgb: G, cri: 50, watts: 12 },
      { key: 'b', label: 'Blue', lm: 100, rgb: B, cri: 50, watts: 12 },
      { key: 'w', label: 'White', lm: 500, rgb: K(6500), cri: 72, watts: 12, cct: 6500 },
      { key: 'a', label: 'Amber', lm: 300, rgb: A, cri: 55, watts: 12 },
    ],
    beam: 25,
    field: 40,
    profile: 'gauss',
    dmx: [{ mode: '10ch (wireless)', ch: 10 }],
    weightLb: 11,
    sizeIn: { w: 7, h: 10, d: 7 },
    ip: 'IP65',
    idleW: 0,
    owned: false,
    price: [130, 200],
    ali: 'battery LED uplight 6x18W RGBWA UV wireless DMX charging case',
    notes: ['No cables to run across walkways. 4–6 h at full output. Colour on drape/architecture, not faces.'],
    defaultCh: { r: 1, g: 0.25, b: 0, w: 0.2, a: 1 },
  },
};

export const OWNED_KEYS = ['rgbwPar200', 'cobPar100', 'wallWash9x12', 'artSpot', 'uvFlood100'] as const;
export const BUY_KEYS = ['fresnel200', 'cobPar200', 'gallery30', 'leko200', 'batteryUp'] as const;

export const ART_VARIANTS: Record<string, string> = {
  framing20: 'artFraming20',
  pinspot10: 'artPinspot10',
  gallery30: 'artGallery30',
};

/** Resolve a fixture model key, mapping the generic 'artSpot' to the chosen variant */
export function resolveModel(key: string, artVariant: string): FixtureModel {
  if (key === 'artSpot') return FIXTURES[ART_VARIANTS[artVariant] || 'artFraming20'];
  return FIXTURES[key];
}

export const DEFAULT_INVENTORY: Record<string, number> = {
  rgbwPar200: 8,
  cobPar100: 4,
  wallWash9x12: 2,
  artSpot: 4,
  uvFlood100: 2,
};

/** Fraction of lumens from saturated (narrowband) channels -> effective CRI */
export function mixMetrics(m: FixtureModel, ch: Record<string, number>) {
  let lm = 0, criSum = 0, rgb: [number, number, number] = [0, 0, 0], watts = m.idleW, uvW = 0;
  for (const c of m.channels) {
    const lv = Math.max(0, Math.min(1, ch[c.key] ?? 0));
    const l = c.lm * lv;
    lm += l;
    criSum += l * c.cri;
    // weight rgb by lumens / luminance of the colour so the mix chromaticity is right
    const Y = 0.2126 * c.rgb[0] + 0.7152 * c.rgb[1] + 0.0722 * c.rgb[2] || 1;
    rgb = [rgb[0] + (c.rgb[0] * l) / Y, rgb[1] + (c.rgb[1] * l) / Y, rgb[2] + (c.rgb[2] * l) / Y];
    watts += c.watts * lv;
    uvW += (c.uvW || 0) * lv;
  }
  const mx = Math.max(...rgb) || 1;
  return {
    lm,
    cri: lm > 0 ? criSum / lm : 0,
    rgb: [rgb[0] / mx, rgb[1] / mx, rgb[2] / mx] as [number, number, number],
    watts,
    uvW,
  };
}
