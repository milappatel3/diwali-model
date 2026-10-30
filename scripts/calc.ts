import { defaultProject } from '../lib/project';
import { buildScene, computeAll, evalProbe } from '../lib/engine';
import type { Project } from '../lib/types';

// 1) unit check: one RGBW par, white only, at 3 m and 5 m (no derate, no house, no bounce)
function unit(model: string, ch: Record<string, number>, dist: number) {
  const p: Project = { ...defaultProject() };
  p.items = [{ id: 'f', type: 'fixture', name: 'test', section: 'infra', x: 60, y: 20, rot: 0, params: { model, mount: 'clamp', h: 5.25, aim: { x: 60, y: 20 + dist / 0.3048, z: 5.25 }, ch } }];
  p.house.enabled = false; p.settings.bounce = false; p.settings.derate = 1; p.probes = [];
  const sc = buildScene(p);
  const r = evalProbe(sc, [0], { id: 'x', name: 'x', x: 60, y: 20 + dist / 0.3048, facing: 270 });
  return r.face;
}
console.log('RGBW W-only @3m', unit('rgbwPar200', { w: 1 }, 3).toFixed(0), ' (design 865)');
console.log('RGBW W-only @5m', unit('rgbwPar200', { w: 1 }, 5).toFixed(0), ' (design 311)');
console.log('RGBW full  @3m', unit('rgbwPar200', { r: 1, g: 1, b: 1, w: 1 }, 3).toFixed(0), ' (design 1680)');
console.log('COB both @3m', unit('cobPar100', { ww: 1, cw: 1 }, 3).toFixed(0), ' (design 578)');
console.log('Gallery30 @3m', unit('gallery30', { ww: 1 }, 3).toFixed(0), ' (design 838)');
console.log('Leko200 @5m', unit('leko200', { ww: 1 }, 5).toFixed(0), ' (design ~2400)');
console.log('Art framing @3m', unit('artFraming20', { ww: 1, cw: 1 }, 3).toFixed(0), ' (design 620)');

const proj = defaultProject();
const sc = buildScene(proj);
const t = Date.now();
const res = computeAll(sc);
console.log(`\nfull calc: ${res.ms} ms, ${res.srcCount} sources, ${sc.occ.length} occluders, grid ${res.grid.nx}x${res.grid.ny}`);
console.log('zone indirect lux:', res.zones.map((z, i) => `${z.name}: ${res.zoneInd[i].toFixed(1)}`).join(' | '));
console.log('\nSURFACES');
for (const s of res.surfaces) console.log(`${s.verdict.padEnd(7)} ${s.avg.toFixed(0).padStart(5)} lx (min ${s.min.toFixed(0)}, max ${s.max.toFixed(0)}) cri ${s.cri.toFixed(0)} ${s.cct.toFixed(0)}K  target ${s.target.join('-')}  ${s.name}   <- ${s.top.slice(0,2).map(t=>t.name+':'+t.lux.toFixed(0)).join(', ')}`);
console.log('\nPROBES');
for (const p of res.probes) console.log(`${p.verdict.padEnd(6)} face ${p.face.toFixed(0).padStart(4)} cyl ${p.cyl.toFixed(0).padStart(4)} top ${p.top.toFixed(0)} ISO ${p.iso.toFixed(0)} CRI ${p.cri.toFixed(0)} ${p.cct.toFixed(0)}K elev ${p.elev.toFixed(0)}  ${p.name}\n        ${p.issues.join(' | ')}\n        ${p.contrib.slice(0,3).map(c=>c.name+':'+c.lux.toFixed(0)).join(', ')}`);
// floor stats
let s = 0, c = 0; for (let k = 0; k < res.grid.floor.length; k++) if (res.grid.mask[k] === 1) { s += res.grid.floor[k]; c++; }
console.log('\nmean floor lux (audience floor):', (s / c).toFixed(0));
