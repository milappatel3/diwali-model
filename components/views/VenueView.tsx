'use client';
import React, { useRef, useState } from 'react';
import { useStore, OLD_KEYS } from '@/lib/store';
import { HALL_FACTS, OPENINGS } from '@/lib/hall';
import { Field, NumIn, Slider, Icon } from '../ui';
import { buildScene, evalProbe, indirect } from '@/lib/engine';
import type { Project } from '@/lib/types';

export default function VenueView() {
  const project = useStore((s) => s.project);
  const commit = useStore((s) => s.commit);
  const resetProject = useStore((s) => s.resetProject);
  const loadFromJSON = useStore((s) => s.loadFromJSON);
  const fileRef = useRef<HTMLInputElement>(null);
  const [meter, setMeter] = useState(250);
  const [msg, setMsg] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [oldPlan] = useState<string | null>(() => { try { if (typeof window === 'undefined') return null; for (const k of OLD_KEYS) { const v = window.localStorage.getItem(k); if (v) return v; } return null; } catch { return null; } });
  const S = project.settings, H = project.house;
  const setS = (patch: Partial<typeof S>, key?: string) => commit((p) => ({ ...p, settings: { ...p.settings, ...patch } }), key);
  const setH = (patch: Partial<typeof H>, key?: string) => commit((p) => ({ ...p, house: { ...p.house, ...patch } }), key);

  const calibrate = () => {
    // measure the model's floor lux at hall centre with house lights only at 100%, then scale lumens
    const p: Project = JSON.parse(JSON.stringify(project));
    p.items = [];
    p.house = { ...p.house, enabled: true, level: 1 };
    const sc = buildScene(p);
    const ind = indirect(sc);
    const r = evalProbe(sc, ind, { id: 'c', name: 'c', x: 60, y: 47.6, facing: 0, heightFt: 0.1 });
    const modelled = r.top;
    if (modelled > 0) {
      const k = meter / modelled;
      setH({ lumensEach: Math.round(H.lumensEach * k) });
      setMsg(`Model gave ${modelled.toFixed(0)} lx at full; house fixtures rescaled ×${k.toFixed(2)} to ${Math.round(H.lumensEach * k).toLocaleString()} lm each.`);
    }
  };
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'diwali-exhibition-2026.lightplot.json';
    a.click();
  };
  return (
    <div className="view">
      <div className="section-title">
        <h1 className="h-display">Venue & settings</h1>
        <span className="muted small">The Assembly Hall as read from the drawing, plus the room assumptions every lux number depends on.</span>
      </div>
      <div className="grid-2">
        <div className="card">
          <h2 className="h2" style={{ marginBottom: 10 }}>Assembly Hall — from the DWG</h2>
          <dl className="kv">
            {HALL_FACTS.map(([k, v]) => (
              <React.Fragment key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </React.Fragment>
            ))}
            <dt>Origin</dt>
            <dd className="mono small">DWG (45224.6, 815.3) in = hall SW interior corner</dd>
          </dl>
          <h2 className="h2" style={{ margin: '16px 0 8px' }}>Doors & openings</h2>
          <div className="tbl-wrap" style={{ maxHeight: 280 }}>
            <table className="tbl">
              <thead><tr><th>ID</th><th>Wall</th><th className="num">From</th><th className="num">Width</th><th>What</th></tr></thead>
              <tbody>
                {OPENINGS.map((o) => (
                  <tr key={o.id}><td className="mono">{o.id}</td><td>{o.wall}</td><td className="num">{o.a.toFixed(1)}′</td><td className="num">{(o.b - o.a).toFixed(1)}′</td><td className="muted small">{o.label}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="stack" style={{ gap: 12 }}>
          <div className="card">
            <h2 className="h2" style={{ marginBottom: 10 }}>Room</h2>
            <div className="stack" style={{ gap: 8 }}>
              <Field label="Ceiling height"><NumIn value={S.ceilingFt} step={0.5} onChange={(v) => setS({ ceilingFt: v }, 'ceil')} suffix="ft" /></Field>
              <Field label="Stage height"><NumIn value={S.stageHeightFt} step={0.25} onChange={(v) => setS({ stageHeightFt: v }, 'stage')} suffix="ft" /></Field>
              <Field label="Floor">
                <select className="txt-in" value={S.floorFinish} onChange={(e) => setS({ floorFinish: e.target.value as any })}>
                  <option value="carpet">Carpet (dark, ρ 0.15)</option>
                  <option value="vinyl">Vinyl / VCT (ρ 0.35)</option>
                  <option value="concrete">Sealed concrete (ρ 0.30)</option>
                </select>
              </Field>
              <Field label="Wall reflectance"><Slider value={S.wallRho} min={0.1} max={0.9} onChange={(v) => setS({ wallRho: v }, 'wall')} /></Field>
              <Field label="Ceiling reflectance"><Slider value={S.ceilingRho} min={0.05} max={0.9} onChange={(v) => setS({ ceilingRho: v }, 'crho')} /></Field>
              <Field label="Face height"><NumIn value={S.faceHeightFt} step={0.25} onChange={(v) => setS({ faceHeightFt: v }, 'face')} suffix="ft" /></Field>
              <Field label="Fixture derate"><Slider value={S.derate} min={0.5} max={1} onChange={(v) => setS({ derate: v }, 'derate')} fmt={(v) => `×${v.toFixed(2)}`} /></Field>
              <Field label="Calc grid">
                <select className="txt-in" value={String(S.gridFt)} onChange={(e) => setS({ gridFt: parseFloat(e.target.value) })}>
                  <option value="3">3 ft (fast)</option>
                  <option value="2">2 ft</option>
                  <option value="1">1 ft (detailed, slower)</option>
                </select>
              </Field>
              <Field label="Bounce light"><input type="checkbox" checked={S.bounce} onChange={(e) => setS({ bounce: e.target.checked })} /></Field>
            </div>
          </div>
          <div className="card">
            <h2 className="h2" style={{ marginBottom: 10 }}>House lights (existing)</h2>
            <div className="stack" style={{ gap: 8 }}>
              <Field label="On"><input type="checkbox" checked={H.enabled} onChange={(e) => setH({ enabled: e.target.checked })} /></Field>
              <Field label="Level"><Slider value={H.level} min={0} max={1} onChange={(v) => setH({ level: v }, 'hlevel')} fmt={(v) => `${Math.round(v * 100)}%`} /></Field>
              <div className="row3">
                <Field label="Rows"><NumIn value={H.rows} step={1} onChange={(v) => setH({ rows: Math.max(1, Math.round(v)) })} /></Field>
                <Field label="Cols"><NumIn value={H.cols} step={1} onChange={(v) => setH({ cols: Math.max(1, Math.round(v)) })} /></Field>
                <Field label="CCT"><NumIn value={H.cct} step={100} onChange={(v) => setH({ cct: v }, 'hcct')} /></Field>
              </div>
              <Field label="Lumens each"><NumIn value={H.lumensEach} step={500} onChange={(v) => setH({ lumensEach: v }, 'hlm')} /></Field>
              <div className="sub-card">
                <span className="eyebrow">Calibrate with a lux meter</span>
                <span className="small muted">House lights at 100%, exhibition lights off, meter flat on the floor in the middle of the hall:</span>
                <div className="row-flex">
                  <div style={{ width: 120 }}><NumIn value={meter} step={10} onChange={setMeter} suffix="lx" /></div>
                  <button className="btn btn-sm btn-terra" onClick={calibrate}>Calibrate</button>
                </div>
                {msg && <span className="tiny muted">{msg}</span>}
              </div>
            </div>
          </div>
          <div className="card card-flat">
            <h2 className="h2" style={{ marginBottom: 10 }}>Project file</h2>
            <div className="row-flex">
              <button className="btn btn-sm" onClick={exportJSON}><Icon.download size={14} /> Export</button>
              <button className="btn btn-sm" onClick={() => fileRef.current?.click()}><Icon.upload size={14} /> Import</button>
              <button className="btn btn-sm" onClick={async () => { try { await navigator.clipboard.writeText(JSON.stringify(project)); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard refused */ } }}><Icon.copy size={14} /> {copied ? 'Copied' : 'Copy project'}</button>
              <button className="btn btn-sm" style={armed ? { color: '#ff9a8c', borderColor: '#ff9a8c' } : undefined} onClick={() => { if (armed) { resetProject(); setArmed(false); } else { setArmed(true); setTimeout(() => setArmed(false), 4000); } }}><Icon.reset size={14} /> {armed ? 'Click again to replace your plan' : 'Reset to first pass'}</button>
              <input ref={fileRef} type="file" accept=".json" hidden onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try { loadFromJSON(JSON.parse(await f.text())); } catch { alert('Not a Lightplot project file'); }
              }} />
            </div>
            <span className="muted-3 tiny" style={{ display: 'block', marginTop: 8 }}>Changes save in this browser automatically.</span>
            {oldPlan && (
              <div className="row-flex" style={{ marginTop: 8 }}>
                <button className="btn btn-sm" onClick={() => { try { const p = JSON.parse(oldPlan); if (p && Array.isArray(p.items)) loadFromJSON(p); } catch { /* unreadable */ } }}><Icon.upload size={14} /> Load my previously saved plan</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
