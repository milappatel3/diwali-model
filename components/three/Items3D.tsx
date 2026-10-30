'use client';
import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { Item, Project, Surface } from '@/lib/types';
import { itemSolids, itemSurfaces, itemEmitters, params as P, absPts, drapeCounts, drapeUprights, stanchionCount } from '@/lib/catalog';
import { mats, W, FTm, yawRad } from './materials';
import { posterTex, bannerTex, samskaraTex, introPanelTex, signTex, indiaTex, dioramaTex, tvTex, kioskTex, lotusWallTex, bayTex, INDIA } from './textures';
import { alongPath } from '../plan/PlanView';
import { NODES } from '@/lib/content';
import { HouseDressing } from './House3D';

type Ev = { onSelect: (id: string) => void; onHover: (id: string | null, name?: string, e?: any) => void };

export function Items3D({ project, ev, selected }: { project: Project; ev: Ev; selected: string | null }) {
  return (
    <group>
      {project.items.map((it) => (it.hidden || it.type === 'fixture' ? null : <ItemNode key={it.id} it={it} ev={ev} sel={selected === it.id} />))}
    </group>
  );
}

const ItemNode = React.memo(function ItemNode({ it, ev, sel }: { it: Item; ev: Ev; sel: boolean }) {
  const handlers = {
    onClick: (e: any) => {
      e.stopPropagation();
      ev.onSelect(it.id);
    },
    onPointerOver: (e: any) => {
      e.stopPropagation();
      ev.onHover(it.id, it.name, e);
    },
    onPointerOut: () => ev.onHover(null),
  };
  let body: React.ReactNode = null;
  switch (it.type) {
    case 'drape':
      body = <Drape it={it} />;
      break;
    case 'stanchions':
      body = <Stanchions it={it} />;
      break;
    case 'lilyPath':
      body = <LilyPads it={it} />;
      break;
    case 'tbar':
    case 'crank':
    case 'pipebar':
      body = <Stand it={it} />;
      break;
    case 'zoneArea':
      body = null;
      break;
    case 'floorMark':
      body = <FloorMark it={it} />;
      break;
    case 'booth':
      body = it.params?.zone ? null : <BoothTape it={it} />;
      break;
    default:
      body = (
        <>
          <Solids it={it} />
          <Surfaces it={it} />
          <Extras it={it} />
        </>
      );
  }
  return (
    <group {...handlers} userData={{ itemId: it.id }}>
      {body}
      {sel && <SelectionBox it={it} />}
    </group>
  );
});

function SelectionBox({ it }: { it: Item }) {
  const box = useMemo(() => {
    const ss = itemSolids(it);
    const b = new THREE.Box3();
    if (ss.length) for (const s of ss) b.expandByPoint(W(s.c.x, s.c.y, s.c.z + s.s.z / 2)).expandByPoint(W(s.c.x, s.c.y, s.c.z - s.s.z / 2)).expandByPoint(W(s.c.x + s.s.x / 2, s.c.y + s.s.y / 2, s.c.z)).expandByPoint(W(s.c.x - s.s.x / 2, s.c.y - s.s.y / 2, s.c.z));
    else {
      const pts = it.points ? absPts(it) : [{ x: it.x, y: it.y }];
      for (const p of pts) b.expandByPoint(W(p.x, p.y, 0)).expandByPoint(W(p.x, p.y, P(it).h || 8));
    }
    return b;
  }, [it]);
  return <box3Helper args={[box, new THREE.Color('#d69e7a')]} />;
}

function Solids({ it }: { it: Item }) {
  const M = mats();
  const solids = useMemo(() => itemSolids(it), [it]);
  return (
    <>
      {solids.map((s, k) => {
        if (s.vis === false) return null;
        if (s.mat === 'fabricSheer') return <FabricCeiling key={k} s={s} it={it} />;
        if (it.type === 'mirrors' && s.mat === 'gold') return <Mirror key={k} s={s} />;
        const m = M[s.mat] || M.mdf;
        return (
          <mesh key={k} position={W(s.c.x, s.c.y, s.c.z)} rotation={[0, yawRad(s.yaw), 0]} castShadow={s.shadow !== false && !s.tau} receiveShadow>
            <boxGeometry args={[s.s.x * FTm, s.s.z * FTm, s.s.y * FTm]} />
            <primitive object={m} attach="material" />
          </mesh>
        );
      })}
    </>
  );
}

function Mirror({ s }: { s: { c: any; s: any; yaw: number } }) {
  const M = mats();
  return (
    <group position={W(s.c.x, s.c.y, s.c.z)} rotation={[0, yawRad(s.yaw), 0]}>
      <mesh castShadow>
        <boxGeometry args={[s.s.x * FTm, s.s.z * FTm, s.s.y * FTm * 0.6]} />
        <primitive object={M.gold} attach="material" />
      </mesh>
      <mesh position={[0, 0, (s.s.y * FTm) / 2]}>
        <planeGeometry args={[(s.s.x - 0.35) * FTm, (s.s.z - 0.35) * FTm]} />
        <primitive object={M.mirror} attach="material" />
      </mesh>
    </group>
  );
}

function FabricCeiling({ s }: { s: any; it: Item }) {
  const M = mats();
  // gently sagging sheer
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(s.s.x * FTm, s.s.y * FTm, 24, 24);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / ((s.s.x * FTm) / 2), y = pos.getY(i) / ((s.s.y * FTm) / 2);
      pos.setZ(i, -0.16 * (1 - x * x) * (1 - y * y) - 0.03 * Math.sin(x * 9) * (1 - y * y));
    }
    g.computeVertexNormals();
    return g;
  }, [s]);
  return (
    <mesh geometry={geo} position={W(s.c.x, s.c.y, s.c.z + 0.05)} rotation={[-Math.PI / 2, 0, yawRad(s.yaw)]} renderOrder={5}>
      <primitive object={M.fabricSheer} attach="material" />
    </mesh>
  );
}

// ——— textured surfaces ———
function surfaceArt(it: Item, sf: Surface): { map?: THREE.Texture; emissive?: number } | null {
  const p = P(it);
  const key = sf.id.split(':')[1];
  switch (it.type) {
    case 'lwall':
      if (key === 'intro') return { map: introPanelTex() };
      return { map: samskaraTex(parseInt(key.slice(1)) - 1) };
    case 'poster':
      return { map: posterTex(p.title, '', 'cream', p.w, p.h, it.id.length) };
    case 'posterStand':
      return { map: posterTex(p.title, it.section === 's4' ? NODES.find((n) => p.title.includes(n.title))?.sub || '' : '', p.style || 'cream', p.w, p.h, it.id.length) };
    case 'banner':
      return { map: bannerTex(p.title, p.sub, p.style, p.w, p.h) };
    case 'signStand':
      return { map: signTex(p.num, p.title) };
    case 'diorama':
      return { map: dioramaTex(p.art), emissive: p.nits };
    case 'pillars':
      if (key.startsWith('bay')) return { map: bayTex(parseInt(key.slice(3))), emissive: p.nits };
      return null;
    case 'tvArch':
      return { map: posterTex('What happens after this life?', 'Punarjanma — the eternal soul’s journey', 'night', 2.4, 7) };
    case 'stambh':
      if (key.startsWith('bay')) return { map: bayTex(p.kind), emissive: p.nits };
      return null;
    case 'house':
      if (key === 'mandir' || key === 'counter') return null;
      return { map: posterTex(sf.name.replace(' poster', ''), 'Hindu Way of Life', 'cream', 2, 3) };
    default:
      return null;
  }
}

function Surfaces({ it }: { it: Item }) {
  const surfaces = useMemo(() => itemSurfaces(it), [it]);
  const p = P(it);
  if (it.type === 'nailWall') {
    const c = W(it.x + Math.cos(yawRad(it.rot)) * (p.d / 2 + 0.03), it.y + Math.sin(yawRad(it.rot)) * (p.d / 2 + 0.03), p.h / 2);
    return (
      <mesh position={c} rotation={[0, yawRad(it.rot) + Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[p.w * FTm, p.h * FTm]} />
        <meshStandardMaterial map={lotusWallTex()} roughness={0.75} />
      </mesh>
    );
  }
  return (
    <>
      {surfaces.map((sf) => {
        const art = surfaceArt(it, sf);
        if (!art) return null;
        return <SurfacePlane key={sf.id} sf={sf} art={art} />;
      })}
      {it.type === 'mapDeck' && <IndiaMap it={it} />}
      {(it.type === 'tvArch' || it.type === 'kiosk' || it.type === 'tvStand') && <ScreenPlanes it={it} />}
    </>
  );
}

function SurfacePlane({ sf, art }: { sf: Surface; art: { map?: THREE.Texture; emissive?: number } }) {
  const ref = React.useRef<THREE.Mesh>(null);
  const pos = W(sf.c.x + sf.n.x * 0.015, sf.c.y + sf.n.y * 0.015, sf.c.z + sf.n.z * 0.015);
  React.useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    m.up.set(sf.up.x, sf.up.z, -sf.up.y);
    m.lookAt(pos.clone().add(new THREE.Vector3(sf.n.x, sf.n.z, -sf.n.y)));
  });
  return (
    <mesh ref={ref} position={pos} receiveShadow>
      <planeGeometry args={[sf.w * FTm, sf.h * FTm]} />
      <meshStandardMaterial map={art.map} roughness={0.7} emissive={art.emissive ? '#ffffff' : '#000000'} emissiveMap={art.emissive ? art.map : null} emissiveIntensity={art.emissive ? art.emissive * 0.55 : 0} toneMapped />
    </mesh>
  );
}

function ScreenPlanes({ it }: { it: Item }) {
  const em = itemEmitters(it)[0];
  if (!em || !em.n) return null;
  const isTv = it.type === 'tvArch' || (it.type === 'tvStand' && P(it).screen !== 'ripple');
  const w = it.type === 'tvStand' ? P(it).w - 0.3 : isTv ? 5.3 : 3.8;
  const h = it.type === 'tvStand' ? (P(it).w * 9) / 16 - 0.3 : isTv ? 3.0 : 2.15;
  const pos = W(em.c.x + em.n.x * 0.03, em.c.y + em.n.y * 0.03, em.c.z + em.n.z * 0.03);
  return (
    <ScreenPlane pos={pos} n={em.n} w={w} h={h} map={isTv ? tvTex() : kioskTex()} nits={em.nits || 300} />
  );
}
function ScreenPlane({ pos, n, w, h, map, nits }: { pos: THREE.Vector3; n: { x: number; y: number; z: number }; w: number; h: number; map: THREE.Texture; nits: number }) {
  const ref = React.useRef<THREE.Mesh>(null);
  React.useLayoutEffect(() => {
    ref.current?.lookAt(pos.clone().add(new THREE.Vector3(n.x, n.z, -n.y)));
  });
  return (
    <mesh ref={ref} position={pos}>
      <planeGeometry args={[w * FTm, h * FTm]} />
      <meshStandardMaterial color="#000000" roughness={0.15} emissive="#ffffff" emissiveMap={map} emissiveIntensity={nits} />
    </mesh>
  );
}

function IndiaMap({ it }: { it: Item }) {
  const p = P(it);
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const S = (p.w - 2.6) * FTm;
    INDIA.forEach(([x, y], i) => (i ? s.lineTo(x * S * 0.9, y * S * 0.9) : s.moveTo(x * S * 0.9, y * S * 0.9)));
    return s;
  }, [p.w]);
  const S = (p.w - 2.6) * FTm;
  const tex = indiaTex();
  const geo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 1 });
    // planar UVs over the square
    const pos = g.attributes.position as THREE.BufferAttribute;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = pos.getX(i) / S + 0.5;
      uv[i * 2 + 1] = pos.getY(i) / S + 0.5;
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return g;
  }, [shape, S]);
  const c = W(it.x, it.y, (it.z || 0) + p.h + 0.02);
  return (
    <group position={c} rotation={[-Math.PI / 2, 0, yawRad(it.rot) - Math.PI / 2]}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial map={tex} roughness={0.6} />
      </mesh>
      {/* little festival objects */}
      {[...Array(11)].map((_, k) => {
        const f = [[-0.33, 0.05], [-0.18, -0.12], [0.27, 0.08], [0.14, -0.04], [0.02, 0.22], [-0.12, 0.38], [0, -0.4], [-0.08, -0.43], [-0.12, -0.27], [0.06, -0.22], [0.02, -0.12]][k];
        return (
          <mesh key={k} position={[f[0] * S * 0.9, f[1] * S * 0.9, 0.09]} castShadow>
            {k % 3 === 0 ? <coneGeometry args={[0.06, 0.16, 6]} /> : k % 3 === 1 ? <boxGeometry args={[0.09, 0.09, 0.09]} /> : <cylinderGeometry args={[0.05, 0.06, 0.12, 8]} />}
            <meshStandardMaterial color={['#e2a03f', '#f2994a', '#eb5757', '#d4a017', '#f2c94c', '#bb6bd9', '#6fcf97', '#27ae60', '#9b8cf2', '#56ccf2', '#f06292'][k]} roughness={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}

function Extras({ it }: { it: Item }) {
  const p = P(it);
  if (it.type === 'mapDeck') {
    // divos around the border
    const pts: THREE.Vector3[] = [];
    const n = p.divos || 40;
    for (let k = 0; k < n; k++) {
      const t = k / n, side = Math.floor(t * 4), f = (t * 4) % 1;
      const hw = p.w / 2 - 0.45, hd = p.d / 2 - 0.45;
      const uv = [[-hw + 2 * hw * f, -hd], [hw, -hd + 2 * hd * f], [hw - 2 * hw * f, hd], [-hw, hd - 2 * hd * f]][side];
      const a = yawRad(it.rot - 90);
      const x = it.x + uv[0] * Math.cos(a) - uv[1] * Math.sin(a), y = it.y + uv[0] * Math.sin(a) + uv[1] * Math.cos(a);
      pts.push(W(x, y, p.h + 0.08));
    }
    return (
      <>
        {pts.map((v, k) => (
          <group key={k} position={v}>
            <mesh>
              <cylinderGeometry args={[0.028, 0.022, 0.025, 10]} />
              <meshStandardMaterial color="#b5541c" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.025, 0]}>
              <sphereGeometry args={[0.009, 8, 8]} />
              <meshStandardMaterial color="#000" emissive="#ffb347" emissiveIntensity={1200} />
            </mesh>
          </group>
        ))}
      </>
    );
  }
  if (it.type === 'centerpiece') {
    return (
      <group position={W(it.x, it.y, p.h + 5.5)}>
        <mesh>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial color="#000" emissive="#ffb347" emissiveIntensity={2500} />
        </mesh>
      </group>
    );
  }
  if (it.type === 'fiberTower') {
    return <FiberStrands it={it} />;
  }
  if (it.type === 'house') return <HouseDressing it={it} />;
  if (it.type === 'lwall') return <FlapBoxes it={it} />;
  return null;
}

function FlapBoxes({ it }: { it: Item }) {
  const surfaces = useMemo(() => itemSurfaces(it).filter((s) => /:p\d+$/.test(s.id)), [it]);
  return (
    <>
      {surfaces.map((s) => (
        <mesh key={s.id} position={W(s.c.x + s.n.x * 0.35, s.c.y + s.n.y * 0.35, 3.4)} rotation={[0, Math.atan2(s.n.x, -s.n.y) + Math.PI, 0]} castShadow>
          <boxGeometry args={[1.6 * FTm, 0.8 * FTm, 0.7 * FTm]} />
          <meshStandardMaterial color="#6e1414" roughness={0.6} />
        </mesh>
      ))}
    </>
  );
}

function FiberStrands({ it }: { it: Item }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const N = 900;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const a = yawRad(it.rot);
    const F = { x: Math.cos(a), y: Math.sin(a) };
    let s = 7;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < N; i++) {
      const t = r();
      const spread = 1.5 * (1 - t);
      const u = (r() - 0.5) * 2 * spread, v = (r() - 0.5) * 1.1 * spread;
      const x = it.x + u * F.y + (v - 0.3) * F.x, y = it.y - u * F.x + (v - 0.3) * F.y;
      const p = W(x, y, 2.3 + t * 5);
      pos.set([p.x, p.y, p.z], i * 3);
      const c = [[0.6, 0.7, 1], [1, 0.5, 0.8], [0.6, 1, 0.8], [1, 0.9, 0.6]][i % 4];
      col.set(c, i * 3);
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }, [it]);
  return (
    <points geometry={geo}>
      <pointsMaterial size={0.012} vertexColors sizeAttenuation transparent opacity={0.95} toneMapped={false} color={new THREE.Color(40, 40, 40)} />
    </points>
  );
}

// ——— pipe & drape ———
function Drape({ it }: { it: Item }) {
  const M = mats();
  const p = P(it);
  const pts = absPts(it);
  const mat = p.color === 'ivory' ? M.drapeIvory : p.color === 'maroon' ? M.drapeMaroon : M.drapeBlack;
  const segs = p.closed ? pts.length : pts.length - 1;
  const heavy = !!p.lightPipe;
  const fab = p.valance > 0 ? Math.min(p.valance, p.h - 0.12) : p.h - 0.12;
  const pipeR = heavy ? 0.024 : 0.016;
  const parts: React.ReactNode[] = [];
  for (let i = 0; i < segs; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const L = Math.hypot(b.x - a.x, b.y - a.y);
    if (L < 0.2) continue;
    const yaw = Math.atan2(b.y - a.y, b.x - a.x);
    parts.push(
      <group key={i} position={W((a.x + b.x) / 2, (a.y + b.y) / 2, 0)} rotation={[0, yaw, 0]}>
        <group position={[0, (p.h - 0.12 - fab) * FTm, 0]}>
          <PleatedPanel L={L} h={fab + 0.12} fullness={p.fullness} mat={mat} />
        </group>
        <mesh position={[0, (p.h - 0.08) * FTm, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[pipeR, pipeR, L * FTm, 10]} />
          <meshStandardMaterial color={heavy ? '#5d6166' : '#cfcfcf'} metalness={heavy ? 0.6 : 0.9} roughness={heavy ? 0.45 : 0.25} />
        </mesh>
      </group>,
    );
  }
  const ups = drapeUprights(it);
  const upR = heavy ? 0.032 : 0.02;
  const baseS = heavy ? 0.61 : 0.46;
  return (
    <group>
      {parts}
      {ups.map((u, k) => (
        <group key={k} position={W(u.x, u.y, 0)}>
          <mesh position={[0, (p.h * FTm) / 2, 0]} castShadow>
            <cylinderGeometry args={[upR * 0.8, upR, p.h * FTm, 10]} />
            {heavy ? <meshStandardMaterial color="#9ea3a8" metalness={0.75} roughness={0.35} /> : <primitive object={M.chrome} attach="material" />}
          </mesh>
          <mesh position={[0, 0.008, 0]} receiveShadow>
            <boxGeometry args={[baseS, heavy ? 0.016 : 0.012, baseS]} />
            <primitive object={M.metal} attach="material" />
          </mesh>
          {heavy && (
            <>
              <mesh position={[0, p.h * FTm - 0.03, 0]}>
                <boxGeometry args={[0.07, 0.07, 0.07]} />
                <meshStandardMaterial color="#3a3d40" metalness={0.6} roughness={0.4} />
              </mesh>
              <mesh position={[0.17, 0.07, 0.1]} rotation={[0, 0.4, 0]} castShadow>
                <boxGeometry args={[0.36, 0.11, 0.22]} />
                <meshStandardMaterial color="#6b5a3e" roughness={1} />
              </mesh>
            </>
          )}
        </group>
      ))}
    </group>
  );
}
function PleatedPanel({ L, h, fullness, mat }: { L: number; h: number; fullness: number; mat: THREE.Material }) {
  const geo = useMemo(() => {
    const wM = L * FTm, hM = (h - 0.12) * FTm;
    const pleats = Math.max(4, Math.round(L * 1.1));
    const g = new THREE.PlaneGeometry(wM, hM, pleats * 6, 6);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const amp = 0.035 + fullness * 0.04;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      const t = (y + hM / 2) / hM;
      pos.setZ(i, Math.sin((x / wM) * pleats * Math.PI * 2) * amp * (0.75 + 0.25 * t));
    }
    g.computeVertexNormals();
    return g;
  }, [L, h, fullness]);
  return (
    <mesh geometry={geo} position={[0, ((h - 0.12) * FTm) / 2 + 0.02, 0]} castShadow receiveShadow>
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

function Stanchions({ it }: { it: Item }) {
  const M = mats();
  const pts = absPts(it);
  const posts = alongPath(pts, stanchionCount(it));
  return (
    <group>
      {posts.map((p, k) => (
        <group key={k} position={W(p.x, p.y, 0)}>
          <mesh position={[0, 0.48, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.96, 12]} />
            <primitive object={M.chrome} attach="material" />
          </mesh>
          <mesh position={[0, 0.012, 0]}>
            <cylinderGeometry args={[0.17, 0.17, 0.025, 20]} />
            <primitive object={M.chrome} attach="material" />
          </mesh>
        </group>
      ))}
      {posts.slice(1).map((p, k) => {
        const a = posts[k];
        const L = Math.hypot(p.x - a.x, p.y - a.y);
        return (
          <mesh key={k} position={W((p.x + a.x) / 2, (p.y + a.y) / 2, 3.0)} rotation={[0, Math.atan2(p.y - a.y, p.x - a.x), 0]}>
            <boxGeometry args={[L * FTm, 0.05, 0.004]} />
            <meshStandardMaterial color="#7a1c26" roughness={0.6} />
          </mesh>
        );
      })}
    </group>
  );
}

function LilyPads({ it }: { it: Item }) {
  const p = P(it);
  const pads = alongPath(absPts(it), p.n);
  return (
    <group>
      {pads.map((q, k) => (
        <mesh key={k} position={W(q.x, q.y, 0.02)} rotation={[-Math.PI / 2, 0, k * 0.7]} receiveShadow>
          <circleGeometry args={[p.r * FTm, 28, 0.25, Math.PI * 2 - 0.5]} />
          <meshStandardMaterial color={k % 2 ? '#4f8a3f' : '#5f9a4a'} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function BoothTape({ it }: { it: Item }) {
  const p = P(it);
  const a = yawRad(it.rot);
  const edges: [number, number, number, number][] = [
    [0, -p.d / 2, p.w, 0.25], [0, p.d / 2, p.w, 0.25], [-p.w / 2, 0, 0.25, p.d], [p.w / 2, 0, 0.25, p.d],
  ];
  return (
    <group position={W(it.x, it.y, 0.012)} rotation={[0, a - Math.PI / 2, 0]}>
      {edges.map(([u, v, w, d], k) => (
        <mesh key={k} position={[u * FTm, 0, -v * FTm]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w * FTm, d * FTm]} />
          <meshStandardMaterial color="#c9b37a" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function FloorMark({ it }: { it: Item }) {
  return (
    <mesh position={W(it.x, it.y, 0.02)} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.18, 0.28, 32]} />
      <meshStandardMaterial color="#e9b44c" roughness={0.5} />
    </mesh>
  );
}

function Stand({ it }: { it: Item }) {
  const M = mats();
  const p = P(it);
  const h = p.h * FTm;
  const a = yawRad(it.rot);
  if (it.type === 'pipebar') {
    const u = { x: Math.sin(a), y: -Math.cos(a) };
    const ends = [-1, 1].map((s) => ({ x: it.x + u.x * (p.w / 2) * s, y: it.y + u.y * (p.w / 2) * s }));
    return (
      <group>
        {ends.map((e, k) => (
          <group key={k} position={W(e.x, e.y, 0)}>
            <mesh position={[0, h / 2, 0]} castShadow>
              <cylinderGeometry args={[0.022, 0.022, h, 10]} />
              <primitive object={M.chrome} attach="material" />
            </mesh>
            <mesh position={[0, 0.008, 0]}>
              <boxGeometry args={[0.6, 0.016, 0.6]} />
              <primitive object={M.metal} attach="material" />
            </mesh>
          </group>
        ))}
        <mesh position={W(it.x, it.y, p.h - 0.1)} rotation={[0, a - Math.PI / 2, Math.PI / 2]}>
          <cylinderGeometry args={[0.024, 0.024, p.w * FTm, 10]} />
          <primitive object={M.chrome} attach="material" />
        </mesh>
      </group>
    );
  }
  const crank = it.type === 'crank';
  const legR = crank ? 1.2 : 0.75;
  const bar = (p.bar || (crank ? 6 : 4)) * FTm;
  return (
    <group position={W(it.x, it.y, 0)} rotation={[0, a, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[crank ? 0.04 : 0.022, crank ? 0.06 : 0.03, h, 12]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.45} />
      </mesh>
      {(crank ? [0, 90, 180, 270] : [0, 120, 240]).map((d) => {
        const r = yawRad(d + 30);
        return (
          <mesh key={d} position={[Math.cos(r) * legR * 0.5, 0.42, Math.sin(r) * legR * 0.5]} rotation={[0, -r, Math.atan2(0.85, legR)]} castShadow>
            <cylinderGeometry args={[0.016, 0.016, Math.hypot(legR, 0.85), 8]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.45} />
          </mesh>
        );
      })}
      <mesh position={[0, h - 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[crank ? 0.05 : 0.02, crank ? 0.05 : 0.02, bar, crank ? 4 : 10]} />
        <meshStandardMaterial color={crank ? '#c9c9c9' : '#1a1a1a'} metalness={0.7} roughness={0.35} wireframe={false} />
      </mesh>
    </group>
  );
}

export { drapeCounts };
