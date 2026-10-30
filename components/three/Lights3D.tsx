'use client';
import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import type { Item, Project } from '@/lib/types';
import type { Scene as CalcScene, Src } from '@/lib/engine';
import { itemEmitters } from '@/lib/catalog';
import { resolveModel } from '@/lib/fixtures';
import { fixtureWorld, drapeHang, DRAPE_DROP_FT } from '@/lib/rig';
import { W, FTm, mats, luminanceY } from './materials';

RectAreaLightUniformsLib.init();

interface SpotDef {
  id: string;
  pos: THREE.Vector3;
  target: THREE.Vector3;
  color: THREE.Color;
  intensity: number;
  angle: number;
  penumbra: number;
  shadow: boolean;
  lm: number;
}

export function useSpotDefs(project: Project, sc: CalcScene | null, quality: 'high' | 'low', shadowBudget = 4) {
  return useMemo(() => {
    if (!sc) return [] as SpotDef[];
    const byRef = new Map<string, Src[]>();
    for (const s of sc.srcs) if (s.kind === 'fixture') byRef.set(s.ref, [...(byRef.get(s.ref) || []), s]);
    const houses = project.items.filter((i) => i.type === 'house' && !i.hidden);
    const defs: SpotDef[] = [];
    for (const [ref, ss] of byRef) {
      const s0 = ss[0];
      const I0 = ss.reduce((a, s) => a + s.I0, 0);
      const lm = ss.reduce((a, s) => a + s.lm, 0);
      if (lm < 1) continue;
      const p = ss.reduce((a, s) => [a[0] + s.p[0] / ss.length, a[1] + s.p[1] / ss.length, a[2] + s.p[2] / ss.length], [0, 0, 0]);
      const pos = new THREE.Vector3(p[0], p[2], -p[1]);
      const dir = new THREE.Vector3(s0.d[0], s0.d[2], -s0.d[1]);
      let angle: number, penumbra: number;
      if (s0.prof === 0) {
        const sig = Math.sqrt(1 / (2 * s0.a));
        angle = Math.min(1.45, sig * 2.6);
        penumbra = 0.95;
      } else if (s0.prof === 1) {
        angle = Math.min(1.45, s0.b);
        penumbra = Math.max(0.05, (s0.b - s0.a) / s0.b);
      } else {
        angle = 1.4;
        penumbra = 1;
      }
      // light shining down through a sheer house ceiling loses ~ (1 - τ·0.7)
      let atten = 1;
      for (const h of houses) {
        const tau = (h.params.tau ?? 0.55) * 0.7;
        const aimX = p[0] / FTm + s0.d[0] * 10, aimY = p[1] / FTm + s0.d[1] * 10;
        if (p[2] / FTm > (h.params.h ?? 8) && Math.abs(aimX - h.x) < 14 && Math.abs(aimY - h.y) < 14 && s0.d[2] < -0.2) atten = tau;
      }
      const Y = luminanceY(s0.rgb);
      defs.push({ id: ref, pos, target: pos.clone().add(dir.multiplyScalar(5)), color: new THREE.Color(s0.rgb[0], s0.rgb[1], s0.rgb[2]), intensity: ((I0 * atten) / Y) * 0.94, angle, penumbra, shadow: false, lm });
    }
    // each shadow-casting spot costs ~2 texture units; keep within the GPU's per-shader limit
    const n = quality === 'high' ? shadowBudget : 0;
    [...defs].sort((a, b) => b.lm - a.lm).slice(0, n).forEach((d) => (d.shadow = true));
    return defs;
  }, [project, sc, quality, shadowBudget]);
}

export function Spots({ defs }: { defs: SpotDef[] }) {
  return (
    <>
      {defs.map((d) => (
        <Spot key={d.id} d={d} />
      ))}
    </>
  );
}
function Spot({ d }: { d: SpotDef }) {
  const ref = useRef<THREE.SpotLight>(null);
  const { scene } = useThree();
  useEffect(() => {
    const l = ref.current;
    if (!l) return;
    l.target.position.copy(d.target);
    scene.add(l.target);
    l.target.updateMatrixWorld();
    return () => {
      scene.remove(l.target);
    };
  }, [d.target, scene]);
  return (
    <spotLight
      ref={ref}
      position={d.pos}
      color={d.color}
      intensity={d.intensity}
      angle={d.angle}
      penumbra={d.penumbra}
      decay={2}
      distance={0}
      castShadow={d.shadow}
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
      shadow-bias={-0.0003}
      shadow-normalBias={0.02}
      shadow-camera-near={0.2}
      shadow-camera-far={45}
    />
  );
}

/** Self-lit emitters: dioramas/screens as rect area lights; lamps & divos as point lights */
export function EmitterLights({ project }: { project: Project }) {
  const ems = useMemo(() => project.items.filter((i) => !i.hidden).flatMap((i) => itemEmitters(i)), [project.items]);
  return (
    <>
      {ems.map((e) => {
        const Y = luminanceY(e.rgb);
        const col = new THREE.Color(e.rgb[0], e.rgb[1], e.rgb[2]);
        if (!e.n) {
          return <pointLight key={e.id} position={W(e.c.x, e.c.y, e.c.z)} color={col} intensity={(e.lumens || 100) / (4 * Math.PI) / Y} decay={2} distance={0} />;
        }
        const side = Math.sqrt(e.areaFt2) * FTm;
        return <RectLight key={e.id} pos={W(e.c.x + e.n.x * 0.1, e.c.y + e.n.y * 0.1, e.c.z + e.n.z * 0.1)} n={new THREE.Vector3(e.n.x, e.n.z, -e.n.y)} w={side * 1.1} h={side * 0.9} color={col} nits={(e.nits || 100) / Y} />;
      })}
    </>
  );
}
function RectLight({ pos, n, w, h, color, nits }: { pos: THREE.Vector3; n: THREE.Vector3; w: number; h: number; color: THREE.Color; nits: number }) {
  const ref = useRef<THREE.RectAreaLight>(null);
  useEffect(() => {
    ref.current?.lookAt(pos.clone().add(n));
  }, [pos, n]);
  return <rectAreaLight ref={ref} position={pos} width={w} height={h} color={color} intensity={nits} />;
}

/** Fixture bodies: par cans, COBs with barn doors, bars, profiles, fresnels, floods */
export function FixtureBodies({ project, selected, onSelect, onHover }: { project: Project; selected: string | null; onSelect: (id: string) => void; onHover: (id: string | null, name?: string, e?: any) => void }) {
  const byId = useMemo(() => new Map(project.items.map((i) => [i.id, i])), [project.items]);
  return (
    <>
      {project.items
        .filter((i) => i.type === 'fixture' && !i.hidden)
        .map((f) => (
          <FixtureBody key={f.id} f={f} byId={byId} project={project} sel={selected === f.id} onSelect={onSelect} onHover={onHover} />
        ))}
    </>
  );
}
function FixtureBody({ f, byId, project, sel, onSelect, onHover }: { f: Item; byId: Map<string, Item>; project: Project; sel: boolean; onSelect: (id: string) => void; onHover: (id: string | null, name?: string, e?: any) => void }) {
  const ref = useRef<THREE.Group>(null);
  const m = resolveModel(f.params.model, project.artSpotVariant);
  const pos = fixtureWorld(f, byId);
  const aim = f.params.aim || { x: pos.x, y: pos.y + 5, z: 0 };
  const P = W(pos.x, pos.y, pos.z);
  const A = W(aim.x, aim.y, aim.z);
  useEffect(() => {
    ref.current?.lookAt(A);
  }, [A.x, A.y, A.z, P.x, P.y, P.z]);
  const ch: Record<string, number> = {};
  let r = 0, g = 0, b = 0, lm = 0;
  for (const c of m.channels) {
    const lv = (f.params.ch ? f.params.ch[c.key] ?? 0 : m.defaultCh[c.key] ?? 0) * (f.params.dim ?? 1);
    ch[c.key] = lv;
    r += c.rgb[0] * lv * c.lm;
    g += c.rgb[1] * lv * c.lm;
    b += c.rgb[2] * lv * c.lm;
    lm += lv * c.lm;
  }
  const mx = Math.max(r, g, b) || 1;
  const lens = new THREE.Color(r / mx, g / mx, b / mx);
  const glow = Math.min(9000, 300 + lm * 3);
  const M = mats();
  const body = m.body;
  const dims = { w: m.sizeIn.w * 0.0254, h: m.sizeIn.h * 0.0254, d: m.sizeIn.d * 0.0254 };
  const bodyMat = <meshStandardMaterial color={sel ? '#3a2a20' : '#151515'} metalness={0.5} roughness={0.45} />;
  const run = f.params.rig ? byId.get(f.params.rig) : undefined;
  const hang = run && run.type === 'drape' ? drapeHang(f, run) : null;
  return (
    <group position={P} onClick={(e) => { e.stopPropagation(); onSelect(f.id); }} onPointerOver={(e) => { e.stopPropagation(); onHover(f.id, f.name, e); }} onPointerOut={() => onHover(null)}>
      {hang && <SideArm from={W(hang.pipe.x, hang.pipe.y, pos.z + DRAPE_DROP_FT - 0.08)} to={P} />}
      <group ref={ref}>
        {/* local +Z points at the aim */}
        {body === 'bar' ? (
          <>
            <mesh position={[0, 0, -dims.d / 2]} castShadow>
              <boxGeometry args={[dims.w, dims.h, dims.d]} />
              {bodyMat}
            </mesh>
            <mesh position={[0, 0, 0.002]}>
              <planeGeometry args={[dims.w * 0.92, dims.h * 0.5]} />
              <meshStandardMaterial color="#000" emissive={lens} emissiveIntensity={glow} />
            </mesh>
          </>
        ) : body === 'flood' || body === 'uplight' ? (
          <>
            <mesh position={[0, 0, -dims.d / 2]} castShadow>
              <boxGeometry args={[dims.w, dims.h, dims.d]} />
              {bodyMat}
            </mesh>
            <mesh position={[0, 0, 0.002]}>
              <planeGeometry args={[dims.w * 0.8, dims.h * 0.7]} />
              <meshStandardMaterial color="#000" emissive={body === 'flood' ? new THREE.Color('#7a3cff') : lens} emissiveIntensity={body === 'flood' ? 600 : glow} />
            </mesh>
          </>
        ) : body === 'fresnel' ? (
          <>
            <mesh position={[0, 0, -dims.d / 2]} castShadow>
              <boxGeometry args={[dims.w, dims.h, dims.d]} />
              {bodyMat}
            </mesh>
            <mesh position={[0, 0, 0.003]}>
              <circleGeometry args={[dims.w * 0.38, 28]} />
              <meshStandardMaterial color="#000" emissive={lens} emissiveIntensity={glow * 0.6} />
            </mesh>
            <BarnDoors s={dims.w} />
          </>
        ) : body === 'leko' ? (
          <>
            <mesh position={[0, 0, -dims.d * 0.75]} castShadow>
              <boxGeometry args={[dims.w * 1.2, dims.w * 1.3, dims.d * 0.5]} />
              {bodyMat}
            </mesh>
            <mesh position={[0, 0, -dims.d * 0.25]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[dims.w * 0.45, dims.w * 0.5, dims.d * 0.5, 24]} />
              {bodyMat}
            </mesh>
            <mesh position={[0, 0, 0.002]}>
              <circleGeometry args={[dims.w * 0.42, 24]} />
              <meshStandardMaterial color="#000" emissive={lens} emissiveIntensity={glow} />
            </mesh>
          </>
        ) : (
          <>
            <mesh position={[0, 0, -dims.d / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[dims.w * 0.5, dims.w * 0.45, dims.d, 24]} />
              {bodyMat}
            </mesh>
            <mesh position={[0, 0, 0.004]}>
              <circleGeometry args={[dims.w * 0.42, 24]} />
              <meshStandardMaterial color="#000" emissive={lens} emissiveIntensity={glow} />
            </mesh>
            {m.barnDoors && <BarnDoors s={dims.w} />}
          </>
        )}
        {/* yoke */}
        <mesh position={[0, dims.h * 0.62, -dims.d * 0.45]}>
          <boxGeometry args={[dims.w * 1.15, 0.012, 0.03]} />
          <primitive object={M.black} attach="material" />
        </mesh>
      </group>
    </group>
  );
}
/** Side arm + clamp from the drape light pipe out to the hanging fixture's yoke (in the fixture group's frame) */
function SideArm({ from, to }: { from: THREE.Vector3; to: THREE.Vector3 }) {
  const d = from.clone().sub(to); // pipe point relative to the lens
  const top = new THREE.Vector3(0, d.y, 0);
  const horiz = new THREE.Vector3(d.x, 0, d.z);
  const len = horiz.length();
  const yaw = Math.atan2(-d.z, d.x);
  return (
    <group>
      <mesh position={[d.x / 2, d.y, d.z / 2]} rotation={[0, yaw, Math.PI / 2]}>
        <cylinderGeometry args={[0.011, 0.011, len, 8]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[d.x, d.y, d.z]}>
        <boxGeometry args={[0.07, 0.08, 0.07]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, top.y / 2 + 0.04, 0]}>
        <cylinderGeometry args={[0.009, 0.009, Math.max(0.02, top.y - 0.08), 8]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}
function BarnDoors({ s }: { s: number }) {
  return (
    <>
      {[0, 1, 2, 3].map((k) => (
        <mesh key={k} position={[k === 0 ? s * 0.55 : k === 1 ? -s * 0.55 : 0, k === 2 ? s * 0.55 : k === 3 ? -s * 0.55 : 0, s * 0.18]} rotation={[k === 2 ? -0.6 : k === 3 ? 0.6 : 0, k === 0 ? 0.6 : k === 1 ? -0.6 : 0, 0]}>
          <boxGeometry args={[k < 2 ? 0.004 : s * 0.9, k < 2 ? s * 0.9 : 0.004, s * 0.36]} />
          <meshStandardMaterial color="#111" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
    </>
  );
}

/** Volumetric-ish beam cones (as if there were light haze) */
export function BeamCones({ defs }: { defs: SpotDef[] }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uColor: { value: new THREE.Color(1, 1, 1) }, uStr: { value: 0.1 } },
        vertexShader: `varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = uv.y; vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
        fragmentShader: `uniform vec3 uColor; uniform float uStr; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float edge = pow(abs(dot(vN, vV)), 1.6); float fall = pow(vY, 1.4); gl_FragColor = vec4(uColor * uStr * edge * fall, 1.0); }`,
      }),
    [],
  );
  return (
    <>
      {defs.map((d) => {
        const dir = d.target.clone().sub(d.pos).normalize();
        const len = Math.min(9, d.pos.y / Math.max(0.15, -dir.y) || 6);
        const r = Math.tan(d.angle * 0.75) * len;
        const m = mat.clone();
        m.uniforms.uColor.value = d.color.clone();
        m.uniforms.uStr.value = Math.min(0.35, d.lm / 9000) * 0.6;
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
        const c = d.pos.clone().add(dir.clone().multiplyScalar(len / 2));
        return (
          <mesh key={d.id} position={c} quaternion={q} material={m} renderOrder={10}>
            <cylinderGeometry args={[0.02, r, len, 32, 1, true]} />
          </mesh>
        );
      })}
    </>
  );
}
