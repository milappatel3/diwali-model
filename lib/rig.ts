import type { Item, V2, V3 } from './types';
import { local } from './geom';

export const SLOT_PITCH = { tbar: 1.15, crank: 1.1 } as Record<string, number>;
export const RIG_TYPES = new Set(['tbar', 'crank', 'pipebar']);
/** Fixtures hang from a side arm this far off the drape line, so the lamp clears the fabric */
export const DRAPE_ARM_FT = 0.55;
/** Lens sits this far below the top of a drape light pipe (clamp + yoke drop) */
export const DRAPE_DROP_FT = 0.75;

/** Anything a fixture can be hung on: stands, light pipes, and pipe & drape runs fitted with a light pipe */
export function isRig(it: Item | undefined | null): boolean {
  if (!it) return false;
  return RIG_TYPES.has(it.type) || (it.type === 'drape' && !!it.params?.lightPipe);
}

function runPts(run: Item): V2[] {
  const pts = (run.points || []).map((p) => ({ x: run.x + p.x, y: run.y + p.y }));
  if (run.params?.closed && pts.length > 2) pts.push(pts[0]);
  return pts;
}
export function runLength(run: Item) {
  const pts = runPts(run);
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return L;
}
/** Point and unit direction at distance u (ft) along a drape run */
export function runPoint(run: Item, u: number): { p: V2; d: V2 } {
  const pts = runPts(run);
  if (pts.length < 2) return { p: { x: run.x, y: run.y }, d: { x: 1, y: 0 } };
  let rem = Math.max(0, u);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const L = Math.hypot(b.x - a.x, b.y - a.y);
    if (L < 1e-6) continue;
    const d = { x: (b.x - a.x) / L, y: (b.y - a.y) / L };
    if (rem <= L || i === pts.length - 1) {
      const t = Math.min(rem, L);
      return { p: { x: a.x + d.x * t, y: a.y + d.y * t }, d };
    }
    rem -= L;
  }
  return { p: pts[pts.length - 1], d: { x: 1, y: 0 } };
}
/** Distance along a run of the closest point to (x, y) */
export function projectOnRun(run: Item, x: number, y: number): number {
  const pts = runPts(run);
  let best = Infinity, bestU = 0, acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const L = Math.hypot(b.x - a.x, b.y - a.y);
    if (L < 1e-6) continue;
    const t = Math.max(0, Math.min(L, ((x - a.x) * (b.x - a.x) + (y - a.y) * (b.y - a.y)) / L));
    const px = a.x + ((b.x - a.x) * t) / L, py = a.y + ((b.y - a.y) * t) / L;
    const dd = Math.hypot(x - px, y - py);
    if (dd < best) {
      best = dd;
      bestU = acc + t;
    }
    acc += L;
  }
  return bestU;
}
/** Where a drape-hung fixture's arm meets the pipe, and which side of the drape it hangs on */
export function drapeHang(fx: Item, run: Item): { pipe: V2; lamp: V2; side: number } {
  const { p, d } = runPoint(run, fx.params?.u ?? 0);
  const n = { x: -d.y, y: d.x };
  const a = fx.params?.aim;
  let side = fx.params?.side ?? 0;
  if (!side) side = a ? Math.sign((a.x - p.x) * n.x + (a.y - p.y) * n.y) || 1 : 1;
  return { pipe: p, lamp: { x: p.x + n.x * side * DRAPE_ARM_FT, y: p.y + n.y * side * DRAPE_ARM_FT }, side };
}

/** World position (ft) of a fixture's lens, resolving its rig (stand, light pipe or drape run) if any */
export function fixtureWorld(fx: Item, byId: Map<string, Item> | Record<string, Item>): V3 {
  const p = fx.params || {};
  const get = (id: string) => (byId instanceof Map ? byId.get(id) : (byId as Record<string, Item>)[id]);
  if (p.rig) {
    const rig = get(p.rig);
    if (rig && rig.type === 'drape') {
      const { lamp } = drapeHang(fx, rig);
      return { x: lamp.x, y: lamp.y, z: (rig.z || 0) + (rig.params?.h ?? 10) - DRAPE_DROP_FT };
    }
    if (rig) {
      const pitch = SLOT_PITCH[rig.type] ?? 1.15;
      const nSlots = rig.type === 'crank' ? 6 : 4;
      const u = rig.type === 'pipebar' ? p.u ?? 0 : ((p.slot ?? 0) - (nSlots - 1) / 2) * pitch;
      const w = local(rig.x, rig.y, rig.rot, u, 0.15);
      return { x: w.x, y: w.y, z: (rig.z || 0) + (rig.params?.h ?? 11) - 0.35 };
    }
  }
  const mount = p.mount || 'floor';
  const z = mount === 'floor' ? 0.75 : (p.h ?? 8);
  return { x: fx.x, y: fx.y, z: (fx.z || 0) + z };
}

export function fixtureAim(fx: Item, pos: V3): V3 {
  const a = fx.params?.aim;
  if (a && Number.isFinite(a.x)) return { x: a.x, y: a.y, z: a.z ?? 0 };
  return { x: pos.x, y: pos.y + 5, z: 0 };
}

export function rigFixtures(rigId: string, items: Item[]) {
  return items.filter((i) => i.type === 'fixture' && i.params?.rig === rigId);
}
