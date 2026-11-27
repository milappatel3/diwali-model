'use client';
// While running `npm run dev`, mirror the Plan & light map and the Campus plan into the project folder (data/plan-2027.json and
// data/campus-2027.json) a moment after every change, and once when the app opens. Browser storage stays the working copy; the
// files are what gets committed and what Claude reads. Does nothing in the published (static) site.
import { useStore } from './store';
import { useCE } from './campusEdits';

let started = false;
export function startFileSync() {
  if (started || typeof window === 'undefined' || process.env.NODE_ENV !== 'development') return;
  started = true;
  const timers: Record<string, ReturnType<typeof setTimeout> | undefined> = {};
  const send = (kind: 'plan' | 'campus', data: unknown) => {
    clearTimeout(timers[kind]);
    timers[kind] = setTimeout(() => {
      fetch('/api/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, data }), keepalive: true }).catch(() => {});
    }, 800);
  };
  send('plan', useStore.getState().project);
  send('campus', useCE.getState().e);
  useStore.subscribe((s, p) => { if (s.project !== p.project) send('plan', s.project); });
  useCE.subscribe((s, p) => { if (s.e !== p.e) send('campus', s.e); });
}
