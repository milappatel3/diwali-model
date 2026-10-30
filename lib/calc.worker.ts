/// <reference lib="webworker" />
import { buildScene, computeAll } from './engine';
import type { Project } from './types';

let latest = 0;
self.onmessage = (e: MessageEvent<{ id: number; project: Project }>) => {
  const { id, project } = e.data;
  latest = id;
  try {
    const sc = buildScene(project);
    const res = computeAll(sc, (f) => {
      if (id === latest) (self as any).postMessage({ id, progress: f });
    });
    const g = res.grid;
    (self as any).postMessage({ id, result: res }, [g.floor.buffer, g.cyl.buffer, g.e8.buffer, g.top.buffer, g.rgb.buffer, g.cri.buffer, g.uv.buffer, g.mask.buffer]);
  } catch (err: any) {
    (self as any).postMessage({ id, error: String(err?.stack || err) });
  }
};
