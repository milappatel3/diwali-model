// Two-way sync of the 2027 layout with the repo, so edits made in the app can be pushed and read back by Claude.
// All of it runs through dev-only API routes (app/api/layout/*.dev.ts), so it works with `npm run dev` on your computer.
//   GET  /api/layout       → layout/plan-2027.json + layout/campus-2027.json as saved in the repo
//   POST /api/layout       → save this browser's hall exhibition + campus edits there
//   POST /api/layout/push  → commit layout/ and push the current branch
// The files are read at request time (never imported), so saving does not reload the page.
import { useStore } from './store';
import { useCE } from './campusEdits';
import type { Project } from './types';

const KEY = 'lightplot.2027.layoutSync';
export interface RepoLayout { project: (Project & { savedAt?: string }) | null; campus: any | null }

export function lastSynced(): string {
  try { return localStorage.getItem(KEY) || ''; } catch { return ''; }
}
export function markSynced(at: string) {
  try { localStorage.setItem(KEY, at); } catch { /* storage off */ }
}

export async function fetchRepoLayout(): Promise<RepoLayout | null> {
  try {
    const r = await fetch('/api/layout', { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

const strip = (o: any) => { if (!o) return o; const { savedAt: _s, ...rest } = o; return JSON.parse(JSON.stringify(rest)); };

/** same hall exhibition as the repo? (ignores ids' order-independent noise only by exact JSON) */
export function sameAsRepo(repo: RepoLayout): boolean {
  if (!repo.project) return false;
  return JSON.stringify(useStore.getState().project.items) === JSON.stringify(repo.project.items);
}

export function loadRepoLayout(repo: RepoLayout) {
  if (repo.project) useStore.getState().loadFromJSON(strip(repo.project) as Project);
  if (repo.campus) useCE.getState().importJSON(strip(repo.campus));
  markSynced(repo.project?.savedAt || new Date().toISOString());
}

export async function saveToRepo(): Promise<{ ok: boolean; savedAt?: string; error?: string }> {
  try {
    const r = await fetch('/api/layout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ project: useStore.getState().project, campus: useCE.getState().e }),
    });
    if (r.status === 404) return { ok: false, error: 'Saving to the repo only works when the app runs with npm run dev on your computer.' };
    const j = await r.json();
    if (j.ok) markSynced(j.savedAt);
    return j;
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export async function pushToRepo(message: string): Promise<{ ok: boolean; branch?: string; error?: string }> {
  try {
    const r = await fetch('/api/layout/push', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message }) });
    if (r.status === 404) return { ok: false, error: 'Pushing only works when the app runs with npm run dev on your computer.' };
    return await r.json();
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}
