'use client';
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PointerLockControls, Html } from '@react-three/drei';
import { EffectComposer, Bloom, ToneMapping, Noise, Vignette, N8AO } from '@react-three/postprocessing';
import { ToneMappingMode, Effect, BlendFunction } from 'postprocessing';
import { useStore } from '@/lib/store';
import { buildScene, evalProbe, type Scene as CalcScene } from '@/lib/engine';
import { itemFootprint, absPts } from '@/lib/catalog';
import { SECTION_MAP } from '@/lib/content';
import { VERDICT_COLOR, fmtLux, luxColor } from '@/lib/heat';
import { DEG } from '@/lib/geom';
import Hall3D from './Hall3D';
import { Items3D } from './Items3D';
import { useSpotDefs, Spots, EmitterLights, FixtureBodies, BeamCones } from './Lights3D';
import { mats, W, FTm } from './materials';
import { Seg, Icon } from '../ui';

type ExpMode = 'eye' | 'phone' | 'manual';
type CamMode = 'orbit' | 'walk';

// ——— exposure effect (physical: scene radiance in nits × exposure → tone curve) ———
class ExposureEffectImpl extends Effect {
  constructor() {
    super('ExposureEffect', 'uniform float exposure;\nvoid mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor){ outputColor = vec4(inputColor.rgb * exposure, inputColor.a); }', {
      uniforms: new Map([['exposure', new THREE.Uniform(1)]]),
      blendFunction: BlendFunction.NORMAL,
    });
  }
}
function Exposure({ value }: { value: number }) {
  const eff = useMemo(() => new ExposureEffectImpl(), []);
  useEffect(() => {
    (eff.uniforms.get('exposure') as THREE.Uniform).value = value;
  }, [eff, value]);
  return <primitive object={eff} dispose={null} />;
}

const PRESETS: Record<string, { pos: [number, number, number]; tgt: [number, number, number]; label: string }> = {
  entrance: { pos: [45.5, 3.5, 5.6], tgt: [50, 22, 4.5], label: 'From the entrance' },
  overview: { pos: [60, -42, 62], tgt: [60, 48, 0], label: 'Bird’s-eye' },
  festivals: { pos: [60, 27, 9], tgt: [74, 12, 3], label: '1 Festivals' },
  rites: { pos: [92, 30, 8], tgt: [106, 10, 4], label: '2 Rites' },
  house: { pos: [92.5, 38, 9.5], tgt: [103, 54, 3.5], label: '3 House' },
  houseIn: { pos: [104.9, 68, 5.3], tgt: [103.35, 60.1, 3.6], label: '3 House — inside' },
  beliefs: { pos: [80.5, 78.4, 6.5], tgt: [70, 80, 4], label: '4 Beliefs' },
  values: { pos: [56, 78, 6], tgt: [44, 78, 4.2], label: '5 Core Values' },
  stambh: { pos: [67.5, 48.5, 6.2], tgt: [80, 49, 5.5], label: '6 Adhar Stambh' },
  photo: { pos: [17, 52.3, 5.5], tgt: [4, 52.3, 5], label: 'Photo booth' },
  pipe: { pos: [58, 79, 7], tgt: [66.8, 84, 9], label: 'Lights on the drape pipe' },
};

export default function ThreeView() {
  const project = useStore((s) => s.project);
  const result = useStore((s) => s.result);
  const selected = useStore((s) => s.selected);
  const select = useStore((s) => s.select);
  const [exp, setExp] = useState<ExpMode>('phone');
  const [ev, setEv] = useState(7);
  const [cam, setCam] = useState<CamMode>('orbit');
  const [quality, setQuality] = useState<'high' | 'low'>(() => (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('q') === 'low' ? 'low' : 'high'));
  const [labels, setLabels] = useState(true);
  const [heat, setHeat] = useState(false);
  const [beams, setBeams] = useState(false);
  const [people, setPeople] = useState(true);
  const [preset, setPreset] = useState('entrance');
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [glLost, setGlLost] = useState(false);
  const [meter, setMeter] = useState<{ E: number; iso: number; m: number }>({ E: 150, iso: 320, m: Math.PI / 150 });
  const [hover, setHover] = useState<{ id: string; name: string; x: number; y: number } | null>(null);
  const sc = useMemo<CalcScene | null>(() => {
    try {
      return buildScene(project);
    } catch {
      return null;
    }
  }, [project]);
  const zoneInd = result?.zoneInd || [0];
  const onHover = (id: string | null, name?: string, e?: any) => {
    if (!id) return setHover(null);
    setHover({ id, name: name || id, x: e?.nativeEvent?.offsetX ?? 0, y: e?.nativeEvent?.offsetY ?? 0 });
  };
  const exposure = exp === 'manual' ? Math.PI / (2.5 * Math.pow(2, ev)) : meter.m;
  // Bloom reads the un-exposed scene (it shares the merged effect pass), so its threshold and strength must be
  // expressed in raw scene units — otherwise every lit wall blooms and the picture washes out.
  const bloomRef = useRef<any>(null);
  useEffect(() => {
    const b = bloomRef.current;
    if (!b) return;
    b.intensity = 0.25 * exposure;
    if (b.luminanceMaterial) b.luminanceMaterial.threshold = 3 / exposure;
  }, [exposure, quality]);

  return (
    <div className="view-full" style={{ flexDirection: 'column' }}>
      <div className="view-tight" style={{ paddingBottom: 8, flex: 'none' }}>
        <div className="section-title" style={{ margin: 0 }}>
          <h1 className="h-display">3D walkthrough</h1>
          <span className="muted small">Every light is a real photometric source in candela; the image is exposed like a phone camera (or your eye) so dim areas look dim. Click anything to inspect it.</span>
        </div>
      </div>
      <div className="three-wrap" onPointerLeave={() => setHover(null)}>
        <Canvas
          shadows
          flat
          dpr={[1, quality === 'high' ? 1.75 : 1]}
          gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
          camera={{ fov: 55, near: 0.05, far: 300, position: W(...PRESETS.entrance.pos) }}
          onPointerMissed={() => select(null)}
          onCreated={({ gl }) => {
            gl.debug.checkShaderErrors = true;
            gl.debug.onShaderError = () => {
              setQuality((q) => {
                if (q === 'high') setNotice('Your GPU could not compile the high-quality lighting, so 3D switched to Fast mode.');
                return 'low';
              });
            };
            const cv = gl.domElement;
            cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); setGlLost(true); });
            cv.addEventListener('webglcontextrestored', () => setGlLost(false));
          }}
        >
          <color attach="background" args={['#020202']} />
          <Suspense fallback={null}>
            <SceneContent
              project={project}
              sc={sc}
              zoneInd={zoneInd}
              quality={quality}
              beams={beams}
              heat={heat}
              people={people}
              labels={labels}
              selected={selected}
              onSelect={select}
              onHover={onHover}
              onReady={() => setReady(true)}
            />
            <Metering sc={sc} zoneInd={zoneInd} mode={exp} onMeter={setMeter} />
            {cam === 'orbit' ? <OrbitRig preset={preset} /> : <WalkRig />}
            <EffectComposer multisampling={quality === 'high' ? 4 : 0} enableNormalPass={quality === 'high'}>
              <>{quality === 'high' ? <N8AO aoRadius={0.6} intensity={1.6} distanceFalloff={0.6} halfRes /> : null}</>
              <Exposure value={exposure} />
              <Bloom ref={bloomRef} mipmapBlur luminanceThreshold={4} luminanceSmoothing={0.5} intensity={0.08} radius={0.35} />
              <ToneMapping mode={ToneMappingMode.AGX} />
              <Noise opacity={exp === 'phone' ? Math.min(0.32, Math.max(0, (meter.iso - 200) / 9000)) : 0} premultiply blendFunction={BlendFunction.SCREEN} />
              <Vignette offset={0.28} darkness={0.5} />
            </EffectComposer>
          </Suspense>
        </Canvas>
        {cam === 'walk' && <div className="crosshair" />}
        {(!ready || glLost) && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 4, background: '#050505', color: 'var(--on-dark-2)', fontSize: 13, textAlign: 'center', padding: 24 }}>
            {glLost ? 'The graphics card reset the 3D view. Switch to Fast or reload the page.' : 'Preparing the 3D hall and compiling lights… this can take a few seconds the first time.'}
          </div>
        )}
        {notice && (
          <div className="tool-strip" style={{ top: 60, left: '50%', transform: 'translateX(-50%)', padding: '6px 12px' }}>
            <span className="small">{notice}</span>
            <button className="btn btn-sm btn-ghost" onClick={() => setNotice(null)}>OK</button>
          </div>
        )}
        <div className="tool-strip tl">
          <Seg value={cam} onChange={setCam} options={[{ v: 'orbit', label: <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}><Icon.cube size={13} />Orbit</span> }, { v: 'walk', label: <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}><Icon.walk size={13} />Walk</span> }]} />
          {cam === 'orbit' && (
            <select className="input" style={{ height: 28, fontSize: 12 }} value={preset} onChange={(e) => setPreset(e.target.value)}>
              {Object.entries(PRESETS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          )}
        </div>
        <div className="tool-strip tr">
          <Seg value={exp} onChange={setExp} options={[{ v: 'phone', label: 'Phone camera', title: 'Auto-ISO phone at f/1.8 · 1/60 s' }, { v: 'eye', label: 'Eye', title: 'Partial eye adaptation' }, { v: 'manual', label: 'Manual EV' }]} />
          {exp === 'manual' && (
            <input type="range" min={3} max={12} step={0.25} value={ev} onChange={(e) => setEv(parseFloat(e.target.value))} style={{ width: 110, accentColor: 'var(--terra)' }} title={`EV ${ev}`} />
          )}
        </div>
        <div className="tool-strip bl">
          {([['labels', labels, setLabels, 'Labels'], ['people', people, setPeople, 'People'], ['heat', heat, setHeat, 'Lux on floor'], ['beams', beams, setBeams, 'Haze beams']] as const).map(([k, v, set, l]) => (
            <button key={k} className="chip" aria-pressed={v} onClick={() => (set as any)(!v)}>{l}</button>
          ))}
          <span className="sep" />
          <Seg value={quality} onChange={setQuality} options={[{ v: 'high', label: 'High' }, { v: 'low', label: 'Fast' }]} />
        </div>
        <div className="cam-badge">
          {exp === 'phone' && <>ISO {Math.round(meter.iso)} · 1/60 s · f/1.8 · metered {fmtLux(meter.E)} lx{meter.iso >= 3200 ? ' · underexposed' : ''}</>}
          {exp === 'eye' && <>Eye adapted to ≈ {fmtLux(meter.E)} lx</>}
          {exp === 'manual' && <>EV₁₀₀ {ev.toFixed(1)} ≈ {fmtLux(2.5 * Math.pow(2, ev))} lx for mid-grey</>}
        </div>
        {cam === 'walk' && <div className="walk-hint">Click to look around · W A S D to walk · Shift to run · Esc to release</div>}
        {hover && cam === 'orbit' && <HoverCard h={hover} />}
      </div>
    </div>
  );
}

function HoverCard({ h }: { h: { id: string; name: string; x: number; y: number } }) {
  const result = useStore((s) => s.result);
  const project = useStore((s) => s.project);
  const it = project.items.find((i) => i.id === h.id);
  const surf = (result?.surfaces || []).filter((s) => s.itemId === h.id);
  const avg = surf.length ? surf.reduce((a, s) => a + s.avg, 0) / surf.length : null;
  return (
    <div className="plan-readout" style={{ left: h.x + 14, top: h.y + 14 }}>
      <b style={{ fontFamily: 'var(--f-ui)' }}>{h.name}</b>
      {it && <div className="muted tiny">{SECTION_MAP[it.section]?.title || ''}</div>}
      {avg !== null && <div className="tiny" style={{ marginTop: 3 }}>Light on it: <b>{fmtLux(avg)}</b> lx avg</div>}
    </div>
  );
}

function SceneContent(props: {
  project: ReturnType<typeof useStore.getState>['project'];
  sc: CalcScene | null;
  zoneInd: number[];
  quality: 'high' | 'low';
  beams: boolean;
  heat: boolean;
  people: boolean;
  labels: boolean;
  selected: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null, name?: string, e?: any) => void;
  onReady?: () => void;
}) {
  const { project, sc, zoneInd, quality } = props;
  const { gl } = useThree();
  const shadowBudget = useMemo(() => {
    const units = gl.capabilities.maxTextures || 16;
    return Math.max(0, Math.min(4, Math.floor((units - 9) / 2)));
  }, [gl]);
  const defs = useSpotDefs(project, sc, quality, shadowBudget);
  useEffect(() => {
    gl.shadowMap.type = THREE.PCFShadowMap;
  }, [gl]);
  const firstFrame = useRef(false);
  useFrame(() => {
    if (!firstFrame.current) {
      firstFrame.current = true;
      props.onReady?.();
    }
  });
  // house lights → one soft down-light + ambient share; bounce → ambient
  const house = useMemo(() => {
    if (!sc) return { down: 0, amb: 0, fabric: 0 };
    const hs = sc.srcs.filter((s) => s.kind === 'house');
    let E = 0;
    const pts = [[30, 25], [60, 47], [90, 70], [30, 70], [90, 25]];
    for (const [x, y] of pts) {
      for (const s of hs) {
        const dx = x * FTm - s.p[0], dy = y * FTm - s.p[1], dz = 0 - s.p[2];
        const d2 = dx * dx + dy * dy + dz * dz, d = Math.sqrt(d2);
        const cosT = -dz / d;
        const t = Math.acos(Math.min(1, cosT));
        E += (s.I0 * Math.exp(-t * t * s.a) * cosT) / d2;
      }
    }
    E /= pts.length;
    const fab = sc.srcs.filter((s) => s.kind === 'fabric');
    const fabricL = fab.length ? fab.reduce((a, s) => a + s.I0, 0) / fab.length / 3.34 : 0;
    return { down: E, amb: E * 0.32, fabric: fabricL };
  }, [sc]);
  useEffect(() => {
    const m = mats().fabricSheer as THREE.MeshPhysicalMaterial;
    // the sheer is also lit directly by the spots, so only the transmitted share glows
    m.emissiveIntensity = house.fabric * 0.3;
  }, [house.fabric]);
  return (
    <>
      <ambientLight intensity={house.amb + (zoneInd[0] || 0)} color="#fff4e6" />
      <directionalLight position={[20, 40, -10]} intensity={house.down} color="#fff6ee" />
      <Hall3D ceilingFt={project.settings.ceilingFt} stageFt={project.settings.stageHeightFt} houseLevel={project.house.enabled ? project.house.level : 0} houseRows={project.house.rows} houseCols={project.house.cols} />
      <Items3D project={project} ev={{ onSelect: props.onSelect, onHover: props.onHover }} selected={props.selected} />
      <FixtureBodies project={project} selected={props.selected} onSelect={props.onSelect} onHover={props.onHover} />
      <Spots defs={defs} />
      <EmitterLights project={project} />
      {props.beams && <BeamCones defs={defs} />}
      {props.heat && <FloorHeat />}
      {props.people && <People />}
      {props.labels && <Labels />}
      <MirrorEnv />
    </>
  );
}

function FloorHeat() {
  const result = useStore((s) => s.result);
  const tex = useMemo(() => {
    if (!result) return null;
    const g = result.grid;
    const data = new Uint8Array(g.nx * g.ny * 4);
    for (let k = 0; k < g.nx * g.ny; k++) {
      const m = g.mask[k];
      const c = luxColor(g.floor[k]);
      data.set([c[0], c[1], c[2], m === 1 || m === 3 ? 215 : 0], k * 4);
    }
    const t = new THREE.DataTexture(data, g.nx, g.ny, THREE.RGBAFormat);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    return { t, g };
  }, [result]);
  if (!tex) return null;
  const { g } = tex;
  const w = g.nx * g.step, h = g.ny * g.step;
  return (
    <mesh position={W(g.x0 + w / 2, g.y0 + h / 2, 0.06)} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
      <planeGeometry args={[w * FTm, h * FTm]} />
      <meshBasicMaterial map={tex.t} transparent toneMapped={false} depthWrite={false} color={new THREE.Color(40, 40, 40)} />
    </mesh>
  );
}

function NearHtml({ pos, max, children, z = 10 }: { pos: THREE.Vector3 | [number, number, number]; max: number; children: React.ReactNode; z?: number }) {
  const { camera } = useThree();
  const [show, setShow] = useState(true);
  const v = useMemo(() => (Array.isArray(pos) ? new THREE.Vector3(...pos) : pos), [pos]);
  const g = useRef<THREE.Group>(null);
  const t = useRef(0);
  useFrame((st) => {
    if (st.clock.elapsedTime - t.current < 0.4 || !g.current) return;
    t.current = st.clock.elapsedTime;
    const s = camera.position.distanceTo(g.current.getWorldPosition(new THREE.Vector3())) < max;
    if (s !== show) setShow(s);
  });
  return (
    <group ref={g} position={v}>
      <Html center zIndexRange={[z, 0]} style={{ pointerEvents: 'none', display: show ? 'block' : 'none' }}>
        {children}
      </Html>
    </group>
  );
}

function People() {
  const project = useStore((s) => s.project);
  const result = useStore((s) => s.result);
  const select = useStore((s) => s.select);
  const M = mats();
  const clothes = [M.cloth1, M.cloth2, M.cloth3];
  return (
    <>
      {project.probes.map((p, k) => {
        const r = result?.probes.find((q) => q.id === p.id);
        const h = (p.heightFt ?? project.settings.faceHeightFt) / 5.25;
        const onStage = false;
        return (
          <group key={p.id} position={W(p.x, p.y, onStage ? 3.5 : 0)} rotation={[0, p.facing * DEG, 0]} scale={[h, h, h]} onClick={(e) => { e.stopPropagation(); select(p.id); }}>
            {/* legs */}
            <mesh position={[0, 0.42, 0.09]} castShadow>
              <capsuleGeometry args={[0.07, 0.7, 4, 8]} />
              <primitive object={M.cloth2} attach="material" />
            </mesh>
            <mesh position={[0, 0.42, -0.09]} castShadow>
              <capsuleGeometry args={[0.07, 0.7, 4, 8]} />
              <primitive object={M.cloth2} attach="material" />
            </mesh>
            {/* torso */}
            <mesh position={[0, 1.15, 0]} castShadow>
              <capsuleGeometry args={[0.17, 0.42, 6, 12]} />
              <primitive object={clothes[k % 3]} attach="material" />
            </mesh>
            {/* arms */}
            <mesh position={[0.02, 1.08, 0.24]} rotation={[0.08, 0, 0]} castShadow>
              <capsuleGeometry args={[0.05, 0.5, 4, 8]} />
              <primitive object={clothes[k % 3]} attach="material" />
            </mesh>
            <mesh position={[0.02, 1.08, -0.24]} rotation={[-0.08, 0, 0]} castShadow>
              <capsuleGeometry args={[0.05, 0.5, 4, 8]} />
              <primitive object={clothes[k % 3]} attach="material" />
            </mesh>
            {/* head: face toward +X (facing) */}
            <mesh position={[0, 1.6, 0]} castShadow>
              <sphereGeometry args={[0.105, 20, 16]} />
              <primitive object={M.skin} attach="material" />
            </mesh>
            <mesh position={[-0.025, 1.66, 0]} scale={[0.9, 0.7, 1]}>
              <sphereGeometry args={[0.105, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <primitive object={M.hair} attach="material" />
            </mesh>
            {r && (
              <NearHtml pos={[0, 1.95, 0]} max={10} z={20}>
                <div className="face-tag" style={{ background: VERDICT_COLOR[r.verdict] }}>
                  {fmtLux(r.face)} lx · ISO {r.iso > 6400 ? '6400+' : Math.round(r.iso)}
                </div>
              </NearHtml>
            )}
          </group>
        );
      })}
    </>
  );
}

function Labels() {
  const project = useStore((s) => s.project);
  const anchors = useMemo(() => {
    const out: { key: string; text: string; sub?: string; pos: THREE.Vector3; sec: boolean }[] = [];
    const seen = new Set<string>();
    for (const it of project.items) {
      if (it.hidden) continue;
      const main = ['mapDeck', 'lwall', 'house', 'stambh', 'centerpiece', 'booth', 'zoneArea'].includes(it.type) || it.id === 'lotusN';
      if (!main) continue;
      const zoneSec = it.type === 'booth' && it.params?.zone && SECTION_MAP[it.section]?.num;
      const key = (it.type === 'booth' && !zoneSec) || it.type === 'centerpiece' ? it.id : it.section;
      if (seen.has(key)) continue;
      seen.add(key);
      const pts = it.points ? absPts(it) : itemFootprint(it);
      const c = pts.reduce((a, p) => ({ x: a.x + p.x / pts.length, y: a.y + p.y / pts.length }), { x: 0, y: 0 });
      const s = SECTION_MAP[it.section];
      const isSec = !!s?.num && (it.type !== 'booth' || !!zoneSec) && it.type !== 'centerpiece';
      out.push({ key, text: isSec ? `${s.num} · ${s.title}` : it.name, sub: isSec ? s.sub : undefined, pos: W(c.x, c.y, it.type === 'booth' ? 7 : 12.5), sec: isSec });
    }
    return out;
  }, [project.items]);
  return (
    <>
      {anchors.map((a) => (
        <NearHtml key={a.key} pos={a.pos} max={a.sec ? 24 : 12}>
          <div className={`label3d ${a.sec ? 'sec' : ''}`}>{a.text}</div>
        </NearHtml>
      ))}
    </>
  );
}

/** reflective mirrors: one cube-camera capture of the Beliefs room */
function MirrorEnv() {
  const { gl, scene } = useThree();
  const done = useRef(false);
  const rt = useMemo(() => new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType }), []);
  const camRef = useRef<THREE.CubeCamera>(null);
  useFrame(() => {
    if (done.current || !camRef.current) return;
    done.current = true;
    camRef.current.update(gl, scene);
    const m = mats().mirror as THREE.MeshStandardMaterial;
    m.envMap = rt.texture;
    m.envMapIntensity = 1;
    m.needsUpdate = true;
  });
  return <cubeCamera ref={camRef} args={[0.1, 60, rt]} position={W(100, 55, 5)} />;
}

/** Matrix metering like a phone camera: sample a grid of points in view, estimate each one's luminance
 *  (illuminance on the real surface normal × its reflectance), expose the log-average to mid-grey and pull
 *  exposure down if the brightest tenth would clip. */
function Metering({ sc, zoneInd, mode, onMeter }: { sc: CalcScene | null; zoneInd: number[]; mode: ExpMode; onMeter: (m: { E: number; iso: number; m: number }) => void }) {
  const { camera, scene } = useThree();
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const last = useRef(0);
  const adapt = useRef(150);
  const grid = useMemo(() => {
    const g: [number, number, number][] = [[0, 0, 3]];
    for (const x of [-0.6, -0.2, 0.2, 0.6]) for (const y of [-0.5, 0, 0.5]) g.push([x, y, Math.abs(x) < 0.3 && Math.abs(y) < 0.3 ? 1.6 : 1]);
    return g;
  }, []);
  useFrame((st) => {
    if (!sc || mode === 'manual') return;
    const t = st.clock.elapsedTime;
    if (t - last.current < 0.45) return;
    last.current = t;
    ray.far = 80;
    const samples: { Y: number; w: number }[] = [];
    for (const [gx, gy, w] of grid) {
      ray.setFromCamera(new THREE.Vector2(gx, gy), camera);
      const hit = ray.intersectObjects(scene.children, true).find((h) => {
        const m = (h.object as THREE.Mesh).material as any;
        return (h.object as any).isMesh && m && !m.transparent && !(m.emissiveIntensity > 50) && !(h.object as any).isPoints;
      });
      if (!hit) continue;
      const mat = (hit.object as THREE.Mesh).material as THREE.MeshStandardMaterial;
      const n = hit.face?.normal ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
      if (n.dot(ray.ray.direction) > 0) n.negate();
      const p = hit.point.clone().addScaledVector(n, 0.05);
      const x = p.x / FTm, y = -p.z / FTm, z = Math.max(0.05, p.y / FTm);
      const az = Math.atan2(-n.z, n.x) / DEG;
      const r = evalProbe(sc, zoneInd, { id: 'm', name: 'm', x, y, facing: az, heightFt: z });
      const E = Math.abs(n.y) > 0.7 ? (n.y > 0 ? r.top : r.floor) : r.face;
      const c = mat.color ? 0.2126 * mat.color.r + 0.7152 * mat.color.g + 0.0722 * mat.color.b : 0.5;
      const rho = Math.min(0.9, Math.max(0.03, c * (mat.map ? 0.62 : 1)));
      samples.push({ Y: Math.max(0.05, E * rho), w });
    }
    let E = 120;
    if (samples.length) {
      const sw = samples.reduce((a, s) => a + s.w, 0);
      const logAvg = Math.exp(samples.reduce((a, s) => a + s.w * Math.log(s.Y), 0) / sw);
      const sorted = samples.map((s) => s.Y).sort((a, b) => a - b);
      const p90 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))];
      E = Math.max(0.5, logAvg / 0.18, p90 / 0.95);
    }
    if (mode === 'phone') {
      const isoNeed = 48600 / E;
      const iso = Math.max(50, Math.min(3200, isoNeed));
      onMeter({ E, iso, m: Math.PI / Math.max(E, 48600 / 3200) });
    } else {
      const target = Math.pow(E, 0.65) * Math.pow(120, 0.35);
      adapt.current += (target - adapt.current) * 0.5;
      onMeter({ E, iso: 0, m: Math.PI / adapt.current });
    }
  });
  return null;
}

function OrbitRig({ preset }: { preset: string }) {
  const ctl = useRef<any>(null);
  const { camera } = useThree();
  const focus = useStore((s) => s.focus3d);
  const tgt = useMemo(() => W(...(PRESETS[preset] || PRESETS.entrance).tgt), [preset]);
  useEffect(() => {
    const p = PRESETS[preset];
    if (!p) return;
    camera.position.copy(W(...p.pos));
    camera.lookAt(tgt);
    const id = requestAnimationFrame(() => {
      ctl.current?.target.copy(tgt);
      ctl.current?.update();
    });
    return () => cancelAnimationFrame(id);
  }, [preset, camera, tgt]);
  useEffect(() => {
    if (!focus) return;
    ctl.current?.target.copy(W(focus.x, focus.y, focus.z));
    camera.position.copy(W(focus.x, focus.y - 22, focus.z + 10));
    ctl.current?.update();
  }, [focus, camera]);
  return <OrbitControls ref={ctl} makeDefault enableDamping dampingFactor={0.08} maxPolarAngle={Math.PI * 0.495} minDistance={0.5} maxDistance={70} target={tgt} />;
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
    const sp = (k.ShiftLeft || k.ShiftRight ? 3.2 : 1.4) * dt;
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
