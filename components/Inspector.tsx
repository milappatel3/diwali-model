'use client';
import React, { useMemo } from 'react';
import { useStore, isProbeId } from '@/lib/store';
import { TYPES, params as itemParams, drapeCounts } from '@/lib/catalog';
import { FIXTURES, resolveModel, mixMetrics, OWNED_KEYS, BUY_KEYS } from '@/lib/fixtures';
import { fixtureWorld, isRig, runLength } from '@/lib/rig';
import { SECTIONS } from '@/lib/content';
import { Icon, Field, NumIn, Slider, rgbCss, Pill } from './ui';
import { VERDICT_COLOR, fmtLux, fc } from '@/lib/heat';
import { fmtFt, DEG } from '@/lib/geom';
import type { Item } from '@/lib/types';

const PARAM_LABELS: Record<string, string> = {
  w: 'Width (ft)', d: 'Depth (ft)', h: 'Height (ft)', bottom: 'Bottom edge (ft)', title: 'Title', sub: 'Sub-title', style: 'Style', feet: 'Free-standing',
  double: 'Double-sided', color: 'Drape colour', fullness: 'Fullness', closed: 'Closed loop', runA: 'Run A (ft)', runB: 'Run B (ft)', corner: 'Corner (ft)', depth: 'Module depth',
  mirror: 'Mirror', nits: 'Glow (nits)', cct: 'Glow CCT (K)', art: 'Artwork', divos: 'LED divos', n: 'Count', r: 'Pad radius (ft)', spacing: 'Post spacing (ft)', tau: 'Ceiling transmission',
  lightPipe: 'Light pipe (hang fixtures)', valance: 'Valance only (ft, 0 = full)', sharedEnds: 'Ends share uprights',
  table: 'Table in front', num: 'Section #', text: 'Text', rho: 'Reflectance', bar: 'Bar width (ft)', mat: 'Material', wall: 'Wall depth (ft)',
};
const HIDDEN_PARAMS = new Set(['entry', 'exit', 'target', 'model', 'mount', 'rig', 'slot', 'aim', 'ch', 'dim', 'zoom', 'u']);

export default function Inspector() {
  const selected = useStore((s) => s.selected);
  const project = useStore((s) => s.project);
  const select = useStore((s) => s.select);
  const result = useStore((s) => s.result);
  if (!selected) return null;
  if (isProbeId(selected)) return <ProbeInspector id={selected} />;
  const it = project.items.find((i) => i.id === selected);
  if (!it) return null;
  return (
    <aside className="drawer inspector" aria-label="Inspector">
      <div className="drawer-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="eyebrow">{TYPES[it.type]?.label || it.type}</div>
          <h3>{it.name}</h3>
        </div>
        <button className="btn icon-btn btn-ghost" onClick={() => select(null)} aria-label="Close">
          <Icon.close size={16} />
        </button>
      </div>
      <div className="drawer-body">{it.type === 'fixture' ? <FixtureBody it={it} /> : <ItemBody it={it} />}</div>
      {result && <SurfaceStats itemId={it.id} />}
    </aside>
  );
}

function Common({ it }: { it: Item }) {
  const updateItem = useStore((s) => s.updateItem);
  const removeItem = useStore((s) => s.removeItem);
  const duplicateItem = useStore((s) => s.duplicateItem);
  return (
    <>
      <Field label="Name">
        <input className="txt-in" value={it.name} onChange={(e) => updateItem(it.id, { name: e.target.value }, `name-${it.id}`)} />
      </Field>
      <Field label="Section">
        <select className="txt-in" value={it.section} onChange={(e) => updateItem(it.id, { section: e.target.value as any })}>
          {SECTIONS.map((s) => (
            <option key={s.id} value={s.id}>{s.num ? `${s.num} · ` : ''}{s.title}</option>
          ))}
          <option value="infra">Infrastructure</option>
        </select>
      </Field>
      <div className="row-flex">
        <button className="btn btn-sm" onClick={() => duplicateItem(it.id)}><Icon.copy size={13} /> Duplicate</button>
        <button className="btn btn-sm" onClick={() => updateItem(it.id, { locked: !it.locked })}><Icon.lock size={13} /> {it.locked ? 'Unlock' : 'Lock'}</button>
        <button className="btn btn-sm" onClick={() => updateItem(it.id, { hidden: !it.hidden })}><Icon.eye size={13} /> {it.hidden ? 'Show' : 'Hide'}</button>
        <button className="btn btn-sm" style={{ color: '#ff9a8c' }} onClick={() => removeItem(it.id)}><Icon.trash size={13} /> Delete</button>
      </div>
    </>
  );
}

function ItemBody({ it }: { it: Item }) {
  const updateItem = useStore((s) => s.updateItem);
  const updateParams = useStore((s) => s.updateParams);
  const project = useStore((s) => s.project);
  const def = TYPES[it.type];
  const p = itemParams(it);
  const rigLike = isRig(it);
  const rigFx = rigLike ? project.items.filter((f) => f.type === 'fixture' && f.params.rig === it.id) : [];
  const select = useStore((s) => s.select);
  return (
    <>
      <Common it={it} />
      <div className="sub-card">
        <span className="eyebrow">Position</span>
        <div className="row3">
          <Field label="X">
            <NumIn value={it.x} onChange={(v) => updateItem(it.id, { x: v }, `x-${it.id}`)} />
          </Field>
          <Field label="Y">
            <NumIn value={it.y} onChange={(v) => updateItem(it.id, { y: v }, `y-${it.id}`)} />
          </Field>
          {!it.points && (
            <Field label="Faces °">
              <NumIn value={it.rot} step={15} onChange={(v) => updateItem(it.id, { rot: ((v % 360) + 360) % 360 }, `r-${it.id}`)} />
            </Field>
          )}
        </div>
        {it.points && <span className="muted tiny">Drag the square handles on the plan to reshape. {it.points.length} points.</span>}
        {it.points && (
          <div className="row-flex">
            <button className="btn btn-sm" onClick={() => { const last = it.points![it.points!.length - 1]; updateItem(it.id, { points: [...it.points!, { x: last.x + 6, y: last.y }] }); }}>+ Point</button>
            {it.points.length > 2 && <button className="btn btn-sm" onClick={() => updateItem(it.id, { points: it.points!.slice(0, -1) })}>− Last point</button>}
          </div>
        )}
      </div>
      <div className="sub-card">
        <span className="eyebrow">Properties</span>
        {Object.entries(p)
          .filter(([k]) => !HIDDEN_PARAMS.has(k))
          .map(([k, v]) => (
            <Field key={k} label={PARAM_LABELS[k] || k}>
              {typeof v === 'boolean' ? (
                <input type="checkbox" checked={v} onChange={(e) => updateParams(it.id, { [k]: e.target.checked })} />
              ) : typeof v === 'number' ? (
                <NumIn value={v} step={k === 'tau' || k === 'fullness' || k === 'rho' ? 0.05 : k === 'nits' ? 10 : 0.5} onChange={(nv) => updateParams(it.id, { [k]: nv }, `${k}-${it.id}`)} />
              ) : k === 'color' ? (
                <select className="txt-in" value={v} onChange={(e) => updateParams(it.id, { color: e.target.value })}>
                  <option value="black">Black velour</option>
                  <option value="ivory">Ivory / white</option>
                  <option value="maroon">Maroon</option>
                </select>
              ) : k === 'style' ? (
                <select className="txt-in" value={v} onChange={(e) => updateParams(it.id, { style: e.target.value })}>
                  {['saffron', 'cream', 'maroon', 'photo', 'night'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <input className="txt-in" value={String(v)} onChange={(e) => updateParams(it.id, { [k]: e.target.value }, `${k}-${it.id}`)} />
              )}
            </Field>
          ))}
        {it.type === 'drape' && <span className="muted tiny">{def.describe?.(it).join(' · ')}</span>}
      </div>
      {rigLike && (
        <div className="sub-card">
          <span className="eyebrow">Fixtures on this {it.type === 'drape' ? 'drape light pipe' : 'stand'} ({rigFx.length})</span>
          {rigFx.map((f) => (
            <button key={f.id} className="ref" onClick={() => select(f.id)} style={{ justifyContent: 'flex-start' }}>
              <span className="k">{resolveModel(f.params.model, project.artSpotVariant)?.short}</span> {f.name}
            </button>
          ))}
          <span className="muted tiny">{it.type === 'drape' ? 'Fixtures hang on 12″ side arms clamped to the steel pipe. Drag a fixture on the plan to slide it along the run.' : 'Moving the stand moves its fixtures; their aim points stay where they are (as on site).'}</span>
        </div>
      )}
      {def.describe && it.type !== 'drape' && <p className="muted small" style={{ margin: 0 }}>{def.describe(it).join(' ')}</p>}
    </>
  );
}

function FixtureBody({ it }: { it: Item }) {
  const project = useStore((s) => s.project);
  const updateParams = useStore((s) => s.updateParams);
  const byId = useMemo(() => new Map(project.items.map((i) => [i.id, i])), [project.items]);
  const m = resolveModel(it.params.model, project.artSpotVariant);
  const pos = fixtureWorld(it, byId);
  const aim = it.params.aim || { x: pos.x, y: pos.y + 5, z: 0 };
  const rigs = project.items.filter((i) => isRig(i));
  const ch: Record<string, number> = {};
  for (const c of m.channels) ch[c.key] = (it.params.ch ? it.params.ch[c.key] ?? 0 : m.defaultCh[c.key] ?? 0) * (it.params.dim ?? 1);
  const mix = mixMetrics(m, ch);
  const dist = Math.hypot(aim.x - pos.x, aim.y - pos.y, aim.z - pos.z);
  const beam = m.zoom ? it.params.zoom ?? m.beam : m.beam;
  const field = (beam * m.field) / m.beam;
  const dm = dist * 0.3048;
  // centre-beam lux at the aim point (normal incidence), engine-consistent
  const sig = (beam * DEG) / 2.355;
  const I0 = m.profile === 'flat' ? (mix.lm * project.settings.derate) / (2 * Math.PI * (1 - Math.cos((field * DEG) / 2)) * 0.82) : m.profile === 'lambert' ? (mix.lm * project.settings.derate) / Math.PI : (mix.lm * project.settings.derate) / (2 * Math.PI * sig * sig);
  const luxAim = I0 / (dm * dm);
  const tilt = (Math.atan2(aim.z - pos.z, Math.hypot(aim.x - pos.x, aim.y - pos.y)) * 180) / Math.PI;
  const pan = ((Math.atan2(aim.y - pos.y, aim.x - pos.x) * 180) / Math.PI + 360) % 360;
  const setCh = (k: string, v: number) => updateParams(it.id, { ch: { ...Object.fromEntries(m.channels.map((c) => [c.key, it.params.ch ? it.params.ch[c.key] ?? 0 : m.defaultCh[c.key] ?? 0])), [k]: v } }, `ch-${it.id}-${k}`);
  const models = [...OWNED_KEYS, ...BUY_KEYS];
  return (
    <>
      <Common it={it} />
      <div className="sub-card" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <span className="swatch-lg" style={{ background: rgbCss(mix.rgb), boxShadow: `0 0 18px ${rgbCss(mix.rgb, 0.6)}` }} />
        <div className="stack" style={{ gap: 2 }}>
          <b className="small">{m.name}</b>
          <span className="muted tiny">
            {mix.lm.toFixed(0)} lm (× {project.settings.derate} derate) · CRI ≈ {mix.cri.toFixed(0)} · {mix.watts.toFixed(0)} W · {m.weightLb} lb
          </span>
        </div>
      </div>
      <Field label="Model">
        <select className="txt-in" value={it.params.model} onChange={(e) => {
          const nm = resolveModel(e.target.value, project.artSpotVariant);
          updateParams(it.id, { model: e.target.value, ch: { ...nm.defaultCh } });
        }}>
          <optgroup label="Owned">
            {OWNED_KEYS.map((k) => (
              <option key={k} value={k}>{k === 'artSpot' ? `LED Art Spot (${resolveModel('artSpot', project.artSpotVariant).short})` : FIXTURES[k].short} — owned</option>
            ))}
          </optgroup>
          <optgroup label="Buy (AliExpress)">
            {BUY_KEYS.map((k) => (
              <option key={k} value={k}>{FIXTURES[k].short} — {FIXTURES[k].name}</option>
            ))}
          </optgroup>
        </select>
      </Field>
      <div className="sub-card">
        <span className="eyebrow">Mounting</span>
        <Field label="On stand">
          <select className="txt-in" value={it.params.rig || ''} onChange={(e) => {
            const rid = e.target.value;
            if (!rid) updateParams(it.id, { rig: undefined, mount: 'clamp', h: pos.z });
            else updateParams(it.id, { rig: rid, mount: 'rig', slot: 1, u: byId.get(rid)?.type === 'drape' ? runLength(byId.get(rid)!) / 2 : 0 });
          }}>
            <option value="">— free (floor / clamp) —</option>
            {rigs.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </Field>
        {it.params.rig ? (
          byId.get(it.params.rig)?.type === 'pipebar' || byId.get(it.params.rig)?.type === 'drape' ? (
            <Field label={byId.get(it.params.rig)?.type === 'drape' ? `Along run (0–${runLength(byId.get(it.params.rig)!).toFixed(0)}′)` : 'Along pipe'}>
              <NumIn value={it.params.u ?? 0} step={0.5} onChange={(v) => updateParams(it.id, { u: v }, `u-${it.id}`)} suffix="ft" />
            </Field>
          ) : (
            <Field label="Slot">
              <NumIn value={it.params.slot ?? 0} step={0.5} min={0} max={byId.get(it.params.rig)?.type === 'crank' ? 5 : 3} onChange={(v) => updateParams(it.id, { slot: v }, `slot-${it.id}`)} />
            </Field>
          )
        ) : (
          <>
            <Field label="Mount">
              <select className="txt-in" value={it.params.mount || 'floor'} onChange={(e) => updateParams(it.id, { mount: e.target.value })}>
                <option value="floor">Floor (yoke on floor)</option>
                <option value="clamp">Clamped at height</option>
              </select>
            </Field>
            <div className="row3">
              <Field label="X"><NumIn value={it.x} onChange={(v) => useStore.getState().updateItem(it.id, { x: v }, `fx-${it.id}`)} /></Field>
              <Field label="Y"><NumIn value={it.y} onChange={(v) => useStore.getState().updateItem(it.id, { y: v }, `fy-${it.id}`)} /></Field>
              {it.params.mount === 'clamp' && <Field label="H"><NumIn value={it.params.h ?? 8} onChange={(v) => updateParams(it.id, { h: v }, `fh-${it.id}`)} /></Field>}
            </div>
          </>
        )}
        <span className="muted tiny mono">Lens at {fmtFt(pos.x)}, {fmtFt(pos.y)}, {fmtFt(pos.z)} high</span>
      </div>
      <div className="sub-card">
        <span className="eyebrow">Aim point</span>
        <div className="row3">
          <Field label="X"><NumIn value={aim.x} onChange={(v) => updateParams(it.id, { aim: { ...aim, x: v } }, `ax-${it.id}`)} /></Field>
          <Field label="Y"><NumIn value={aim.y} onChange={(v) => updateParams(it.id, { aim: { ...aim, y: v } }, `ay-${it.id}`)} /></Field>
          <Field label="Z"><NumIn value={aim.z} onChange={(v) => updateParams(it.id, { aim: { ...aim, z: v } }, `az-${it.id}`)} /></Field>
        </div>
        <span className="muted tiny">
          Throw {fmtFt(dist)} ({dm.toFixed(1)} m) · pan {pan.toFixed(0)}° · tilt {tilt.toFixed(0)}° · beam Ø {(2 * dist * Math.tan(((beam / 2) * Math.PI) / 180)).toFixed(1)} ft / field Ø {(2 * dist * Math.tan(((field / 2) * Math.PI) / 180)).toFixed(1)} ft
        </span>
        <span className="small">
          Centre-beam ≈ <b className="mono">{fmtLux(luxAim)}</b> lx at the aim point ({fc(luxAim).toFixed(0)} fc, square-on)
        </span>
      </div>
      <div className="sub-card">
        <span className="eyebrow">Intensity & colour</span>
        <Field label="Dimmer">
          <Slider value={it.params.dim ?? 1} min={0} max={1} step={0.01} onChange={(v) => updateParams(it.id, { dim: v }, `dim-${it.id}`)} fmt={(v) => `${Math.round(v * 100)}%`} />
        </Field>
        {m.channels.map((c) => (
          <Field key={c.key} label={c.label}>
            <div className="row-flex" style={{ flexWrap: 'nowrap', gap: 6 }}>
              <span className="ch-sw" style={{ background: rgbCss(c.rgb) }} />
              <Slider value={it.params.ch ? it.params.ch[c.key] ?? 0 : m.defaultCh[c.key] ?? 0} min={0} max={1} onChange={(v) => setCh(c.key, v)} fmt={(v) => `${Math.round(v * 100)}`} />
            </div>
          </Field>
        ))}
        {m.zoom && (
          <Field label="Zoom">
            <Slider value={it.params.zoom ?? m.beam} min={m.zoom[0]} max={m.zoom[1]} step={1} onChange={(v) => updateParams(it.id, { zoom: v }, `zoom-${it.id}`)} fmt={(v) => `${v}°`} />
          </Field>
        )}
      </div>
      <div className="stack" style={{ gap: 4 }}>
        {m.notes.map((n, i) => (
          <span key={i} className="muted tiny">• {n}</span>
        ))}
      </div>
    </>
  );
}

function SurfaceStats({ itemId }: { itemId: string }) {
  const result = useStore((s) => s.result);
  const surfaces = (result?.surfaces || []).filter((s) => s.itemId === itemId);
  if (!surfaces.length) return null;
  return (
    <div style={{ borderTop: '1px solid var(--ink-3)', padding: '12px 18px 16px', maxHeight: '38%', overflow: 'auto' }}>
      <span className="eyebrow">Measured light on this object</span>
      <div className="stack" style={{ marginTop: 8, gap: 6 }}>
        {surfaces.map((s) => (
          <div key={s.id} className="row-flex" style={{ gap: 8, flexWrap: 'nowrap' }}>
            <span className="dotv" style={{ background: VERDICT_COLOR[s.verdict] }} />
            <span className="small trunc" style={{ flex: 1 }}>{s.name}</span>
            <span className="mono small">{fmtLux(s.avg)} lx</span>
            <span className="muted-3 tiny mono">{fmtLux(s.min)}–{fmtLux(s.max)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProbeInspector({ id }: { id: string }) {
  const project = useStore((s) => s.project);
  const result = useStore((s) => s.result);
  const select = useStore((s) => s.select);
  const updateProbe = useStore((s) => s.updateProbe);
  const removeProbe = useStore((s) => s.removeProbe);
  const pr = project.probes.find((p) => p.id === id);
  const r = result?.probes.find((p) => p.id === id);
  if (!pr) return null;
  return (
    <aside className="drawer inspector">
      <div className="drawer-head">
        <div style={{ flex: 1 }}>
          <div className="eyebrow">Person / face check</div>
          <h3>{pr.name}</h3>
        </div>
        <button className="btn icon-btn btn-ghost" onClick={() => select(null)}>
          <Icon.close size={16} />
        </button>
      </div>
      <div className="drawer-body">
        <Field label="Name">
          <input className="txt-in" value={pr.name} onChange={(e) => updateProbe(id, { name: e.target.value }, `pn-${id}`)} />
        </Field>
        <div className="row3">
          <Field label="X"><NumIn value={pr.x} onChange={(v) => updateProbe(id, { x: v }, `px-${id}`)} /></Field>
          <Field label="Y"><NumIn value={pr.y} onChange={(v) => updateProbe(id, { y: v }, `py-${id}`)} /></Field>
          <Field label="Faces °"><NumIn value={pr.facing} step={15} onChange={(v) => updateProbe(id, { facing: ((v % 360) + 360) % 360 }, `pf-${id}`)} /></Field>
        </div>
        <Field label="Face height">
          <select className="txt-in" value={String(pr.heightFt ?? project.settings.faceHeightFt)} onChange={(e) => updateProbe(id, { heightFt: parseFloat(e.target.value) })}>
            <option value={String(project.settings.faceHeightFt)}>Adult ({project.settings.faceHeightFt}′)</option>
            <option value="4">Child (4′)</option>
            <option value="3.6">Seated / wheelchair (3′7″)</option>
          </select>
        </Field>
        {r ? <ProbeReport r={r} /> : <span className="muted">Calculating…</span>}
        <button className="btn btn-sm" style={{ color: '#ff9a8c', alignSelf: 'flex-start' }} onClick={() => removeProbe(id)}>
          <Icon.trash size={13} /> Remove person
        </button>
      </div>
    </aside>
  );
}

export function ProbeReport({ r }: { r: NonNullable<ReturnType<typeof useStore.getState>['result']>['probes'][number] }) {
  const label = { great: 'Photo-ready', good: 'Good for photos', dim: 'Dim — phone will push ISO', dark: 'Too dark for clean photos' }[r.verdict];
  const max = Math.max(...r.contrib.map((c) => c.lux), 1);
  return (
    <>
      <div className="card card-cream" style={{ padding: 14 }}>
        <div className="row-flex" style={{ justifyContent: 'space-between' }}>
          <div className="stat">
            <span className="eyebrow">Light on the face (toward camera)</span>
            <span className="big">{fmtLux(r.face)}<small>lux</small></span>
            <span className="small" style={{ color: 'var(--on-light-2)' }}>{fc(r.face).toFixed(1)} fc · cylindrical {fmtLux(r.cyl)} lx</span>
          </div>
          <span className="pill" style={{ background: VERDICT_COLOR[r.verdict], color: '#1e1b1a', fontWeight: 600 }}>{label}</span>
        </div>
      </div>
      <div className="tiles" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <MiniStat k="Phone ISO" v={r.iso > 6400 ? '6400+' : r.iso.toFixed(0)} sub="f/1.8 · 1/60 s" />
        <MiniStat k="CRI on face" v={r.cri ? r.cri.toFixed(0) : '—'} sub={r.cct ? `${(r.cct / 100).toFixed(0)}00 K` : ''} />
        <MiniStat k="Key elevation" v={`${r.elev.toFixed(0)}°`} sub={`top/face ${r.topRatio.toFixed(1)}×`} />
        <MiniStat k="Left · Right" v={`${fmtLux(r.left)} · ${fmtLux(r.right)}`} sub={`${r.modelling.toFixed(1)}:1`} />
        <MiniStat k="Behind" v={fmtLux(r.back)} sub="back-light" />
        <MiniStat k="Floor" v={fmtLux(r.floor)} sub="at feet" />
      </div>
      {r.issues.length > 0 && (
        <div className="stack" style={{ gap: 6 }}>
          {r.issues.map((s, i) => (
            <div key={i} className="issue"><span className="sev-stripe warning" /> {s}</div>
          ))}
        </div>
      )}
      <div className="stack" style={{ gap: 6 }}>
        <span className="eyebrow">Where the face light comes from</span>
        {r.contrib.map((c, i) => (
          <div key={i} className="row-flex" style={{ gap: 8, flexWrap: 'nowrap' }}>
            <span className="small trunc" style={{ width: 150 }}>{c.name}</span>
            <div className="bar-mini" style={{ flex: 1 }}><span style={{ width: `${(c.lux / max) * 100}%`, background: 'var(--terra)' }} /></div>
            <span className="mono tiny" style={{ width: 54, textAlign: 'right' }}>{fmtLux(c.lux)} lx</span>
          </div>
        ))}
        <span className="muted-3 tiny">+ {fmtLux(r.ind)} lx inter-reflected (bounce) light from the room</span>
      </div>
    </>
  );
}

function MiniStat({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="sub-card" style={{ padding: '9px 11px', gap: 2 }}>
      <span className="eyebrow" style={{ fontSize: 9.5 }}>{k}</span>
      <span className="mono" style={{ fontSize: 15 }}>{v}</span>
      {sub && <span className="muted-3 tiny">{sub}</span>}
    </div>
  );
}
void Pill;
void drapeCounts;
