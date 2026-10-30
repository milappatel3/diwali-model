// False-colour scales for lux maps
const STOPS: [number, [number, number, number]][] = [
  [0, [20, 18, 26]],
  [10, [44, 30, 78]],
  [30, [74, 52, 140]],
  [75, [41, 110, 168]],
  [150, [44, 160, 140]],
  [300, [134, 196, 92]],
  [500, [236, 205, 70]],
  [800, [244, 146, 58]],
  [1200, [246, 236, 226]],
];
const lg = (v: number) => Math.log10(1 + v);

export function luxColor(v: number): [number, number, number] {
  if (!(v > 0)) return STOPS[0][1];
  const x = lg(v);
  for (let i = 1; i < STOPS.length; i++) {
    const a = STOPS[i - 1], b = STOPS[i];
    const xa = lg(a[0]), xb = lg(b[0]);
    if (x <= xb) {
      const t = (x - xa) / (xb - xa);
      return [0, 1, 2].map((k) => Math.round(a[1][k] + (b[1][k] - a[1][k]) * t)) as [number, number, number];
    }
  }
  return STOPS[STOPS.length - 1][1];
}
export const luxCss = (v: number) => {
  const c = luxColor(v);
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};
export function luxGradientCss() {
  const max = lg(1200);
  return `linear-gradient(90deg, ${STOPS.map(([v, c]) => `rgb(${c.join(',')}) ${((lg(v) / max) * 100).toFixed(1)}%`).join(', ')})`;
}
export const LUX_TICKS = [0, 30, 75, 150, 300, 500, 1200];
export const tickPos = (v: number) => (lg(v) / lg(1200)) * 100;

// photo readiness: face lux bands (phone at f/1.8, 1/60 s)
export const PHOTO_BANDS = [
  { min: 300, label: 'Great — ISO ≤ 160', color: [134, 196, 120] as [number, number, number], key: 'great' },
  { min: 150, label: 'Good — ISO 160–320', color: [205, 214, 110] as [number, number, number], key: 'good' },
  { min: 70, label: 'Dim — ISO 320–700', color: [233, 164, 63] as [number, number, number], key: 'dim' },
  { min: 0, label: 'Too dark — noisy / night mode', color: [190, 70, 60] as [number, number, number], key: 'dark' },
];
export function photoColor(face: number): [number, number, number] {
  for (const b of PHOTO_BANDS) if (face >= b.min) return b.color;
  return PHOTO_BANDS[3].color;
}
export const VERDICT_COLOR: Record<string, string> = { great: '#86c478', good: '#cdd66e', dim: '#e9a43f', dark: '#e5604f', ok: '#86b391', low: '#e9a43f', high: '#8fa6c4', uneven: '#d9b45b', glare: '#e5604f' };

export function uvColor(v: number): [number, number, number] {
  const t = Math.min(1, Math.log10(1 + v) / Math.log10(201));
  return [Math.round(20 + 150 * t), Math.round(18 + 30 * t), Math.round(26 + 229 * t)];
}

export const fmtLux = (v: number) => (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(0) : v.toFixed(1));
export const fc = (lux: number) => lux / 10.764;
