'use client';
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PointerLockControls } from '@react-three/drei';
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { loadCampus, type CampusData } from '@/lib/campus';
import { useCE, editedData } from '@/lib/campusEdits';
import { W, FTm } from './materials';
import { CampusShell, CampusSite, Crowd, Dressing, EditedItems, EventZones, RoomLabels, type CampusOpts } from './CampusModel';
import { KdcActivities } from './CampusKdc';
import { SiteExtras, UtsavpurGates } from './CampusEntrances';
import { KdcBooths, CarnivalGates, AnnakutLayouts, Displays } from './CampusFestival';
import { SolarCanopies, ShoeRows, Ramps } from './CampusExtras';
import { ExhibitLayout } from './CampusExhibits';
import { Seg, Icon } from '../ui';

type P3 = [number, number, number];
// hall-frame feet. Hall SW interior corner is (0,0); the entrance foyer faces south at x≈-34.
const PRESETS: Record<string, { label: string; pos: P3; tgt: P3 }> = {
  aerialSW: { label: 'Aerial · south-west', pos: [-470, -330, 300], tgt: [-130, 70, 0] },
  aerialSE: { label: 'Aerial · south-east', pos: [330, -250, 220], tgt: [-90, 60, 0] },
  aerialN: { label: 'Aerial · north', pos: [-60, 420, 260], tgt: [-130, 60, 0] },
  front: { label: 'Main entrance', pos: [-34, -85, 9], tgt: [-34, -24, 9] },
  plaza: { label: 'Entrance plaza (high)', pos: [-70, -95, 40], tgt: [-34, -20, 6] },
  foyer: { label: 'Foyer', pos: [-33, -16, 5.5], tgt: [-33, 90, 6] },
  hall: { label: 'Assembly Hall (floor)', pos: [8, 48, 8], tgt: [150, 48, 6] },
  exhibition: { label: 'Exhibition layout (above)', pos: [58, 18, 140], tgt: [58, 47, 0] },
  xcapa: { label: 'Exh · CAPA', pos: [60, 14, 12], tgt: [46, 16, 4] },
  xcenter: { label: 'Exh · Centerpiece', pos: [60, 47, 15], tgt: [80, 47, 5] },
  xnv: { label: 'Exh · Neelkanth Varni', pos: [12, 15, 17], tgt: [12, 5, 5] },
  xlotus: { label: 'Exh · Lotus & mirrors', pos: [58, 76, 13], tgt: [46, 82, 5] },
  xdio: { label: 'Exh · Dioramas & Nilkanth box', pos: [68, 77, 12], tgt: [70, 88, 5] },
  xhouse: { label: 'Exh · TVs & Hindu House', pos: [102, 31, 14], tgt: [102, 62, 4] },
  expl: { label: 'Exhibition · south-west', pos: [10, 4, 40], tgt: [60, 50, 3] },
  hallTop: { label: 'Assembly Hall (above)', pos: [60, -30, 130], tgt: [70, 48, 0] },
  food: { label: 'Food court & KDC', pos: [20, 130, 160], tgt: [60, 270, 0] },
  pickup: { label: 'Pick-up & drop-off', pos: [-60, -210, 70], tgt: [-60, -40, 0] },
  kdc: { label: 'KDC · booths', pos: [180, 200, 36], tgt: [229, 210, 5] },
  kdcAbove: { label: 'KDC · overview (above)', pos: [150, 255, 230], tgt: [210, 350, 0] },
  kdcRow: { label: 'KDC · shootout, steps, open space', pos: [186, 330, 30], tgt: [231, 322, 5] },
  kdcShoot: { label: 'KDC · sports shootout', pos: [204, 347, 15], tgt: [231, 347, 6] },
  kdcSteps: { label: 'KDC · Kids Diwali steps', pos: [206, 322, 14], tgt: [231, 322, 6] },
  kdcPocket: { label: 'KDC · pocket (inflatables)', pos: [158, 392, 42], tgt: [205, 414, 5] },
  utsav: { label: 'Utsavpur gate', pos: [219, -20, 20], tgt: [219, 19, 9] },
  peacocks: { label: 'Peacock pillars', pos: [-20, -70, 12], tgt: [-20, -32, 5] },
  lanes: { label: 'Drop-off lanes', pos: [-60, -240, 120], tgt: [-60, -70, 0] },
  kdcCastle: { label: 'KDC · 7-in-1 castle', pos: [160, 413, 22], tgt: [186, 433, 7] },
  carnival: { label: 'Carnival gate', pos: [190, -10, 26], tgt: [190, 60, 16] },
  mandir: { label: 'Mandir Hall (annakut)', pos: [-43, 80, 72], tgt: [-43, 140, 0] },
  ramp: { label: 'Mandir Hall ramps', pos: [-43, 100, 44], tgt: [-43, 138, 0] },
  gymdisplay: { label: 'Side-room display', pos: [-118, 150, 34], tgt: [-118, 187, 6] },
  sideGate: { label: 'Side entrance & shoe stands', pos: [14, -78, 22], tgt: [14, -30, 6] },
  canopy: { label: 'Food court canopy', pos: [60, 170, 70], tgt: [60, 260, 12] },
  parking: { label: 'Parking lot', pos: [-300, -120, 60], tgt: [-330, 20, 0] },
};

export default function CampusView() {
  const [base, setData] = useState<CampusData | null>(null);
  const ce = useCE((s) => s.e);
  const data = useMemo(() => (base ? editedData(base, ce) : null), [base, ce.hidden, ce.erase]);
  const [preset, setPreset] = useState('aerialSW');
  const [cam, setCam] = useState<'orbit' | 'walk'>('orbit');
  const [o, setO] = useState<CampusOpts>({ roof: 'open', dusk: false, labels: true, people: true, cars: true, dressing: false, zones: true, exhibit: true });
  const set = <K extends keyof CampusOpts>(k: K, v: CampusOpts[K]) => setO((p) => ({ ...p, [k]: v }));
  const [ready, setReady] = useState(false);
  const [canopy, setCanopy] = useState(true);
  useEffect(() => { loadCampus().then(setData); }, []);

  const sky = o.dusk ? '#232a4a' : '#bfd9ee';
  return (
    <div className="view-full" style={{ flexDirection: 'column' }}>
      <div className="view-tight" style={{ paddingBottom: 8, flex: 'none' }}>
        <div className="section-title" style={{ margin: 0 }}>
          <h1 className="h-display">Campus 3D</h1>
          <span className="muted small">The whole BAPS Milpitas campus as it will look on Diwali day, built from the DWG. Plain lighting for now, so it stays quick to iterate.</span>
        </div>
      </div>
      <div className="three-wrap">
        <Canvas
          flat
          dpr={[1, 1.5]}
          gl={{ antialias: true, powerPreference: 'high-performance', stencil: false }}
          camera={{ fov: 50, near: 0.3, far: 2500, position: W(...PRESETS.aerialSW.pos) }}
        >
          <color attach="background" args={[sky]} />
          <fog attach="fog" args={[sky, 400, 1500]} />
          <Lighting dusk={o.dusk} />
          <Suspense fallback={null}>
            {data && (
              <>
                <CampusShell data={data} opts={o} />
                <CampusSite data={data} opts={o} />
                {o.exhibit && <ExhibitLayout />}
                {o.people && <Crowd data={data} />}
                {o.dressing && <Dressing data={data} dusk={o.dusk} />}
                <EditedItems />
                {o.zones && <EventZones dusk={o.dusk} />}
                {o.zones && <KdcBooths />}
                {o.zones && <KdcActivities />}
                {o.zones && <CarnivalGates />}
                {o.zones && <UtsavpurGates />}
                {o.zones && <SiteExtras />}
                {o.exhibit && <AnnakutLayouts />}
                {o.exhibit && <Ramps />}
                {o.exhibit && <Displays />}
                {o.zones && <ShoeRows />}
                <SolarCanopies on={canopy && o.roof !== 'off'} />
                {o.labels && <RoomLabels data={data} />}
                <Ready onReady={() => setReady(true)} />
              </>
            )}
          </Suspense>
          {cam === 'orbit' ? <OrbitRig preset={preset} /> : <WalkRig />}
          <EffectComposer multisampling={0}>
            <Bloom mipmapBlur luminanceThreshold={o.dusk ? 0.85 : 1.4} luminanceSmoothing={0.4} intensity={o.dusk ? 0.9 : 0.15} radius={0.6} />
            <ToneMapping mode={ToneMappingMode.AGX} />
          </EffectComposer>
        </Canvas>
        {cam === 'walk' && <div className="crosshair" />}
        {!ready && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 4, background: '#f4efe6', color: '#4a4034', fontSize: 13 }}>
            Building the campus model…
          </div>
        )}
        <div className="tool-strip tl">
          <Seg value={cam} onChange={setCam} options={[{ v: 'orbit', label: <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}><Icon.cube size={13} />Orbit</span> }, { v: 'walk', label: <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}><Icon.walk size={13} />Walk</span> }]} />
          <select className="input" style={{ height: 28, fontSize: 12 }} value={preset} onChange={(e) => { setPreset(e.target.value); setCam('orbit'); }}>
            {Object.entries(PRESETS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div className="tool-strip tr">
          <Seg value={o.dusk ? 'dusk' : 'day'} onChange={(v) => set('dusk', v === 'dusk')} options={[{ v: 'day', label: 'Day' }, { v: 'dusk', label: 'Diwali dusk' }]} />
          <Seg value={o.roof} onChange={(v) => set('roof', v)} options={[{ v: 'on', label: 'Roof' }, { v: 'open', label: 'Hall open' }, { v: 'off', label: 'No roof' }]} />
        </div>
        <div className="tool-strip bl">
          {([['zones', 'Event layout'], ['dressing', 'Festival dressing'], ['exhibit', 'Exhibition'], ['people', 'People'], ['cars', 'Cars'], ['labels', 'Labels']] as const).map(([k, l]) => (
            <button key={k} className="chip" aria-pressed={o[k]} onClick={() => set(k, !o[k])}>{l}</button>
          ))}
          <button className="chip" aria-pressed={canopy} onClick={() => setCanopy(!canopy)}>Solar canopy</button>
        </div>
        {cam === 'walk' && <div className="walk-hint">Click to look around · W A S D to walk · Shift to run · Esc to release</div>}
      </div>
    </div>
  );
}

function Ready({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (!done.current) { done.current = true; onReady(); }
  });
  return null;
}

function Lighting({ dusk }: { dusk: boolean }) {
  return dusk ? (
    <>
      <hemisphereLight args={['#6c7bb8', '#2a2438', 0.9]} />
      <directionalLight color="#ff9a5a" intensity={1.1} position={[-300, 60, 200]} />
      <ambientLight intensity={0.35} color="#8a7a9a" />
    </>
  ) : (
    <>
      <hemisphereLight args={['#e4f0fa', '#8a7e6a', 1.5]} />
      <directionalLight color="#fff1dc" intensity={2.4} position={[-250, 400, 250]} />
      <ambientLight intensity={0.35} />
    </>
  );
}

function OrbitRig({ preset }: { preset: string }) {
  const ctl = useRef<any>(null);
  const { camera } = useThree();
  const p = PRESETS[preset] || PRESETS.aerialSW;
  const tgt = useMemo(() => W(...p.tgt), [p]);
  useEffect(() => {
    camera.position.copy(W(...p.pos));
    camera.lookAt(tgt);
    const id = requestAnimationFrame(() => {
      ctl.current?.target.copy(tgt);
      ctl.current?.update();
    });
    return () => cancelAnimationFrame(id);
  }, [p, camera, tgt]);
  return <OrbitControls ref={ctl} makeDefault enableDamping dampingFactor={0.08} maxPolarAngle={Math.PI * 0.495} minDistance={2} maxDistance={900} target={tgt} />;
}

function WalkRig() {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  useEffect(() => {
    camera.position.y = 5.4 * FTm;
    const d = (e: KeyboardEvent) => (keys.current[e.code] = true);
    const u = (e: KeyboardEvent) => (keys.current[e.code] = false);
    window.addEventListener('keydown', d);
    window.addEventListener('keyup', u);
    return () => {
      window.removeEventListener('keydown', d);
      window.removeEventListener('keyup', u);
    };
  }, [camera]);
  useFrame((_, dt) => {
    const k = keys.current;
    const sp = (k.ShiftLeft || k.ShiftRight ? 9 : 3.2) * dt;
    const f = new THREE.Vector3();
    camera.getWorldDirection(f);
    f.y = 0;
    f.normalize();
    const r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0));
    if (k.KeyW || k.ArrowUp) camera.position.addScaledVector(f, sp);
    if (k.KeyS || k.ArrowDown) camera.position.addScaledVector(f, -sp);
    if (k.KeyA || k.ArrowLeft) camera.position.addScaledVector(r, -sp);
    if (k.KeyD || k.ArrowRight) camera.position.addScaledVector(r, sp);
    camera.position.y = 5.4 * FTm;
  });
  return <PointerLockControls />;
}
