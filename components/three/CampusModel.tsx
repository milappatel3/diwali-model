'use client';
// The whole Milpitas campus as it will look on Diwali day: building shell, site, exhibition and festival dressing.
// Everything is merged per material or instanced; there are no real lights or shadows, so it stays fast to iterate on.
import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useStore } from '@/lib/store';
import { HALL, ROOM_POLY } from '@/lib/hall';
import { ENTRANCE, MAJOR_ROOM, TALL_ZONES, inTall, type CampusData, type PolyJ } from '@/lib/campus';
import { mats, W, FTm } from './materials';
import { rangoliTex } from './textures';
import { Items3D } from './Items3D';
import { useCE, normRect, type Added } from '@/lib/campusEdits';
import { extrude, flat, boxes, boxAt, merge, rng, inPolyJ, swag } from './campusGeo';

export interface CampusOpts {
  roof: 'on' | 'open' | 'off';
  dusk: boolean;
  labels: boolean;
  people: boolean;
  cars: boolean;
  dressing: boolean;
  zones: boolean;
  exhibit: boolean;
}

export const std = (c: string, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...o });

function Mesh({ geo, mat, ...rest }: { geo: THREE.BufferGeometry | null; mat: THREE.Material } & Record<string, any>) {
  useEffect(() => () => geo?.dispose(), [geo]);
  if (!geo) return null;
  return <mesh geometry={geo} material={mat} {...rest} />;
}

export function Inst({ geo, mat, n, fill, colored, deps }: { geo: THREE.BufferGeometry; mat: THREE.Material; n: number; fill: (i: number, d: THREE.Object3D, c: THREE.Color) => void; colored?: boolean; deps: any[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const d = new THREE.Object3D();
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      d.position.set(0, 0, 0);
      d.rotation.set(0, 0, 0);
      d.scale.set(1, 1, 1);
      c.set('#ffffff');
      fill(i, d, c);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      if (colored) m.setColorAt(i, c);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, ...deps]);
  if (n <= 0) return null;
  return <instancedMesh key={n} ref={ref} args={[geo, mat, n]} frustumCulled={false} />;
}

export function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* ───────────────────────────── building ───────────────────────────── */
export function CampusShell({ data, opts }: { data: CampusData; opts: CampusOpts }) {
  const settings = useStore((s) => s.project.settings);
  const C = settings.ceilingFt;
  const stageFt = settings.stageHeightFt;
  const wallH = useCE((s) => s.e.wallH);
  const H_EXT = 16, H_INT = 12, H_OOP = 16;
  const hOf = (g?: string) => (g === 'tall' ? C : g === 'int' ? H_INT : g === 'oop' ? H_OOP : H_EXT);

  const M = useMemo(
    () => ({
      ext: std('#d6c3a2'),
      tall: std('#d9c7a6'),
      int: std('#ebe4d6'),
      ghost: std('#c8d4e0', { transparent: true, opacity: 0.22, depthWrite: false }),
      roof: std('#8a786a', { side: THREE.DoubleSide }),
      hallRoof: std('#9a8872', { side: THREE.DoubleSide }),
      slab: std('#a39d94', { roughness: 0.95 }),
      tile: std('#c9bfae', { roughness: 0.35 }),
      marble: std('#e8e0d2', { roughness: 0.3 }),
      door: std('#6b4a2f', { roughness: 0.55 }),
      trim: std('#b7a07a'),
      glass: new THREE.MeshStandardMaterial({ color: '#a9cbd6', roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.5, emissive: new THREE.Color('#ffd9a0'), emissiveIntensity: 0, depthWrite: false }),
      stage: std('#4a352a', { roughness: 0.7 }),
    }),
    [],
  );
  const R = useMemo(() => mats(), []);
  useEffect(() => {
    M.glass.emissiveIntensity = opts.dusk ? 0.9 : 0;
  }, [opts.dusk, M]);

  const g = useMemo(() => {
    const by = (grp: string) => data.walls.filter((w) => w.g === grp);
    const poly = (o: number[][]): PolyJ => ({ o, h: [] });
    const lintel = data.doors
      .filter((d) => d.t === 'open')
      .map((d: any) => {
        const mx = (d.a[0] + d.b[0]) / 2, my = (d.a[1] + d.b[1]) / 2;
        const top = inTall(mx, my) ? C : d.x ? H_EXT : H_INT;
        return [d.a[0], d.a[1], d.b[0], d.b[1], top] as number[];
      });
    const lintelGeos = lintel.map(([x0, y0, x1, y1, top]) => boxes([[x0, y0, x1, y1]], 0.8, 8, top)!).filter(Boolean);
    const spandrel = data.glass.map(([x0, y0, x1, y1]) => {
      const top = inTall((x0 + x1) / 2, (y0 + y1) / 2) ? C : H_EXT;
      return boxes([[x0, y0, x1, y1]], 0.6, 9, top)!;
    });
    const leaves = data.doors.filter((d) => d.t === 'leaf').map((d: any) => poly(d.r));
    const hallRect = poly([[-1, -1], [162, -1], [162, 96.5], [-1, 96.5]]);
    const tallRects = TALL_ZONES.slice(1).map((r) => poly([[r[0], r[2]], [r[1], r[2]], [r[1], r[3]], [r[0], r[3]]]));
    return {
      ext: extrude(by('ext'), (p) => wallH['w' + p._i] ?? H_EXT),
      tall: extrude(by('tall'), (p) => wallH['w' + p._i] ?? C),
      int: extrude(by('int'), (p) => wallH['w' + p._i] ?? H_INT),
      oop: extrude(by('oop'), (p) => wallH['w' + p._i] ?? H_OOP),
      ghostFloor: data.notInPlan ? flat([data.notInPlan], 0.1) : null,
      lintel: merge(lintelGeos),
      spandrel: merge(spandrel),
      glass: boxes(data.glass, 0.25, 0, 9),
      doors: extrude(leaves, 7),
      slab: flat([poly(data.footprint.o)], 0.06),
      foyer: flat([poly([[-60, -24], [-6, -24], [-6, 196], [-60, 196]])], 0.09),
      carpet: flat([poly(ROOM_POLY.map((p) => [p.x, p.y]))], 0.1),
      mandir: flat([tallRects[1]], 0.09),
      mahila: flat([tallRects[0]], 0.09),
      roofLow: extrude(data.roofs.noHall, 0.8, H_EXT),
      roofOop: data.roofs.oop ? extrude([data.roofs.oop], 0.8, H_OOP) : null,
      roofHall: extrude([hallRect], 0.9, C),
      roofTall: extrude(tallRects, 0.9, C),
      // low parapet/cornice so the roof edge reads
      cornice: null as THREE.BufferGeometry | null,
    };
  }, [data, C, wallH]);

  return (
    <group>
      <Mesh geo={g.slab} mat={M.slab} />
      <Mesh geo={g.foyer} mat={M.tile} />
      <Mesh geo={g.mandir} mat={M.marble} />
      <Mesh geo={g.mahila} mat={R.carpet} />
      <Mesh geo={g.carpet} mat={R.carpet} />
      <Mesh geo={g.ext} mat={M.ext} />
      <Mesh geo={g.tall} mat={M.tall} />
      <Mesh geo={g.int} mat={M.int} />
      <Mesh geo={g.lintel} mat={M.trim} />
      <Mesh geo={g.spandrel} mat={M.ext} />
      <Mesh geo={g.glass} mat={M.glass} renderOrder={2} />
      <Mesh geo={g.doors} mat={M.door} />
      <Mesh geo={g.oop} mat={M.ghost} renderOrder={1} />
      <Mesh geo={g.ghostFloor} mat={M.ghost} renderOrder={1} />
      {opts.roof !== 'off' && (
        <>
          <Mesh geo={g.roofLow} mat={M.roof} />
          <Mesh geo={g.roofTall} mat={M.hallRoof} />
          <Mesh geo={g.roofOop} mat={M.ghost} renderOrder={1} />
          {opts.roof === 'on' && <Mesh geo={g.roofHall} mat={M.hallRoof} />}
        </>
      )}
      {/* stage deck + steps in the Assembly Hall */}
      <mesh position={W((HALL.stage.x0 + HALL.stage.x1) / 2, (HALL.stage.y0 + HALL.stage.y1) / 2, stageFt / 2)}>
        <boxGeometry args={[(HALL.stage.x1 - HALL.stage.x0) * FTm, stageFt * FTm, (HALL.stage.y1 - HALL.stage.y0) * FTm]} />
        <primitive object={M.stage} attach="material" />
      </mesh>
    </group>
  );
}

/* ───────────────────────────── exhibition ───────────────────────────── */
export function Exhibition() {
  const project = useStore((s) => s.project);
  const { scene } = useThree();
  const ev = useMemo(() => ({ onSelect: () => {}, onHover: () => {} }), []);
  // Exhibit materials are authored in physical units (emissive in the thousands). In this plain-lit view that would blow
  // out, so clamp them while this view is mounted and restore the shared singletons on the way out.
  useEffect(() => {
    const saved = new Map<THREE.Material, number>();
    const pass = () =>
      scene.traverse((o: any) => {
        const ms: any[] = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        for (const m of ms) if (m.emissiveIntensity > 4 && !saved.has(m)) { saved.set(m, m.emissiveIntensity); m.emissiveIntensity = m.emissiveMap ? 1 : 2; }
      });
    pass();
    const t = setTimeout(pass, 400);
    return () => {
      clearTimeout(t);
      saved.forEach((v, m) => ((m as any).emissiveIntensity = v));
    };
  }, [scene, project.items]);
  return <Items3D project={project} ev={ev} selected={null} />;
}

/* ───────────────────────────── site ───────────────────────────── */
export function CampusSite({ data, opts }: { data: CampusData; opts: CampusOpts }) {
  const s = data.site;
  const M = useMemo(
    () => ({
      grass: std('#6f8a4c'),
      ground: std('#7d8a62'),
      asphalt: std('#3b3d41', { roughness: 1 }),
      curb: std('#b9b5ae'),
      walk: std('#cfc8bb'),
      paint: std('#f1efe8', { roughness: 0.8 }),
      fence: std('#2b2b2e', { metalness: 0.5, roughness: 0.5 }),
      conc: std('#a8a39a'),
      ada: std('#2b6fd0'),
      hydrant: std('#c72b2b'),
    }),
    [],
  );
  const g = useMemo(() => {
    const poly = (o: number[][]): PolyJ => ({ o, h: [] });
    return {
      asphalt: flat([poly(s.hull)], 0.02),
      planters: extrude(s.planters, 0.5),
      walks: extrude(s.walks, 0.35),
      stalls: boxes(s.stalls, 0.3, 0.03, 0.05),
      curbs: boxes(s.curbs, 0.5, 0, 0.5),
      conc: boxes(s.conc, 0.4, 0, 0.12),
      fences: boxes(s.fences, 0.15, 0, 6),
      rails: boxes(s.rails, 0.15, 0, 3.2),
      ada: merge(s.ada.map(([x, y, a]) => boxAt(x, y, 0.06, 4, 4, 0.03, a))),
    };
  }, [s]);
  const hp = useMemo(() => new THREE.CylinderGeometry(0.35 * FTm, 0.45 * FTm, 2.4 * FTm, 8), []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-100 * FTm, -0.05, -150 * FTm]}>
        <planeGeometry args={[4000 * FTm, 4000 * FTm]} />
        <primitive object={M.ground} attach="material" />
      </mesh>
      <Mesh geo={g.asphalt} mat={M.asphalt} />
      <Mesh geo={g.conc} mat={M.conc} />
      <Mesh geo={g.planters} mat={M.grass} />
      <Mesh geo={g.walks} mat={M.walk} />
      <Mesh geo={g.stalls} mat={M.paint} />
      <Mesh geo={g.ada} mat={M.ada} />
      <Mesh geo={g.curbs} mat={M.curb} />
      <Mesh geo={g.fences} mat={M.fence} />
      <Mesh geo={g.rails} mat={M.fence} />
      <Inst geo={hp} mat={M.hydrant} n={s.hydrants.length} deps={[s]} fill={(i, d) => d.position.copy(new THREE.Vector3(s.hydrants[i][0] * FTm, 1.2 * FTm, -s.hydrants[i][1] * FTm))} />
      <Trees data={data} />
      <Poles data={data} dusk={opts.dusk} />
      {opts.cars && <Cars data={data} />}
    </group>
  );
}

function Trees({ data }: { data: CampusData }) {
  const t = data.site.trees;
  const trunk = useMemo(() => new THREE.CylinderGeometry(0.5 * FTm, 0.8 * FTm, 8 * FTm, 6).translate(0, 4 * FTm, 0), []);
  const crown = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const mt = useMemo(() => std('#5b4430'), []);
  const mc = useMemo(() => std('#3f7a3a', { flatShading: true }), []);
  const r = useMemo(() => rng(7), []);
  const sz = useMemo(() => t.map(() => 0.8 + r() * 0.7), [t, r]);
  const at = (i: number) => new THREE.Vector3(t[i][0] * FTm, 0.5 * FTm, -t[i][1] * FTm);
  return (
    <>
      <Inst geo={trunk} mat={mt} n={t.length} deps={[t]} fill={(i, d) => { d.position.copy(at(i)); d.scale.setScalar(sz[i]); }} />
      <Inst geo={crown} mat={mc} n={t.length} colored deps={[t]} fill={(i, d, c) => { d.position.copy(at(i)); d.position.y += 13 * sz[i] * FTm; d.scale.set(6.5 * sz[i] * FTm, 6 * sz[i] * FTm, 6.5 * sz[i] * FTm); c.setHSL(0.27 + ((i * 37) % 10) / 120, 0.4, 0.3 + ((i * 53) % 10) / 100); }} />
    </>
  );
}

function Poles({ data, dusk }: { data: CampusData; dusk: boolean }) {
  const p = data.site.poles;
  const shaft = useMemo(() => new THREE.CylinderGeometry(0.3 * FTm, 0.45 * FTm, 24 * FTm, 8).translate(0, 12 * FTm, 0), []);
  const head = useMemo(() => new THREE.BoxGeometry(5 * FTm, 0.5 * FTm, 1.4 * FTm).translate(0, 24.4 * FTm, 0), []);
  const ms = useMemo(() => std('#3a3d44', { metalness: 0.6, roughness: 0.5 }), []);
  const ml = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fff3d0', emissive: new THREE.Color('#ffd89a'), emissiveIntensity: 0 }), []);
  useEffect(() => { ml.emissiveIntensity = dusk ? 3 : 0.1; }, [dusk, ml]);
  const f = (i: number, d: THREE.Object3D) => d.position.set(p[i][0] * FTm, 0, -p[i][1] * FTm);
  return (
    <>
      <Inst geo={shaft} mat={ms} n={p.length} deps={[p]} fill={f} />
      <Inst geo={head} mat={ml} n={p.length} deps={[p]} fill={f} />
    </>
  );
}

const CAR_COLORS = ['#e9e9ea', '#1d1f24', '#9aa0a6', '#b21f2d', '#2a4a7a', '#c9c9cc', '#0e0e10', '#6b7078', '#d9d3c4', '#2f5d3a'];
function Cars({ data }: { data: CampusData }) {
  const zones = useCE((s) => s.e.zones);
  const slots = useMemo(() => {
    const r = rng(11);
    return data.site.slots.filter((sl) => {
      const k = r() < 0.72;
      const inR = (z: number[]) => sl[0] > z[0] && sl[0] < z[1] && sl[1] > z[2] && sl[1] < z[3];
      // keep the drive-through pick-up lane, food court and KDC clear of parked cars
      return k && !zones.some((z) => (/^(pick|lane\d|walk)$/.test(z.id) ? inR([z.r[0], z.r[1], z.r[2] - 28, z.r[3] + 4]) : z.tents && inR(z.r)));
    });
  }, [data, zones]);
  const body = useMemo(() => new THREE.BoxGeometry(15 * FTm, 2.2 * FTm, 6 * FTm).translate(0, 1.7 * FTm, 0), []);
  const cabin = useMemo(() => new THREE.BoxGeometry(8 * FTm, 1.6 * FTm, 5.4 * FTm).translate(-0.5 * FTm, 3.6 * FTm, 0), []);
  const mb = useMemo(() => std('#ffffff', { roughness: 0.35, metalness: 0.35 }), []);
  const mg = useMemo(() => std('#20262c', { roughness: 0.2 }), []);
  const f = (i: number, d: THREE.Object3D, c?: THREE.Color) => {
    const [x, y, a] = slots[i];
    d.position.set(x * FTm, 0, -y * FTm);
    // alternate which way the car noses in
    d.rotation.y = (a * Math.PI) / 180 + (i % 3 === 0 ? Math.PI : 0);
    c?.set(CAR_COLORS[(i * 7 + (i >> 2)) % CAR_COLORS.length]);
  };
  return (
    <>
      <Inst geo={body} mat={mb} n={slots.length} colored deps={[slots]} fill={f} />
      <Inst geo={cabin} mat={mg} n={slots.length} deps={[slots]} fill={f} />
    </>
  );
}

/* ───────────────────────────── people ───────────────────────────── */
export function Crowd({ data }: { data: CampusData }) {
  const pts = useMemo(() => {
    const r = rng(23);
    const out: { x: number; y: number; c: number; h: number; ang: number }[] = [];
    const tryIn = (n: number, sample: () => [number, number], ok: (x: number, y: number) => boolean) => {
      let k = 0, guard = 0;
      while (k < n && guard++ < n * 40) {
        const [x, y] = sample();
        if (ok(x, y)) { out.push({ x, y, c: Math.floor(r() * 8), h: 0.9 + r() * 0.2, ang: r() * 6.28 }); k++; }
      }
    };
    // entrance plaza & forecourt
    tryIn(26, () => [-62 + r() * 56, -46 + r() * 20], () => true);
    // foyer
    tryIn(48, () => [-58 + r() * 50, -20 + r() * 210], () => true);
    // sidewalks
    const walks = data.site.walks.filter((w) => w.o.length > 3);
    for (const w of walks.slice(0, 12)) {
      const xs = w.o.map((p) => p[0]), ys = w.o.map((p) => p[1]);
      const [a, b, c, d] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      tryIn(4, () => [a + r() * (b - a), c + r() * (d - c)], (x, y) => inPolyJ(x, y, w));
    }
    return out;
  }, [data]);
  const body = useMemo(() => new THREE.CylinderGeometry(0.55 * FTm, 0.75 * FTm, 3.6 * FTm, 8).translate(0, 2.5 * FTm, 0), []);
  const head = useMemo(() => new THREE.SphereGeometry(0.36 * FTm, 10, 8).translate(0, 4.7 * FTm, 0), []);
  const mb = useMemo(() => std('#ffffff', { roughness: 0.85 }), []);
  const mh = useMemo(() => std('#ffffff', { roughness: 0.6 }), []);
  const CL = ['#b03a2e', '#e08a1e', '#1f6f8b', '#f0e4c8', '#c2185b', '#2e7d32', '#6a1b9a', '#d9a21b'];
  const SK = ['#8d5a3b', '#a8714a', '#6b4128', '#c28a60'];
  const f = (i: number, d: THREE.Object3D, c?: THREE.Color) => {
    const p = pts[i];
    d.position.set(p.x * FTm, 0.06 * FTm, -p.y * FTm);
    d.scale.setScalar(p.h);
    d.rotation.y = p.ang;
    c?.set(CL[p.c]);
  };
  return (
    <>
      <Inst geo={body} mat={mb} n={pts.length} colored deps={[pts]} fill={f} />
      <Inst geo={head} mat={mh} n={pts.length} colored deps={[pts]} fill={(i, d, c) => { f(i, d); c.set(SK[(i * 3) % 4]); }} />
    </>
  );
}

/* ───────────────────────────── Diwali dressing ───────────────────────────── */
export function Dressing({ data, dusk }: { data: CampusData; dusk: boolean }) {
  const ex = ENTRANCE.x;
  const yF = ENTRANCE.y; // facade line
  const half = ENTRANCE.span / 2;
  const glow = dusk ? 3.2 : 0.35;

  const M = useMemo(
    () => ({
      marigold: std('#f28c0f', { emissive: new THREE.Color('#e8780a'), emissiveIntensity: 0.2 }),
      maroon: std('#7d1d24'),
      gold: std('#d4a63a', { metalness: 0.7, roughness: 0.35 }),
      cream: std('#f0e2c0'),
      bulb: new THREE.MeshStandardMaterial({ color: '#fff0c8', emissive: new THREE.Color('#ffc766'), emissiveIntensity: 1 }),
      flame: new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: new THREE.Color('#ff9d1e'), emissiveIntensity: 1 }),
      clay: std('#a2522a'),
      lantern: new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: new THREE.Color('#ff8a00'), emissiveIntensity: 1, roughness: 0.6 }),
      bunting: new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide, roughness: 0.8 }),
      plaza: std('#d9cfbd'),
      pad: std('#ffffff', { transparent: true, side: THREE.DoubleSide, depthWrite: false }),
    }),
    [],
  );
  useEffect(() => {
    M.bulb.emissiveIntensity = glow;
    M.flame.emissiveIntensity = glow * 1.2;
    M.lantern.emissiveIntensity = glow * 0.9;
  }, [glow, M]);

  const signTex = useMemo(
    () =>
      canvasTex(1024, 256, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, w, 0);
        gr.addColorStop(0, '#6e1620'); gr.addColorStop(0.5, '#8a1d28'); gr.addColorStop(1, '#6e1620');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#e3b84c'; g.lineWidth = 8; g.strokeRect(14, 14, w - 28, h - 28);
        g.fillStyle = '#f6d98a'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = '700 96px Georgia, serif'; g.fillText('Diwali Exhibition 2026', w / 2, h * 0.42);
        g.font = '500 40px Georgia, serif'; g.fillStyle = '#ffe9b8'; g.fillText('Assembly Hall  ·  Welcome', w / 2, h * 0.76);
      }),
    [],
  );
  const wayTex = useMemo(
    () =>
      canvasTex(512, 256, (g, w, h) => {
        g.fillStyle = '#7d1d24'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#e3b84c'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20);
        g.fillStyle = '#f6d98a'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = '700 54px Georgia, serif'; g.fillText('Diwali Exhibition', w / 2, h * 0.38);
        g.font = '600 44px Georgia, serif'; g.fillText('Entrance  ➜', w / 2, h * 0.7);
      }),
    [],
  );

  const sphere = useMemo(() => new THREE.SphereGeometry(0.34 * FTm, 8, 6), []);
  const bulbG = useMemo(() => new THREE.SphereGeometry(0.2 * FTm, 6, 5), []);
  const flameG = useMemo(() => new THREE.SphereGeometry(0.22 * FTm, 6, 5).scale(1, 1.5, 1).translate(0, 0.45 * FTm, 0), []);
  const dishG = useMemo(() => new THREE.CylinderGeometry(0.5 * FTm, 0.3 * FTm, 0.25 * FTm, 10).translate(0, 0.13 * FTm, 0), []);
  const flagG = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.55, 0, 0, 0.55, 0, 0, 0, -1.3, 0].map((v) => v * FTm), 3));
    g.computeVertexNormals();
    return g;
  }, []);
  const lanternG = useMemo(() => new THREE.OctahedronGeometry(1 * FTm, 0).scale(0.8, 1.4, 0.8), []);

  /* strands */
  const strands = useMemo(() => {
    type P = [number, number, number];
    const gar: P[] = [], lights: P[] = [], flags: { p: P; a: number }[] = [];
    const zC = 12.2, yC = yF - 9;
    const cx0 = ex - half, cx1 = ex + half;
    // marigold garlands along canopy front, swag by swag
    const nC = 8;
    for (let i = 0; i < nC; i++) {
      const a: P = [cx0 + (i * (cx1 - cx0)) / nC, yC, zC], b: P = [cx0 + ((i + 1) * (cx1 - cx0)) / nC, yC, zC];
      gar.push(...swag(a, b, 1.6, 12));
    }
    // vertical marigold strands
    for (let i = 0; i <= 24; i++) {
      const x = cx0 + (i * (cx1 - cx0)) / 24;
      for (let k = 0; k < 7; k++) gar.push([x, yC, zC - 0.8 - k * 0.45]);
    }
    // string lights across the plaza and back to the facade
    lights.push(...swag([cx0, yC, zC + 0.6], [ex - 10, yF - 6, 15.5], 1.2, 10));
    lights.push(...swag([cx1, yC, zC + 0.6], [ex + 10, yF - 6, 15.5], 1.2, 10));
    lights.push(...swag([ex - 12, yC - 12, 14], [ex + 12, yC - 12, 14], 2.5, 18));
    lights.push(...swag([cx0, yC, 15], [cx0 - 20, yC - 25, 18], 3, 14));
    lights.push(...swag([cx1, yC, 15], [cx1 + 20, yC - 25, 18], 3, 14));
    // bunting on three lines
    const lines: [P, P, number][] = [
      [[cx0, yC, zC + 1], [ex - 10, yC - 12, 14], 1.5],
      [[cx1, yC, zC + 1], [ex + 10, yC - 12, 14], 1.5],
      [[ex - 10, yC - 12, 14], [ex + 10, yC - 12, 14], 2],
    ];
    for (const [a, b, s] of lines) {
      const pts = swag(a, b, s, 16);
      pts.forEach((p, i) => i % 1 === 0 && flags.push({ p, a: Math.atan2(b[1] - a[1], b[0] - a[0]) }));
    }
    // pole-to-pole festival strings across the car park
    const poles = data.site.poles;
    for (let i = 0; i < poles.length; i++)
      for (let j = i + 1; j < poles.length; j++) {
        const d = Math.hypot(poles[i][0] - poles[j][0], poles[i][1] - poles[j][1]);
        if (d > 25 && d < 75) lights.push(...swag([poles[i][0], poles[i][1], 21], [poles[j][0], poles[j][1], 21], 2.2, Math.ceil(d / 3)));
      }
    return { gar, lights, flags };
  }, [data, ex, half, yF]);

  const diyas = useMemo(() => {
    const out: [number, number][] = [];
    for (let x = ex - half + 1; x <= ex + half - 1; x += 2.6) { out.push([x, yF - 11.5]); }
    for (let y = yF - 12; y > yF - 44; y -= 3) { out.push([ex - 7, y]); out.push([ex + 7, y]); }
    return out;
  }, [ex, half, yF]);

  const lanterns = useMemo(() => [-14, -5, 5, 14].map((dx) => [ex + dx, yF - 10.2, 10.3 - Math.abs(dx) * 0.05] as [number, number, number]), [ex, yF]);

  const colr = (i: number, c: THREE.Color) => c.set(['#f28c0f', '#ffb81c', '#e8620a', '#ffc94a'][i % 4]);
  const bunt = ['#e8620a', '#8a1d28', '#ffb81c', '#1f7a6e', '#c2185b'];

  return (
    <group>
      {/* paved forecourt so the rangoli reads on a clean floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={W(ex, yF - 21, 0.12)}>
        <planeGeometry args={[ENTRANCE.span * FTm, 40 * FTm]} />
        <primitive object={M.plaza} attach="material" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={W(ex, yF - 24, 0.16)} renderOrder={3}>
        <planeGeometry args={[22 * FTm, 22 * FTm]} />
        <meshBasicMaterial map={rangoliTex()} transparent depthWrite={false} toneMapped={false} />
      </mesh>

      {/* entrance canopy on four columns */}
      <mesh position={W(ex, yF - 4.5, 11.8)}>
        <boxGeometry args={[(ENTRANCE.span + 2) * FTm, 0.9 * FTm, 9.5 * FTm]} />
        <primitive object={M.cream} attach="material" />
      </mesh>
      <mesh position={W(ex, yF - 9.1, 11.3)}>
        <boxGeometry args={[(ENTRANCE.span + 2) * FTm, 1.8 * FTm, 0.5 * FTm]} />
        <primitive object={M.maroon} attach="material" />
      </mesh>
      {[-1, -0.34, 0.34, 1].map((k, i) => (
        <mesh key={i} position={W(ex + k * (half - 1), yF - 8.4, 5.6)}>
          <boxGeometry args={[1.2 * FTm, 11.2 * FTm, 1.2 * FTm]} />
          <primitive object={M.cream} attach="material" />
        </mesh>
      ))}

      {/* torana gateway over the central doors */}
      {[-1, 1].map((k) => (
        <group key={k}>
          <mesh position={W(ex + k * 10, yF - 15, 6.5)}>
            <boxGeometry args={[1.3 * FTm, 13 * FTm, 1.3 * FTm]} />
            <primitive object={M.marigold} attach="material" />
          </mesh>
          <mesh position={W(ex + k * 10, yF - 15, 13.3)}>
            <boxGeometry args={[1.9 * FTm, 0.7 * FTm, 1.9 * FTm]} />
            <primitive object={M.gold} attach="material" />
          </mesh>
        </group>
      ))}
      <mesh position={W(ex, yF - 15, 14.4)}>
        <boxGeometry args={[22.6 * FTm, 1.6 * FTm, 1.5 * FTm]} />
        <primitive object={M.maroon} attach="material" />
      </mesh>
      <mesh position={W(ex, yF - 15, 18.2)}>
        <planeGeometry args={[16 * FTm, 4 * FTm]} />
        <meshBasicMaterial map={signTex} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={W(ex, yF - 15, 20.9)}>
        <coneGeometry args={[0.9 * FTm, 1.8 * FTm, 6]} />
        <primitive object={M.gold} attach="material" />
      </mesh>

      {/* garlands, string lights, bunting */}
      <Inst geo={sphere} mat={M.marigold} n={strands.gar.length} colored deps={[strands]} fill={(i, d, c) => { const p = strands.gar[i]; d.position.copy(W(p[0], p[1], p[2])); colr(i, c); }} />
      <Inst geo={bulbG} mat={M.bulb} n={strands.lights.length} deps={[strands]} fill={(i, d) => d.position.copy(W(strands.lights[i].slice(0, 3)[0], strands.lights[i][1], strands.lights[i][2]))} />
      <Inst geo={flagG} mat={M.bunting} n={strands.flags.length} colored deps={[strands]} fill={(i, d, c) => { const f = strands.flags[i]; d.position.copy(W(f.p[0], f.p[1], f.p[2])); d.rotation.y = -f.a; c.set(bunt[i % bunt.length]); }} />

      {/* diyas along the threshold and path */}
      <Inst geo={dishG} mat={M.clay} n={diyas.length} deps={[diyas]} fill={(i, d) => d.position.copy(W(diyas[i][0], diyas[i][1], 0.14))} />
      <Inst geo={flameG} mat={M.flame} n={diyas.length} deps={[diyas]} fill={(i, d) => d.position.copy(W(diyas[i][0], diyas[i][1], 0.4))} />

      {/* hanging aakash kandil lanterns under the canopy */}
      <Inst geo={lanternG} mat={M.lantern} n={lanterns.length} deps={[lanterns]} fill={(i, d) => d.position.copy(W(lanterns[i][0], lanterns[i][1], lanterns[i][2]))} />

      {/* wayfinding standees at the car park side */}
      {[ex - half - 6, ex + half + 6].map((x, i) => (
        <group key={i} position={W(x, yF - 26, 0)} rotation={[0, i ? 0.35 : -0.35, 0]}>
          <mesh position={[0, 3.2 * FTm, 0]}>
            <boxGeometry args={[0.35 * FTm, 6.4 * FTm, 0.35 * FTm]} />
            <primitive object={M.gold} attach="material" />
          </mesh>
          <mesh position={[0, 6.1 * FTm, 0.25 * FTm]}>
            <planeGeometry args={[5 * FTm, 2.5 * FTm]} />
            <meshBasicMaterial map={wayTex} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ───────────────────────────── labels ───────────────────────────── */
export function NearHtml({ pos, max, children }: { pos: [number, number, number]; max: number; children: React.ReactNode }) {
  const { camera } = useThree();
  const [show, setShow] = React.useState(true);
  const g = useRef<THREE.Group>(null);
  const t = useRef(0);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame((st) => {
    if (st.clock.elapsedTime - t.current < 0.4 || !g.current) return;
    t.current = st.clock.elapsedTime;
    const s = camera.position.distanceTo(g.current.getWorldPosition(tmp)) < max;
    if (s !== show) setShow(s);
  });
  return (
    <group ref={g} position={pos}>
      <Html center zIndexRange={[10, 0]} style={{ pointerEvents: 'none', display: show ? 'block' : 'none' }}>
        {children}
      </Html>
    </group>
  );
}

export function RoomLabels({ data }: { data: CampusData }) {
  const list = useMemo(() => {
    const seen = new Set<string>();
    return data.rooms.filter((r) => MAJOR_ROOM.test(r.n) && !seen.has(r.n.toLowerCase() + Math.round(r.x / 20) + Math.round(r.y / 20)) && seen.add(r.n.toLowerCase() + Math.round(r.x / 20) + Math.round(r.y / 20)));
  }, [data]);
  return (
    <>
      {list.map((r, i) => (
        <NearHtml key={i} pos={[r.x * FTm, 7 * FTm, -r.y * FTm]} max={45}>
          <div className="label3d sec">{r.n}</div>
        </NearHtml>
      ))}
    </>
  );
}

/* ───────────────────────────── event layout (zones, tents, signs — all from the edits) ───────────────────────────── */
function arrowShape() {
  const s = new THREE.Shape();
  s.moveTo(-6, -1.2); s.lineTo(2, -1.2); s.lineTo(2, -3); s.lineTo(8, 0); s.lineTo(2, 3); s.lineTo(2, 1.2); s.lineTo(-6, 1.2); s.closePath();
  return s;
}

export function EventZones({ dusk }: { dusk: boolean }) {
  const { zones, signs, shuttles, booths } = useCE((s) => s.e);
  const zoneMats = useMemo(() => {
    const m = new Map<string, THREE.MeshBasicMaterial>();
    for (const z of zones) m.set(z.id, new THREE.MeshBasicMaterial({ color: z.color, transparent: true, opacity: 0.28, depthWrite: false, toneMapped: false }));
    return m;
  }, [zones]);
  const M = useMemo(() => ({
    post: std('#555a60', { metalness: 0.5 }), wc: std('#d6249f'), table: std('#8a6a48'),
    arrow: new THREE.MeshBasicMaterial({ color: '#d92d2d', toneMapped: false }),
    bus: std('#f0b429'),
  }), []);
  const tents = useMemo(() => {
    const out: { x: number; y: number; c: string }[] = [];
    const cols = ['#e8620a', '#8a1d28', '#ffb81c', '#1f7a6e', '#c2185b', '#2f6fdb'];
    let k = 0;
    for (const z of zones) {
      if (!z.tents || (z.id === 'kdc' && booths.length)) continue;
      const [x0, x1, y0, y1] = z.r;
      const w = x1 - x0, h = y1 - y0;
      if (w >= h) {
        for (let x = x0 + 14; x < x1 - 8; x += 12) { out.push({ x, y: y0 + 18, c: cols[k++ % 6] }); out.push({ x, y: y1 - 22, c: cols[k++ % 6] }); }
      } else {
        for (let y = y0 + 12; y < y1 - 6; y += 14) { out.push({ x: x0 + 20, y, c: z.color }); out.push({ x: x1 - 20, y, c: z.color }); }
      }
    }
    return out;
  }, [zones, booths]);
  const wcBlocks = useMemo(() => {
    const z = zones.find((q) => q.id === 'wc');
    if (!z) return [];
    const cx = (z.r[0] + z.r[1]) / 2;
    return [z.r[2] + 15, z.r[3] - 15].map((y) => [cx, y] as [number, number]);
  }, [zones]);
  const arrows = useMemo(() => {
    const out: [number, number][] = [];
    for (const z of zones.filter((q) => q.id === 'pick' || /^lane\d$/.test(q.id))) {
      const y = (z.r[2] + z.r[3]) / 2;
      for (let x = z.r[1] - 30; x > z.r[0] + 20; x -= 85) out.push([x, y]);
    }
    return out;
  }, [zones]);
  const tentRoof = useMemo(() => new THREE.ConeGeometry(7.4 * FTm, 2.4 * FTm, 4).rotateY(Math.PI / 4).translate(0, 9.2 * FTm, 0), []);
  const tentPost = useMemo(() => merge([[-3.6, -3.6], [3.6, -3.6], [-3.6, 3.6], [3.6, 3.6]].map(([x, y]) => boxAt(x, y, 4, 0.3, 0.3, 8)))!, []);
  const table = useMemo(() => new THREE.BoxGeometry(7 * FTm, 0.25 * FTm, 2.5 * FTm).translate(0, 3 * FTm, 0), []);
  const arrowGeo = useMemo(() => { const g = new THREE.ShapeGeometry(arrowShape()); g.scale(FTm, FTm, FTm); g.rotateX(-Math.PI / 2); return g; }, []);
  const tentMat = useMemo(() => std('#ffffff', { roughness: 0.8 }), []);
  const signTex = useMemo(() => signs.map((s) => canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#c94f5a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#fff'; g.font = '700 84px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(s.n ?? ''), w / 2, h / 2 + 4);
  })), [signs]);
  void dusk;

  return (
    <group>
      {zones.map((z) => {
        const [x0, x1, y0, y1] = z.r;
        return (
          <group key={z.id}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={W((x0 + x1) / 2, (y0 + y1) / 2, 0.14)} renderOrder={2} material={zoneMats.get(z.id)}>
              <planeGeometry args={[(x1 - x0) * FTm, (y1 - y0) * FTm]} />
            </mesh>
            <NearHtml pos={[((x0 + x1) / 2) * FTm, 14 * FTm, (-(y0 + y1) / 2) * FTm]} max={700}>
              <div className="label3d sec" style={{ background: z.color, color: '#fff', borderColor: '#fff' }}>{z.label}</div>
            </NearHtml>
          </group>
        );
      })}
      <Inst geo={tentRoof} mat={tentMat} n={tents.length} colored deps={[tents]} fill={(i, d, c) => { d.position.copy(W(tents[i].x, tents[i].y, 0)); c.set(tents[i].c); }} />
      <Inst geo={tentPost} mat={M.post} n={tents.length} deps={[tents]} fill={(i, d) => d.position.copy(W(tents[i].x, tents[i].y, 0))} />
      <Inst geo={table} mat={M.table} n={tents.length} deps={[tents]} fill={(i, d) => d.position.copy(W(tents[i].x, tents[i].y, 0))} />
      {wcBlocks.map(([x, y], i) => (
        <mesh key={i} position={W(x, y, 4.5)}><boxGeometry args={[14 * FTm, 9 * FTm, 24 * FTm]} /><primitive object={M.wc} attach="material" /></mesh>
      ))}
      {arrows.map(([x, y], i) => (
        <mesh key={i} geometry={arrowGeo} material={M.arrow} position={W(x, y, 0.18)} rotation={[0, Math.PI, 0]} renderOrder={3} />
      ))}
      {shuttles.map((p) => (
        <group key={p.id} position={W(p.x, p.y, 0)}>
          <mesh position={[0, 3 * FTm, 0]}><boxGeometry args={[0.3 * FTm, 6 * FTm, 0.3 * FTm]} /><primitive object={M.post} attach="material" /></mesh>
          <mesh position={[0, 6.6 * FTm, 0]}><boxGeometry args={[4 * FTm, 1.6 * FTm, 0.2 * FTm]} /><primitive object={M.bus} attach="material" /></mesh>
          <NearHtml pos={[0, 8.2 * FTm, 0]} max={160}><div className="label3d" style={{ background: '#f0b429', color: '#222' }}>Shuttle</div></NearHtml>
        </group>
      ))}
      {signs.map((s, i) => (
        <group key={s.id} position={W(s.x, s.y, 0)}>
          <mesh position={[0, 3.5 * FTm, 0]}><boxGeometry args={[0.3 * FTm, 7 * FTm, 0.3 * FTm]} /><primitive object={M.post} attach="material" /></mesh>
          <mesh position={[0, 7.6 * FTm, 0]}>
            <planeGeometry args={[3.2 * FTm, 3.2 * FTm]} />
            <meshBasicMaterial map={signTex[i]} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ───────────────────────────── things drawn in the Campus plan editor ───────────────────────────── */
const AREA_Z: Record<string, number> = { asphalt: 0.03, paving: 0.1, floor: 0.11, lawn: 0.12, water: 0.1 };
export function EditedItems() {
  const added = useCE((s) => s.e.added);
  const M = useMemo(() => ({
    wall: std('#d6c3a2'),
    glass: new THREE.MeshStandardMaterial({ color: '#a9cbd6', roughness: 0.08, transparent: true, opacity: 0.5, depthWrite: false }),
    door: std('#6b4a2f', { roughness: 0.55 }),
    lawn: std('#6f8a4c'), paving: std('#cfc8bb'), asphalt: std('#3b3d41'), floor: std('#c9bfae', { roughness: 0.4 }),
    water: new THREE.MeshStandardMaterial({ color: '#4a86a8', roughness: 0.1, metalness: 0.2 }),
    block: std('#d9c7a6'), trunk: std('#5b4430'), crown: std('#3f7a3a', { flatShading: true }),
    tent: std('#ffffff'), post: std('#555a60', { metalness: 0.5 }), gold: std('#d4a63a', { metalness: 0.7, roughness: 0.35 }),
    marigold: std('#f28c0f', { emissive: new THREE.Color('#e8780a'), emissiveIntensity: 0.25 }), maroon: std('#7d1d24'),
  }), []);
  const seg = (a: number[], b: number[], w: number, h: number, mat: THREE.Material, z0 = 0, key?: string) => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 0.05) return null;
    return (
      <mesh key={key} position={W((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z0 + h / 2)} rotation={[0, Math.atan2(b[1] - a[1], b[0] - a[0]), 0]} material={mat}>
        <boxGeometry args={[L * FTm, h * FTm, w * FTm]} />
      </mesh>
    );
  };
  return (
    <group>
      {added.map((it) => {
        switch (it.t) {
          case 'wall': return seg(it.a, it.b, it.w, it.h, M.wall, 0, it.id);
          case 'glass': return seg(it.a, it.b, 0.25, it.h, M.glass, 0, it.id);
          case 'door': return seg(it.a, it.b, 0.4, 7.5, M.door, 0, it.id);
          case 'area': {
            const [x0, x1, y0, y1] = normRect([it.r[0], it.r[2]], [it.r[1], it.r[3]]);
            const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
            if (it.k === 'block')
              return <mesh key={it.id} position={W(cx, cy, it.h / 2)} material={M.block}><boxGeometry args={[(x1 - x0) * FTm, it.h * FTm, (y1 - y0) * FTm]} /></mesh>;
            return (
              <mesh key={it.id} rotation={[-Math.PI / 2, 0, 0]} position={W(cx, cy, AREA_Z[it.k] ?? 0.1)} material={(M as any)[it.k]}>
                <planeGeometry args={[(x1 - x0) * FTm, (y1 - y0) * FTm]} />
              </mesh>
            );
          }
          case 'tree':
            return (
              <group key={it.id} position={W(it.x, it.y, 0)}>
                <mesh position={[0, 4 * FTm, 0]} material={M.trunk}><cylinderGeometry args={[0.6 * FTm, 0.8 * FTm, 8 * FTm, 6]} /></mesh>
                <mesh position={[0, 13 * FTm, 0]} scale={[6.5 * FTm, 6 * FTm, 6.5 * FTm]} material={M.crown}><icosahedronGeometry args={[1, 1]} /></mesh>
              </group>
            );
          case 'tent':
            return (
              <group key={it.id} position={W(it.x, it.y, 0)}>
                <mesh position={[0, 9.2 * FTm, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[7.4 * FTm, 2.4 * FTm, 4]} /><meshStandardMaterial color={it.c} roughness={0.8} /></mesh>
                {[[-3.6, -3.6], [3.6, -3.6], [-3.6, 3.6], [3.6, 3.6]].map(([x, y], i) => (
                  <mesh key={i} position={[x * FTm, 4 * FTm, -y * FTm]} material={M.post}><boxGeometry args={[0.3 * FTm, 8 * FTm, 0.3 * FTm]} /></mesh>
                ))}
                <mesh position={[0, 3 * FTm, 0]} material={M.post}><boxGeometry args={[7 * FTm, 0.25 * FTm, 2.5 * FTm]} /></mesh>
              </group>
            );
          case 'gate': return <Gate key={it.id} g={it} M={M} />;
          case 'text':
            return (
              <NearHtml key={it.id} pos={[it.x * FTm, 8 * FTm, -it.y * FTm]} max={400}>
                <div className="label3d sec">{it.label}</div>
              </NearHtml>
            );
        }
      })}
    </group>
  );
}

function Gate({ g, M }: { g: Extract<Added, { t: 'gate' }>; M: any }) {
  const tex = useMemo(() => canvasTex(1024, 192, (c, w, h) => {
    c.fillStyle = '#7d1d24'; c.fillRect(0, 0, w, h); c.strokeStyle = '#e3b84c'; c.lineWidth = 8; c.strokeRect(12, 12, w - 24, h - 24);
    c.fillStyle = '#f6d98a'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '700 96px Georgia, serif'; c.fillText(g.label, w / 2, h / 2 + 4);
  }), [g.label]);
  const half = g.w / 2;
  return (
    <group position={W(g.x, g.y, 0)} rotation={[0, (g.yaw * Math.PI) / 180, 0]}>
      {[-1, 1].map((k) => (
        <group key={k}>
          <mesh position={[k * half * FTm, 7 * FTm, 0]} material={M.marigold}><boxGeometry args={[2 * FTm, 14 * FTm, 2 * FTm]} /></mesh>
          <mesh position={[k * half * FTm, 14.4 * FTm, 0]} material={M.gold}><boxGeometry args={[2.6 * FTm, 0.8 * FTm, 2.6 * FTm]} /></mesh>
        </group>
      ))}
      <mesh position={[0, 15.2 * FTm, 0]} material={M.maroon}><boxGeometry args={[(g.w + 2) * FTm, 1.6 * FTm, 1.8 * FTm]} /></mesh>
      <mesh position={[0, 18.4 * FTm, 0]}>
        <planeGeometry args={[Math.min(g.w, 18) * FTm, 3.4 * FTm]} />
        <meshBasicMaterial map={tex} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
