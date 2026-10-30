import type { Item, Project, SectionId } from './types';
import { TYPES, drapeCounts, type BomLine } from './catalog';
import { FIXTURES, mixMetrics, resolveModel } from './fixtures';
import { fixtureWorld } from './rig';
import { SECTION_MAP } from './content';

export interface FixtureRow {
  id: string;
  name: string;
  section: SectionId;
  modelKey: string; // inventory key ('artSpot' stays generic)
  model: ReturnType<typeof resolveModel>;
  rig?: Item;
  pos: { x: number; y: number; z: number };
  aim: { x: number; y: number; z: number };
  throwFt: number;
  watts: number;
  wattsMax: number;
  lm: number;
  cri: number;
  rgb: [number, number, number];
  dmxCh: number;
  universe: number;
  address: number;
  circuit: string;
}

const ORDER: SectionId[] = ['entry', 's1', 's2', 's3', 's4', 's5', 's6', 'photo', 'stage', 'infra'];

export function fixtureRows(p: Project): FixtureRow[] {
  const byId = new Map(p.items.map((i) => [i.id, i]));
  const fx = p.items.filter((i) => i.type === 'fixture' && !i.hidden);
  fx.sort((a, b) => ORDER.indexOf(a.section) - ORDER.indexOf(b.section) || a.name.localeCompare(b.name));
  let addr = 1, uni = 1;
  const rows: FixtureRow[] = [];
  // circuits: group by section, 1440 W continuous per 15 A / 120 V circuit
  const secW: Record<string, number> = {};
  for (const it of fx) {
    const m = resolveModel(it.params.model, p.artSpotVariant);
    if (!m) continue;
    const dim = it.params.dim ?? 1;
    const ch: Record<string, number> = {};
    for (const c of m.channels) ch[c.key] = (it.params.ch ? it.params.ch[c.key] ?? 0 : m.defaultCh[c.key] ?? 0) * dim;
    const mix = mixMetrics(m, ch);
    const full = mixMetrics(m, Object.fromEntries(m.channels.map((c) => [c.key, 1])));
    const pos = fixtureWorld(it, byId);
    const a = it.params.aim || { x: pos.x, y: pos.y + 5, z: 0 };
    const dmxCh = m.dmx[0]?.ch || 0;
    let address = 0, universe = 0;
    if (dmxCh > 0 && m.category !== 'uv') {
      if (addr + dmxCh - 1 > 512) {
        uni++;
        addr = 1;
      }
      address = addr;
      universe = uni;
      addr += dmxCh;
    }
    secW[it.section] = (secW[it.section] || 0) + full.watts;
    const circuitIdx = Math.ceil(secW[it.section] / 1440);
    rows.push({
      id: it.id,
      name: it.name,
      section: it.section,
      modelKey: it.params.model,
      model: m,
      rig: it.params.rig ? byId.get(it.params.rig) : undefined,
      pos,
      aim: a,
      throwFt: Math.hypot(a.x - pos.x, a.y - pos.y, a.z - pos.z),
      watts: mix.watts,
      wattsMax: full.watts,
      lm: mix.lm * p.settings.derate,
      cri: mix.cri,
      rgb: mix.rgb,
      dmxCh,
      universe,
      address,
      circuit: `${(SECTION_MAP[it.section]?.num ? 'S' + SECTION_MAP[it.section].num : SECTION_MAP[it.section]?.title || it.section).toString()}-${circuitIdx}`,
    });
  }
  return rows;
}

export interface BomResult {
  lines: (BomLine & { toBuy: number; owned: number })[];
  byCat: Record<string, (BomLine & { toBuy: number; owned: number })[]>;
  cost: [number, number];
  fixtureUse: { key: string; name: string; used: number; owned: number; toBuy: number; price?: [number, number]; ali?: string }[];
}

export function computeBom(p: Project): BomResult {
  const map = new Map<string, BomLine>();
  const addLine = (l: BomLine) => {
    const ex = map.get(l.key);
    if (ex) ex.qty += l.qty;
    else map.set(l.key, { ...l });
  };
  for (const it of p.items) {
    if (it.hidden || it.type === 'fixture') continue;
    const lines = TYPES[it.type]?.bom?.(it) || [];
    lines.forEach(addLine);
  }
  // fixtures
  const rows = fixtureRows(p);
  const use = new Map<string, number>();
  for (const r of rows) use.set(r.modelKey, (use.get(r.modelKey) || 0) + 1);
  const fixtureUse: BomResult['fixtureUse'] = [];
  for (const [key, used] of use) {
    const m = resolveModel(key, p.artSpotVariant);
    const owned = p.inventory[key] ?? 0;
    const toBuy = Math.max(0, used - owned);
    fixtureUse.push({ key, name: key === 'artSpot' ? `LED Art Spot (${m.short})` : m.name, used, owned, toBuy, price: m.price || FIXTURES[key]?.price, ali: m.ali || FIXTURES[key]?.ali });
    addLine({ key: `fx-${key}`, name: key === 'artSpot' ? `LED Art Spot — ${m.name.replace('LED Art Spot — ', '')}` : m.name, qty: used, unit: 'ea', cat: 'Lighting', price: m.price, ali: m.ali, owned });
  }
  for (const [key, owned] of Object.entries(p.inventory)) if (!use.has(key) && owned > 0) fixtureUse.push({ key, name: resolveModel(key, p.artSpotVariant).name, used: 0, owned, toBuy: 0 });
  // accessories
  const onRig = rows.filter((r) => r.rig || r.model.body !== 'flood');
  const clamps = rows.filter((r) => r.rig || p.items.find((i) => i.id === r.id)?.params.mount === 'clamp').length;
  if (clamps) addLine({ key: 'clamp', name: 'Pipe clamp (1.5″–2″ C-clamp / half-coupler) for each hung fixture', qty: clamps, unit: 'ea', cat: 'Rigging & stands', price: [3, 8], ali: 'stage light hook clamp aluminum 50mm' });
  if (onRig.length) addLine({ key: 'safety', name: 'Safety cable (steel, 3 mm × 60 cm) per hung fixture', qty: clamps, unit: 'ea', cat: 'Rigging & stands', price: [1.5, 4], ali: 'stage light safety cable steel wire' });
  const onDrape = rows.filter((r) => r.rig?.type === 'drape').length;
  if (onDrape) addLine({ key: 'sidearm', name: 'Side arm 12″ with 1½″ pipe clamp (hangs a fixture just off the drape line)', qty: onDrape, unit: 'ea', cat: 'Rigging & stands', price: [6, 14], ali: 'stage lighting side arm 30cm with clamp 50mm' });
  const trackAdapters = rows.filter((r) => r.model.body === 'track').length;
  if (trackAdapters) addLine({ key: 'trackadapter', name: 'Track-spot to pipe-clamp adapter / 1 m track section + live end', qty: trackAdapters, unit: 'ea', cat: 'Rigging & stands', price: [4, 10] });
  const dmxRows = rows.filter((r) => r.dmxCh > 0);
  const rigIds = new Set(dmxRows.map((r) => r.rig?.id || r.id));
  const dmxSections = new Set(dmxRows.map((r) => r.section));
  if (dmxRows.length) {
    addLine({ key: 'dmxrun', name: 'DMX 3-pin cable 25′ (receiver to stands within a section)', qty: rigIds.size, unit: 'ea', cat: 'Power & data', price: [6, 12] });
    addLine({ key: 'wdmx-rx', name: 'Wireless DMX receiver (2.4 GHz, XLR) — one per section, then wired', qty: dmxSections.size, unit: 'ea', cat: 'Power & data', price: [15, 30], ali: 'wireless DMX512 receiver transmitter 2.4G XLR' });
    addLine({ key: 'wdmx-tx', name: 'Wireless DMX transmitter + USB-DMX interface (or DMX-192 console)', qty: 1, unit: 'set', cat: 'Power & data', price: [45, 110], ali: 'USB DMX interface + wireless DMX transmitter' });
    addLine({ key: 'dmxjump', name: 'DMX 3-pin jumper 1.5 m (fixture-to-fixture on a stand)', qty: Math.max(0, dmxRows.length - rigIds.size) + rigIds.size, unit: 'ea', cat: 'Power & data', price: [3, 6] });
  }
  const circuits = new Set(rows.map((r) => r.circuit));
  addLine({ key: 'ext', name: '25′ 14 AWG grounded extension cord (one per stand / floor cluster)', qty: new Set(rows.map((r) => r.rig?.id || `${r.section}-${p.items.find((i) => i.id === r.id)?.params.mount}`)).size, unit: 'ea', cat: 'Power & data', price: [12, 22] });
  addLine({ key: 'strip', name: 'Heavy-duty power strip with breaker (one per circuit)', qty: circuits.size, unit: 'ea', cat: 'Power & data', price: [12, 25] });
  addLine({ key: 'cablemat', name: 'Cable ramp / gaffer-taped cable runs across walkways', qty: Math.ceil(rigIds.size / 2), unit: 'ea', cat: 'Power & data', price: [15, 35], note: 'Or run power along walls/drape lines so nothing crosses the visitor path.' });

  const lines = [...map.values()].map((l) => {
    const owned = l.owned ?? 0;
    const toBuy = l.cat === 'Build (by team)' ? 0 : Math.max(0, l.qty - owned);
    return { ...l, owned, toBuy };
  });
  const byCat: BomResult['byCat'] = {};
  let lo = 0, hi = 0;
  for (const l of lines) {
    (byCat[l.cat] ||= []).push(l);
    if (l.price && l.toBuy) {
      lo += l.price[0] * l.toBuy;
      hi += l.price[1] * l.toBuy;
    }
  }
  return { lines, byCat, cost: [Math.round(lo), Math.round(hi)], fixtureUse };
}

export function rigLoads(p: Project) {
  const rows = fixtureRows(p);
  const rigs = p.items.filter((i) => !i.hidden && (i.type === 'tbar' || i.type === 'crank' || i.type === 'pipebar' || (i.type === 'drape' && i.params?.lightPipe)));
  return rigs.map((r) => {
    const fx = rows.filter((f) => f.rig?.id === r.id);
    const lb = fx.reduce((a, f) => a + f.model.weightLb + (r.type === 'drape' ? 2.2 : 0.6), 0);
    // drape light pipe: ~30 lb per 8′ bay on 2″ heavy-duty uprights with 35 lb bases + sandbags
    const cap = r.type === 'tbar' ? 66 : r.type === 'crank' ? 176 : r.type === 'drape' ? 30 * drapeCounts(r).bays : 40;
    return { rig: r, fixtures: fx, lb, cap, ok: lb <= cap * 0.8, watts: fx.reduce((a, f) => a + f.wattsMax, 0) };
  });
}

export function aliLink(q: string) {
  return `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(q)}`;
}

export function bomCSV(b: BomResult) {
  const rows = [['Category', 'Item', 'Qty needed', 'Owned', 'To buy', 'Unit', 'Unit price low', 'Unit price high', 'AliExpress search']];
  for (const l of b.lines) rows.push([l.cat, l.name, String(l.qty), String(l.owned), String(l.toBuy), l.unit, l.price ? String(l.price[0]) : '', l.price ? String(l.price[1]) : '', l.ali ? aliLink(l.ali) : '']);
  return rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
}
