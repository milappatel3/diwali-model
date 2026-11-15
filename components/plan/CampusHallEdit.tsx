'use client';
// Campus plan · editing the hall exhibition (the Plan's items) and syncing the layout with the repo.
import React, { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import type { Item, SectionId } from '@/lib/types';
import { SECTIONS } from '@/lib/content';
import { fetchRepoLayout, lastSynced, loadRepoLayout, markSynced, pushToRepo, sameAsRepo, saveToRepo, type RepoLayout } from '@/lib/layoutSync';
import { Field, NumIn } from '../ui';

const fmt = (iso: string) => (iso ? new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'never');
const r1 = (v: number) => Math.round(v * 10) / 10;

/** scale a set piece's parts (and glow points) so its size fields actually change its shape */
function scalePiece(it: Item, kx: number, ky: number, kz: number): Item {
  const p = { ...it.params };
  if (Array.isArray(p.parts)) p.parts = p.parts.map(([u, v, z, su, sv, sz, ...rest]: any[]) => [u * kx, v * ky, z * kz, su * kx, sv * ky, sz * kz, ...rest]);
  if (Array.isArray(p.glow)) p.glow = p.glow.map((g: any) => ({ ...g, u: (g.u || 0) * kx, v: (g.v || 0) * ky, z: (g.z || 0) * kz, area: g.area ? g.area * kx * kz : g.area }));
  p.w = r1(p.w * kx); p.d = r1(p.d * ky); p.h = r1(p.h * kz);
  return { ...it, params: p };
}

export function HallInspector({ id, onClose, onDeleted, onSelect }: { id: string; onClose: () => void; onDeleted: () => void; onSelect: (id: string) => void }) {
  const it = useStore((s) => s.project.items.find((q) => q.id === id));
  const { updateItem, updateParams, removeItem, duplicateItem } = useStore.getState();
  if (!it) return <span className="muted tiny">This item no longer exists.</span>;
  const p = it.params || {};
  const isLine = it.type === 'drape' || it.type === 'stanchions';
  const len = isLine && it.points ? it.points.slice(1).reduce((a, q, i) => a + Math.hypot(q.x - it.points![i].x, q.y - it.points![i].y), 0) : 0;
  const key = (k: string) => `ci:${id}:${k}`;
  const size = (axis: 'w' | 'd' | 'h', v: number) => {
    if (!(v > 0)) return;
    if (it.type === 'setPiece' && Array.isArray(p.parts) && p[axis] > 0) {
      const k = v / p[axis];
      updateItem(id, (x) => scalePiece(x, axis === 'w' ? k : 1, axis === 'd' ? k : 1, axis === 'h' ? k : 1), key(axis));
    } else updateParams(id, { [axis]: v }, key(axis));
  };
  return (
    <div className="stack" style={{ gap: 8, marginTop: 6 }}>
      <div className="row-flex" style={{ justifyContent: 'space-between' }}>
        <b className="h2" style={{ fontSize: 15 }}>{it.name}</b>
        <button className="btn btn-sm btn-ghost" onClick={onClose}>Done</button>
      </div>
      <span className="tiny muted">{it.type === 'setPiece' ? 'Set piece' : it.type} · hall exhibition (same item as in Plan &amp; light map and 3D)</span>
      <Field label="Name"><input className="txt-in" value={it.name} onChange={(e) => updateItem(id, { name: e.target.value }, key('name'))} /></Field>
      <Field label="Section">
        <select className="txt-in" value={it.section} onChange={(e) => updateItem(id, { section: e.target.value as SectionId })}>
          {SECTIONS.map((s) => <option key={s.id} value={s.id}>{s.num ? `${s.num} · ` : ''}{s.title}</option>)}
          <option value="infra">Infrastructure / circulation</option>
        </select>
      </Field>
      <div className="row-flex" style={{ gap: 6 }}>
        <Field label="X (ft)"><NumIn value={it.x} onChange={(v) => updateItem(id, { x: v }, key('x'))} /></Field>
        <Field label="Y (ft)"><NumIn value={it.y} onChange={(v) => updateItem(id, { y: v }, key('y'))} /></Field>
        {!isLine && <Field label="Rotation"><NumIn value={it.rot} step={15} onChange={(v) => updateItem(id, { rot: ((v % 360) + 360) % 360 }, key('rot'))} suffix="°" /></Field>}
      </div>
      {!isLine && (p.w !== undefined || p.h !== undefined) && (
        <div className="row-flex" style={{ gap: 6 }}>
          {p.w !== undefined && <Field label="Width"><NumIn value={p.w} onChange={(v) => size('w', v)} suffix="′" /></Field>}
          {p.d !== undefined && <Field label="Depth"><NumIn value={p.d} onChange={(v) => size('d', v)} suffix="′" /></Field>}
          {p.h !== undefined && <Field label="Height"><NumIn value={p.h} onChange={(v) => size('h', v)} suffix="′" /></Field>}
        </div>
      )}
      {isLine && (
        <div className="row-flex" style={{ gap: 6, alignItems: 'end' }}>
          {it.type === 'drape' && <Field label="Wall height"><NumIn value={p.h ?? 8} onChange={(v) => updateParams(id, { h: v }, key('h'))} suffix="′" /></Field>}
          <span className="tiny muted" style={{ paddingBottom: 8 }}>{r1(len)} ft long · drag the orange dots to move its ends</span>
        </div>
      )}
      <Field label="Note for Claude (what to change here)">
        <textarea className="txt-in" rows={3} placeholder="e.g. make this taller, swap for a printed backdrop, add a door here…" value={p.ask || ''} onChange={(e) => updateParams(id, { ask: e.target.value || undefined }, key('ask'))} />
      </Field>
      <div className="row-flex" style={{ gap: 6, flexWrap: 'wrap' }}>
        {!isLine && <button className="btn btn-sm" onClick={() => updateItem(id, { rot: (it.rot + 270) % 360 })}>⟲ 90°</button>}
        {!isLine && <button className="btn btn-sm" onClick={() => updateItem(id, { rot: (it.rot + 90) % 360 })}>⟳ 90°</button>}
        <button className="btn btn-sm" onClick={() => { const n = duplicateItem(id); if (n) onSelect(n); }}>Duplicate</button>
        <button className="btn btn-sm" onClick={() => updateItem(id, { hidden: !it.hidden })}>{it.hidden ? 'Show' : 'Hide'}</button>
        <button className="btn btn-sm" onClick={() => { removeItem(id); onDeleted(); }}>Delete</button>
      </div>
    </div>
  );
}

const ADDS: [string, string][] = [
  ['wall', '8 ft wall (pipe & drape)'],
  ['poster', 'Poster (3.5 × 5 ft)'],
  ['box', 'Set piece (box)'],
  ['area', 'Area / zone outline'],
  ['note', 'Note for Claude (pin)'],
];

export function HallAdd({ center, onAdded }: { center: [number, number]; onAdded: (id: string) => void }) {
  const add = (k: string) => {
    const inHall = center[0] > -5 && center[0] < 125 && center[1] > -35 && center[1] < 100;
    const [x, y] = inHall ? [Math.round(center[0]), Math.round(center[1])] : [60, 47];
    const base = { x, y, rot: 0, section: 'infra' as SectionId };
    const items: Record<string, Omit<Item, 'id'>> = {
      wall: { ...base, type: 'drape', name: 'New wall', params: { h: 8, color: 'black', fullness: 0.5 }, points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] },
      poster: { ...base, type: 'poster', name: 'New poster', rot: 90, params: { w: 3.5, h: 5, bottom: 2, title: 'New poster' } },
      box: { ...base, type: 'setPiece', name: 'New set piece', params: { title: 'New set piece', w: 4, d: 4, h: 4, mat: 'mdfPainted', parts: null } },
      area: { ...base, type: 'booth', name: 'New area', rot: 90, params: { w: 12, d: 10, title: 'New area', zone: true } },
      note: { ...base, type: 'booth', name: 'Note for Claude', rot: 90, params: { w: 4, d: 4, title: 'Note', zone: true, ask: 'Describe the change here' } },
    };
    onAdded(useStore.getState().addItem(items[k]));
  };
  return (
    <div className="card card-flat" style={{ padding: 14 }}>
      <span className="eyebrow">Add to the hall exhibition</span>
      <select className="txt-in" style={{ marginTop: 8, width: '100%' }} value="" onChange={(e) => { if (e.target.value) add(e.target.value); }}>
        <option value="">Add…</option>
        {ADDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      <span className="tiny muted" style={{ display: 'block', marginTop: 6 }}>Click any exhibit, wall or zone in the hall to select it; drag to move. Delete removes it. Leave a “Note for Claude” on anything you want me to change.</span>
    </div>
  );
}

export function RepoSync() {
  const [synced, setSynced] = useState(lastSynced());
  const [busy, setBusy] = useState<'' | 'save' | 'push'>('');
  const [msg, setMsg] = useState('');
  const [note, setNote] = useState('');
  const [repo, setRepo] = useState<RepoLayout | null>(null);
  const [devApi, setDevApi] = useState(true);
  const asks = useStore((s) => s.project.items.filter((i) => i.params?.ask).length);
  const refresh = async () => {
    const r = await fetchRepoLayout();
    setDevApi(!!r);
    if (!r) return;
    // first visit with the same layout as the repo: nothing to load
    if (!lastSynced() && r.project?.savedAt && sameAsRepo(r)) { markSynced(r.project.savedAt); setSynced(r.project.savedAt); }
    setRepo(r);
  };
  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const repoSavedAt = repo?.project?.savedAt || '';
  const newer = !!repoSavedAt && repoSavedAt > synced;

  const save = async (push: boolean) => {
    setBusy(push ? 'push' : 'save');
    setNote('');
    const r = await saveToRepo();
    if (!r.ok) { setNote(r.error || 'Could not save'); setBusy(''); return; }
    setSynced(r.savedAt || lastSynced());
    refresh();
    if (!push) { setNote(`Saved to layout/ in the repo (${fmt(r.savedAt || '')}). Push when you're ready.`); setBusy(''); return; }
    const pr = await pushToRepo(msg);
    setBusy('');
    setNote(pr.ok ? `Saved and pushed to ${pr.branch}. Tell Claude to pull the layout.` : `Saved, but the push failed: ${pr.error}`);
    if (pr.ok) setMsg('');
  };

  return (
    <div className="card" style={{ padding: 14, borderColor: newer ? '#ffb347' : undefined }}>
      <span className="eyebrow">Layout ↔ repo (for Claude)</span>
      {newer && (
        <div className="stack" style={{ gap: 6, marginTop: 8, padding: 8, borderRadius: 8, background: 'rgba(255,179,71,0.12)' }}>
          <span className="small">A newer layout is in the repo (saved {fmt(repoSavedAt)}).</span>
          <button className="btn btn-sm btn-terra" onClick={() => { if (repo) loadRepoLayout(repo); setSynced(lastSynced()); setNote('Loaded the repo layout. Undo (top right) brings back what you had.'); }}>Load the repo layout</button>
        </div>
      )}
      <input className="txt-in" style={{ marginTop: 8, width: '100%' }} placeholder="What did you change? (commit message)" value={msg} onChange={(e) => setMsg(e.target.value)} />
      <div className="row-flex" style={{ gap: 6, marginTop: 8 }}>
        <button className="btn btn-sm btn-terra" disabled={!!busy} onClick={() => save(true)}>{busy === 'push' ? 'Pushing…' : 'Save & push'}</button>
        <button className="btn btn-sm" disabled={!!busy} onClick={() => save(false)}>{busy === 'save' ? 'Saving…' : 'Save only'}</button>
      </div>
      <span className="tiny muted" style={{ display: 'block', marginTop: 8 }}>
        Last synced {fmt(synced)}{asks ? ` · ${asks} note${asks > 1 ? 's' : ''} for Claude` : ''}. Saves the hall exhibition and the campus edits to <code>layout/</code>, then commits and pushes the current branch.
      </span>
      {!devApi && <span className="tiny" style={{ display: 'block', marginTop: 6, color: '#ff9a8c' }}>Saving and pushing need the app running with npm run dev on your computer.</span>}
      {note && <span className="tiny" style={{ display: 'block', marginTop: 6, color: note.includes('failed') || note.includes('only works') ? '#ff9a8c' : 'var(--on-dark-2)' }}>{note}</span>}
    </div>
  );
}
