'use client';
import { create } from 'zustand';
import type { Item, Probe, Project } from './types';
import { defaultProject } from './project';
import type { FullResult } from './engine';
import { uid } from './geom';

export type ViewKey = 'overview' | 'plan' | '3d' | 'campus' | 'campusplan' | 'light' | 'rig' | 'build' | 'exhibits' | 'venue';
export type HeatMode = 'face' | 'floor' | 'photo' | 'uv' | 'none';

// v4 = layout synced to the Campus 3D exhibition; v3 = layout placed on the client's drawing. Plans saved by earlier versions stay under their old keys and the most
// recent one can be brought back from Venue & settings.
const LS_KEY = 'lightplot.project.v4';
export const OLD_KEYS = ['lightplot.project.v3', 'lightplot.project.v2', 'lightplot.project.v1'];

function loadProject(): Project {
  if (typeof window === 'undefined') return defaultProject();
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Project;
      if (p && p.version >= 1 && p.version <= 4 && Array.isArray(p.items)) return p;
    }
  } catch {
    /* storage unavailable */
  }
  return defaultProject();
}

interface State {
  project: Project;
  past: Project[];
  future: Project[];
  view: ViewKey;
  selected: string | null; // item id or probe id (prefix 'pb')
  hover: string | null;
  result: FullResult | null;
  calcState: 'idle' | 'running' | 'error';
  calcProgress: number;
  calcError: string | null;
  heat: HeatMode;
  faceDir: number | null; // null = cylindrical
  layers: { dwg: boolean; beams: boolean; labels: boolean; egress: boolean; grid: boolean; probes: boolean; fixtures: boolean };
  paletteOpen: boolean;
  navOpen: boolean;
  focus3d: { x: number; y: number; z: number } | null;
  /** autosave status of the plan */
  saveState: 'saved' | 'saving' | 'error';
  savedAt: number | null;
  saveError: string | null;
  setView: (v: ViewKey) => void;
  select: (id: string | null) => void;
  setHover: (id: string | null) => void;
  setResult: (r: FullResult | null, state?: State['calcState'], err?: string | null) => void;
  setProgress: (f: number) => void;
  setHeat: (h: HeatMode) => void;
  setFaceDir: (d: number | null) => void;
  toggleLayer: (k: keyof State['layers']) => void;
  setPalette: (o: boolean) => void;
  setNav: (o: boolean) => void;
  setFocus3d: (f: State['focus3d']) => void;
  // mutations (undoable)
  commit: (fn: (p: Project) => Project, coalesceKey?: string) => void;
  updateItem: (id: string, patch: Partial<Item> | ((it: Item) => Item), coalesceKey?: string) => void;
  updateParams: (id: string, patch: Record<string, any>, coalesceKey?: string) => void;
  addItem: (it: Omit<Item, 'id'> & { id?: string }) => string;
  removeItem: (id: string) => void;
  duplicateItem: (id: string) => string | null;
  updateProbe: (id: string, patch: Partial<Probe>, coalesceKey?: string) => void;
  addProbe: (p: Omit<Probe, 'id'>) => string;
  removeProbe: (id: string) => void;
  undo: () => void;
  redo: () => void;
  resetProject: () => void;
  loadFromJSON: (p: Project) => void;
}

let lastKey: string | undefined;
let lastTime = 0;

// ── autosave ──
// Every change to the plan is written to this browser's localStorage a moment after it happens (and immediately when the tab is
// hidden, reloaded or closed), so nothing is lost between visits. Storage belongs to one browser at one address: localhost:3000
// (npm run dev), localhost:8123 (the export) and the GitHub Pages site each keep their own copy — use Export / Import in
// Venue & settings to move a plan between them.
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pending: Project | null = null;
function writeNow() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (!pending || typeof window === 'undefined') return;
  const p = pending;
  pending = null;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(p));
    useStore.setState({ saveState: 'saved', savedAt: Date.now(), saveError: null });
  } catch (e: any) {
    useStore.setState({ saveState: 'error', saveError: e?.name === 'QuotaExceededError' ? 'Browser storage is full' : 'This browser blocked saving (private window?)' });
  }
}
/** write any pending change right now (⌘S) */
export function saveNow() {
  if (pending) writeNow();
  else useStore.setState({ saveState: 'saved', savedAt: Date.now() });
}
function persist(p: Project) {
  if (typeof window === 'undefined') return;
  pending = p;
  if (useStore.getState().saveState !== 'saving') useStore.setState({ saveState: 'saving' });
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(writeNow, 250);
}

const UI_KEY = 'lightplot.ui.v1';
type UiPrefs = Pick<State, 'heat' | 'faceDir' | 'layers'>;
function loadUi(): Partial<UiPrefs> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(window.localStorage.getItem(UI_KEY) || '{}') || {}; } catch { return {}; }
}
function saveUi(u: UiPrefs) {
  try { window.localStorage.setItem(UI_KEY, JSON.stringify(u)); } catch { /* not critical */ }
}
const DEFAULT_LAYERS: State['layers'] = { dwg: true, beams: true, labels: true, egress: true, grid: false, probes: true, fixtures: true };
const ui0 = loadUi();

export const useStore = create<State>((set, get) => ({
  project: loadProject(),
  past: [],
  future: [],
  view: 'overview',
  selected: null,
  hover: null,
  result: null,
  calcState: 'idle',
  calcProgress: 0,
  calcError: null,
  heat: ui0.heat ?? 'face',
  faceDir: ui0.faceDir ?? null,
  layers: { ...DEFAULT_LAYERS, ...(ui0.layers || {}) },
  paletteOpen: false,
  navOpen: true,
  focus3d: null,
  saveState: 'saved',
  savedAt: null,
  saveError: null,
  setView: (view) => set({ view }),
  select: (selected) => set({ selected }),
  setHover: (hover) => set({ hover }),
  setResult: (result, calcState = 'idle', calcError = null) => set({ result, calcState, calcError }),
  setProgress: (calcProgress) => set({ calcProgress, calcState: 'running' }),
  setHeat: (heat) => { set({ heat }); const s = get(); saveUi({ heat: s.heat, faceDir: s.faceDir, layers: s.layers }); },
  setFaceDir: (faceDir) => { set({ faceDir }); const s = get(); saveUi({ heat: s.heat, faceDir: s.faceDir, layers: s.layers }); },
  toggleLayer: (k) => { set((s) => ({ layers: { ...s.layers, [k]: !s.layers[k] } })); const s = get(); saveUi({ heat: s.heat, faceDir: s.faceDir, layers: s.layers }); },
  setPalette: (paletteOpen) => set({ paletteOpen }),
  setNav: (navOpen) => set({ navOpen }),
  setFocus3d: (focus3d) => set({ focus3d }),
  commit: (fn, coalesceKey) => {
    const s = get();
    const now = Date.now();
    const coalesce = coalesceKey && coalesceKey === lastKey && now - lastTime < 1200;
    const next = { ...fn(s.project), updatedAt: now };
    lastKey = coalesceKey;
    lastTime = now;
    set({ project: next, past: coalesce ? s.past : [...s.past.slice(-80), s.project], future: [] });
    persist(next);
  },
  updateItem: (id, patch, key) =>
    get().commit((p) => ({ ...p, items: p.items.map((i) => (i.id === id ? (typeof patch === 'function' ? patch(i) : { ...i, ...patch }) : i)) }), key),
  updateParams: (id, patch, key) =>
    get().commit((p) => ({ ...p, items: p.items.map((i) => (i.id === id ? { ...i, params: { ...i.params, ...patch } } : i)) }), key),
  addItem: (it) => {
    const id = it.id || uid(it.type.slice(0, 3));
    get().commit((p) => ({ ...p, items: [...p.items, { ...(it as Item), id }] }));
    set({ selected: id });
    return id;
  },
  removeItem: (id) => {
    get().commit((p) => ({
      ...p,
      // removing a stand removes its fixtures' rig link (they drop to the floor where the stand was)
      items: p.items
        .filter((i) => i.id !== id)
        .map((i) => (i.type === 'fixture' && i.params.rig === id ? { ...i, params: { ...i.params, rig: undefined, mount: 'floor' } } : i)),
    }));
    set({ selected: null });
  },
  duplicateItem: (id) => {
    const src = get().project.items.find((i) => i.id === id);
    if (!src) return null;
    const nid = uid(src.type.slice(0, 3));
    const copy: Item = JSON.parse(JSON.stringify(src));
    copy.id = nid;
    copy.name = src.name + ' (copy)';
    copy.x += 3;
    copy.y -= 3;
    get().commit((p) => ({ ...p, items: [...p.items, copy] }));
    set({ selected: nid });
    return nid;
  },
  updateProbe: (id, patch, key) => get().commit((p) => ({ ...p, probes: p.probes.map((q) => (q.id === id ? { ...q, ...patch } : q)) }), key),
  addProbe: (pr) => {
    const id = uid('pb');
    get().commit((p) => ({ ...p, probes: [...p.probes, { ...pr, id }] }));
    set({ selected: id });
    return id;
  },
  removeProbe: (id) => {
    get().commit((p) => ({ ...p, probes: p.probes.filter((q) => q.id !== id) }));
    set({ selected: null });
  },
  undo: () => {
    const s = get();
    if (!s.past.length) return;
    const prev = { ...s.past[s.past.length - 1], updatedAt: Date.now() };
    set({ project: prev, past: s.past.slice(0, -1), future: [s.project, ...s.future] });
    persist(prev);
  },
  redo: () => {
    const s = get();
    if (!s.future.length) return;
    const nx = { ...s.future[0], updatedAt: Date.now() };
    set({ project: nx, future: s.future.slice(1), past: [...s.past, s.project] });
    persist(nx);
  },
  resetProject: () => {
    const p = defaultProject();
    set((s) => ({ project: p, past: [...s.past, s.project], future: [], selected: null }));
    persist(p);
  },
  loadFromJSON: (p0) => {
    const p = { ...p0, updatedAt: Date.now() };
    set((s) => ({ project: p, past: [...s.past, s.project], future: [], selected: null }));
    persist(p);
  },
}));

if (typeof window !== 'undefined') {
  // never lose the last change: write straight away when the tab is hidden, reloaded or closed
  const flush = () => writeNow();
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  // another tab of the app saved a newer plan → pick it up here too (undoable)
  window.addEventListener('storage', (e) => {
    if (e.key !== LS_KEY || !e.newValue) return;
    try {
      const p = JSON.parse(e.newValue) as Project;
      const s = useStore.getState();
      if (p && Array.isArray(p.items) && (p.updatedAt ?? 0) > (s.project.updatedAt ?? 0)) useStore.setState({ project: p, past: [...s.past.slice(-80), s.project], future: [], saveState: 'saved', savedAt: Date.now() });
    } catch { /* ignore */ }
  });
}

export const isProbeId = (id: string | null) => !!id && id.startsWith('pb');
