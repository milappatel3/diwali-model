'use client';
// Lightweight 3D labels. drei's <Html> mounts a separate React root per label and moves each one every frame, which is slow with
// hundreds of labels and makes React warn ("Attempted to synchronously unmount a root while React was already rendering") whenever
// a view or layer unmounts. Here every label is a plain anchor in the scene; their DOM lives in ONE overlay rendered by the normal
// React tree next to the <Canvas>, and a single projector moves them only when the camera, the canvas size or the label set changes.
import React, { useEffect, useId, useRef, useSyncExternalStore } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

interface Lab { obj: THREE.Object3D | null; max: number; z: number; node: React.ReactNode; el: HTMLDivElement | null }
const labs = new Map<string, Lab>();
let version = 0;
const subs = new Set<() => void>();
let kick: (() => void) | null = null; // invalidate() of the canvas that owns the projector (frameloop="demand")
const bump = () => { version++; subs.forEach((f) => f()); kick?.(); };
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

/** anchor a DOM label at `pos` (scene units) — shown while the camera is within `max` */
export function NearHtml({ pos, max, children, z = 10 }: { pos: THREE.Vector3 | [number, number, number]; max: number; children: React.ReactNode; z?: number }) {
  const id = useId();
  const g = useRef<THREE.Group>(null);
  useEffect(() => {
    const prev = labs.get(id);
    if (prev && prev.obj === g.current && prev.max === max && prev.z === z && prev.node === children) return;
    labs.set(id, { obj: g.current, max, z, node: children, el: prev?.el ?? null });
    bump();
  });
  useEffect(() => () => { labs.delete(id); bump(); }, [id]);
  const p = Array.isArray(pos) ? pos : ([pos.x, pos.y, pos.z] as [number, number, number]);
  return <group ref={g} position={p} />;
}

/** the DOM side: put this right after <Canvas> inside the (position: relative) canvas wrapper */
export function LabelOverlay() {
  useSyncExternalStore(subscribe, () => version, () => 0);
  return (
    <div className="label-layer" aria-hidden>
      {[...labs.entries()].map(([id, l]) => (
        <div key={id} ref={(el) => { l.el = el; if (el) { dirty = true; kick?.(); } }} className="label-anchor" style={{ zIndex: l.z }}>
          {l.node}
        </div>
      ))}
    </div>
  );
}

let dirty = true;
const v = new THREE.Vector3();
const wp = new THREE.Vector3();
/** the scene side: one per <Canvas>; repositions labels when anything that affects them changed */
export function LabelProjector() {
  const { camera, size, invalidate } = useThree();
  useEffect(() => { kick = () => invalidate(); return () => { kick = null; }; }, [invalidate]);
  const last = useRef({ m: new THREE.Matrix4(), w: 0, h: 0, ver: -1, t: 0 });
  useFrame((st) => {
    const L = last.current;
    camera.updateMatrixWorld();
    const moved = !L.m.equals(camera.matrixWorld) || L.w !== size.width || L.h !== size.height || L.ver !== version || dirty;
    // anchors can move with edits even when the camera is still, so also refresh a few times a second
    if (!moved && st.clock.elapsedTime - L.t < 0.5) return;
    L.m.copy(camera.matrixWorld); L.w = size.width; L.h = size.height; L.ver = version; L.t = st.clock.elapsedTime; dirty = false;
    for (const l of labs.values()) {
      const el = l.el;
      if (!el) continue;
      if (!l.obj || !l.obj.parent) { el.style.display = 'none'; continue; }
      l.obj.getWorldPosition(wp);
      const d = camera.position.distanceTo(wp);
      v.copy(wp).project(camera);
      if (d > l.max || v.z > 1 || v.z < -1 || Math.abs(v.x) > 1.15 || Math.abs(v.y) > 1.15) { if (el.style.display !== 'none') el.style.display = 'none'; continue; }
      const x = ((v.x + 1) / 2) * size.width, y = ((1 - v.y) / 2) * size.height;
      el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-50%)`;
      if (el.style.display !== 'block') el.style.display = 'block';
    }
  });
  return null;
}
