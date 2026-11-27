'use client';
// While running `npm run dev`, keep layout/plan-2027.json and layout/campus-2027.json in the project folder up to date
// automatically: once when the app opens and a moment after every change (same files as Campus plan → Layout ↔ repo → Save).
// Browser storage stays the working copy; the files are what gets committed and what Claude reads. Off in the published site.
import { useStore } from './store';
import { useCE } from './campusEdits';
import { markSynced } from './layoutSync';

let started = false;
export function startFileSync() {
  if (started || typeof window === 'undefined' || process.env.NODE_ENV !== 'development') return;
  started = true;
  let t: ReturnType<typeof setTimeout> | undefined;
  const save = () => {
    clearTimeout(t);
    t = setTimeout(() => {
      fetch('/api/layout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ project: useStore.getState().project, campus: useCE.getState().e }), keepalive: true })
        .then((r) => r.json()).then((j) => { if (j?.ok) markSynced(j.savedAt); }).catch(() => {});
    }, 1200);
  };
  save();
  useStore.subscribe((s, p) => { if (s.project !== p.project) save(); });
  useCE.subscribe((s, p) => { if (s.e !== p.e) save(); });
}
