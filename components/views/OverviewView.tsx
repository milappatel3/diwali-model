'use client';
import React, { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { SECTIONS } from '@/lib/content';
import { computeBom, fixtureRows, rigLoads } from '@/lib/bom';
import { drapeCounts } from '@/lib/catalog';
import { VERDICT_COLOR, fmtLux } from '@/lib/heat';
import { OPENINGS } from '@/lib/hall';

export default function OverviewView() {
  const project = useStore((s) => s.project);
  const result = useStore((s) => s.result);
  const setView = useStore((s) => s.setView);
  const select = useStore((s) => s.select);
  const bom = useMemo(() => computeBom(project), [project]);
  const rows = useMemo(() => fixtureRows(project), [project]);
  const loads = useMemo(() => rigLoads(project), [project]);
  const drapeFt = project.items.filter((i) => i.type === 'drape').reduce((a, i) => a + drapeCounts(i).length, 0);
  const probes = result?.probes || [];
  const surfaces = (result?.surfaces || []).filter((s) => s.kind !== 'diorama' && s.kind !== 'screen' && s.kind !== 'mirror');
  const ok = surfaces.filter((s) => s.verdict === 'ok').length;
  const photoReady = probes.filter((p) => p.verdict === 'great' || p.verdict === 'good').length;
  const maxW = rows.reduce((a, r) => a + r.wattsMax, 0);
  const nowW = rows.reduce((a, r) => a + r.watts, 0);
  const circuits = new Set(rows.map((r) => r.circuit)).size;
  const toBuyFx = bom.fixtureUse.reduce((a, f) => a + f.toBuy, 0);
  const usedOwned = bom.fixtureUse.reduce((a, f) => a + Math.min(f.used, f.owned), 0);

  const issues = useMemo(() => {
    const out: { sev: 'error' | 'warning' | 'info'; text: string; id?: string }[] = [];
    for (const s of result?.surfaces || []) {
      if (s.verdict === 'low' && s.avg < s.target[0] * 0.6) out.push({ sev: 'warning', text: `${s.name}: ${fmtLux(s.avg)} lx — target ${s.target[0]}–${s.target[1]}`, id: s.itemId });
      if (s.verdict === 'glare') out.push({ sev: 'warning', text: `${s.name}: ${fmtLux(s.avg)} lx of stray light will wash it out`, id: s.itemId });
    }
    for (const p of probes) if (p.verdict === 'dark' && !/Beliefs|aisle/i.test(p.name)) out.push({ sev: 'info', text: `${p.name}: ${fmtLux(p.face)} lx on faces — ${p.issues[0] || 'add a face light if photos happen here'}`, id: p.id });
    for (const l of loads) if (!l.ok) out.push({ sev: 'error', text: `${l.rig.name} carries ${l.lb.toFixed(0)} lb — over 80% of its ${l.cap} lb rating`, id: l.rig.id });
    return out.slice(0, 12);
  }, [result, probes, loads]);

  return (
    <div className="view">
      <div className="section-title" style={{ alignItems: 'flex-end' }}>
        <div className="stack" style={{ gap: 4 }}>
          <span className="eyebrow">First pass · Assembly Hall · 119′6″ × 95′2″</span>
          <h1 className="h-display" style={{ fontSize: 52 }}>Diwali Exhibition 2026</h1>
        </div>
        <span className="muted small" style={{ maxWidth: 560 }}>
          Laid out from your sketch — Foyer entrance to the south-west exit, every exit kept clear. Light is calculated from real beam data for your fixtures, with shadows and bounce, so the numbers below are lux you could check with a meter.
        </span>
      </div>

      <div className="tiles" style={{ marginBottom: 12 }}>
        <div className="card card-cream">
          <div className="stat">
            <span className="eyebrow">Photo spots ready</span>
            <span className="big">{photoReady}<small>of {probes.length}</small></span>
            <span className="small" style={{ color: 'var(--on-light-2)' }}>faces ≥ 150 lx toward the camera</span>
          </div>
        </div>
        <div className="card">
          <div className="stat">
            <span className="eyebrow">Posters & panels on target</span>
            <span className="big">{ok}<small>of {surfaces.length}</small></span>
            <span className="small muted">lux inside each object’s target band</span>
          </div>
        </div>
        <div className="card">
          <div className="stat">
            <span className="eyebrow">Fixtures</span>
            <span className="big">{rows.length}</span>
            <span className="small muted">{usedOwned} from your kit · {toBuyFx} to buy</span>
          </div>
        </div>
        <div className="card card-terra">
          <div className="stat">
            <span className="eyebrow">To buy (AliExpress est.)</span>
            <span className="big" style={{ fontSize: 34 }}>${bom.cost[0].toLocaleString()}–{bom.cost[1].toLocaleString()}</span>
            <span className="small" style={{ color: '#6f4430' }}>lights, stands, drape, banners, print</span>
          </div>
        </div>
        <div className="card">
          <div className="stat">
            <span className="eyebrow">Power</span>
            <span className="big">{(nowW / 1000).toFixed(1)}<small>kW as set</small></span>
            <span className="small muted">{(maxW / 1000).toFixed(1)} kW all-full · {circuits} × 15 A circuits</span>
          </div>
        </div>
        <div className="card">
          <div className="stat">
            <span className="eyebrow">Pipe & drape</span>
            <span className="big">{drapeFt.toFixed(0)}<small>linear ft</small></span>
            <span className="small muted">{project.items.filter((i) => i.type === 'banner').length} stretch banners · {project.items.filter((i) => i.type === 'poster' || i.type === 'posterStand').length} posters</span>
          </div>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 12 }}>
        {SECTIONS.map((s) => {
          const ss = (result?.surfaces || []).filter((x) => x.section === s.id && x.kind !== 'diorama' && x.kind !== 'screen' && x.kind !== 'mirror');
          const ps = probes.filter((p) => project.probes.find((q) => q.id === p.id)?.section === s.id);
          const fx = rows.filter((r) => r.section === s.id);
          const avg = ss.length ? ss.reduce((a, x) => a + x.avg, 0) / ss.length : 0;
          return (
            <div key={s.id} className="card sec-card" onClick={() => { setView('plan'); const main = project.items.find((i) => i.section === s.id && !['fixture', 'tbar', 'crank', 'signStand', 'pipebar'].includes(i.type)); if (main) select(main.id); }}>
              <div className="row-flex" style={{ justifyContent: 'space-between' }}>
                <span className="chip-sec"><i style={{ background: s.color }} />{s.num ? `Section ${s.num}` : s.sub}</span>
                <span className="muted-3 tiny">{fx.length} lights</span>
              </div>
              <h2 className="h-display" style={{ fontSize: 26, margin: '8px 0 4px' }}>{s.title}</h2>
              <p className="muted small" style={{ margin: '0 0 10px', minHeight: 36 }}>{s.num ? s.sub : s.core}</p>
              <div className="row-flex" style={{ gap: 14 }}>
                {ss.length > 0 && (
                  <span className="small"><span className="mono">{fmtLux(avg)}</span> <span className="muted">lx on graphics</span> <span className="muted-3">({ss.filter((x) => x.verdict === 'ok').length}/{ss.length} ok)</span></span>
                )}
                {ps.map((p) => (
                  <span key={p.id} className="small" title={p.name}>
                    <span className="dotv" style={{ background: VERDICT_COLOR[p.verdict], marginRight: 5 }} />
                    <span className="mono">{fmtLux(p.face)}</span> <span className="muted">lx face</span>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="section-title" style={{ margin: '0 0 10px' }}>
            <h2 className="h2">Worth fixing next</h2>
            <span className="muted-3 tiny">from the live calculation</span>
          </div>
          {!result && <div className="empty">Calculating…</div>}
          {result && issues.length === 0 && <div className="empty">Nothing outstanding.</div>}
          {issues.map((i, k) => (
            <div key={k} className="issue" style={{ cursor: i.id ? 'pointer' : 'default' }} onClick={() => { if (i.id) { setView('plan'); select(i.id); } }}>
              <span className={`sev-stripe ${i.sev}`} />
              <span>{i.text}</span>
            </div>
          ))}
        </div>
        <div className="card card-flat">
          <h2 className="h2" style={{ marginBottom: 10 }}>Assumptions to confirm on site</h2>
          <div className="stack small" style={{ gap: 8 }}>
            <span>• <b>Ceiling {project.settings.ceilingFt}′</b> — the drawing is 2D; neighbouring California Circle flex buildings are 20–22′ clear. Changes bounce light and how high you can rig.</span>
            <span>• <b>House lights at {Math.round(project.house.level * 100)}%</b> of an assumed {project.house.rows * project.house.cols} × {project.house.lumensEach.toLocaleString()} lm grid. One lux-meter reading fixes this in Venue & settings.</span>
            <span>• <b>Stage +{project.settings.stageHeightFt}′</b> (6 risers on the drawn stairs). Carpet floor, walls ≈ 60% reflectance.</span>
            <span>• <b>Quantities you own:</b> {Object.entries(project.inventory).map(([k, v]) => `${v}× ${k === 'artSpot' ? 'art spot' : k.replace(/([A-Z])/g, ' $1').toLowerCase()}`).join(', ')}. The “LED Art Spot” is modelled as a {project.artSpotVariant === 'framing20' ? '20 W framing spot' : project.artSpotVariant === 'pinspot10' ? '10 W pinspot' : '30 W gallery spot'}. Edit both in Fixtures & patch.</span>
            <span>• Every drape and fabric in an assembly hall needs a flame certificate (NFPA 701 / CA Title 19). AliExpress drape rarely has one.</span>
            <span>• {OPENINGS.filter((o) => o.exit).length} exits are kept clear with 5′ landings; the plan flags anything that blocks one.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
