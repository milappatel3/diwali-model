'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { SECTIONS, SAMSKARAS, FESTIVALS, NODES, VALUES, HOUSE_AREAS, PANEL_COLORS } from '@/lib/content';
import { fmtLux, VERDICT_COLOR } from '@/lib/heat';

export default function ExhibitsView() {
  const project = useStore((s) => s.project);
  const result = useStore((s) => s.result);
  const select = useStore((s) => s.select);
  const setView = useStore((s) => s.setView);
  return (
    <div className="view">
      <div className="section-title">
        <h1 className="h-display">Exhibits</h1>
        <span className="muted small">What each section is, how it is built and what the light has to do — straight from the Final Content Proposal and the content document.</span>
      </div>
      <div className="stack" style={{ gap: 12 }}>
        {SECTIONS.map((s) => {
          const surf = (result?.surfaces || []).filter((x) => x.section === s.id);
          const items = project.items.filter((i) => i.section === s.id && i.type !== 'fixture');
          return (
            <div key={s.id} className="card">
              <div className="row-flex" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="stack" style={{ gap: 4, maxWidth: 760 }}>
                  <span className="chip-sec"><i style={{ background: s.color }} />{s.num ? `Section ${s.num}` : 'Addition'}</span>
                  <h2 className="h-display" style={{ fontSize: 32 }}>{s.title}</h2>
                  <span className="muted">{s.sub}</span>
                </div>
                <button className="btn btn-sm" onClick={() => { setView('plan'); const m = items.find((i) => !['tbar', 'crank', 'signStand', 'pipebar'].includes(i.type)); if (m) select(m.id); }}>Show on plan →</button>
              </div>
              <div className="grid-2" style={{ marginTop: 12 }}>
                <div className="stack prose small" style={{ gap: 8 }}>
                  <div><span className="eyebrow">Core message</span><p>{s.core}</p></div>
                  <div><span className="eyebrow">Medium</span><p>{s.medium}</p></div>
                  <div>
                    <span className="eyebrow">Build</span>
                    {s.build.map((b, i) => <p key={i}>• {b}</p>)}
                  </div>
                </div>
                <div className="stack small" style={{ gap: 8 }}>
                  <div className="sub-card">
                    <span className="eyebrow">Lighting intent</span>
                    {s.lightingIntent.map((b, i) => <span key={i}>• {b}</span>)}
                  </div>
                  {surf.length > 0 && (
                    <div className="sub-card" style={{ maxHeight: 220, overflow: 'auto' }}>
                      <span className="eyebrow">Measured</span>
                      {surf.map((x) => (
                        <div key={x.id} className="row-flex" style={{ gap: 8, flexWrap: 'nowrap', cursor: 'pointer' }} onClick={() => select(x.itemId)}>
                          <span className="dotv" style={{ background: VERDICT_COLOR[x.verdict] }} />
                          <span className="trunc" style={{ flex: 1 }}>{x.name}</span>
                          <span className="mono">{fmtLux(x.avg)} lx</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {s.id === 's1' && (
                <div className="chips" style={{ marginTop: 12 }}>
                  {FESTIVALS.map((f) => (
                    <span key={f.state} className="chip" title={f.obj}><span className="sw" style={{ background: f.color }} />{f.state} → {f.fest}</span>
                  ))}
                </div>
              )}
              {s.id === 's2' && (
                <div className="tbl-wrap" style={{ marginTop: 12, maxHeight: 330 }}>
                  <table className="tbl">
                    <thead><tr><th>#</th><th>Samskara</th><th>Reflection question (lift-flap box)</th><th>Wall</th></tr></thead>
                    <tbody>
                      {SAMSKARAS.map((x, i) => (
                        <tr key={x.name}>
                          <td><span className="sw" style={{ background: PANEL_COLORS[i], marginRight: 6 }} />{i + 1}</td>
                          <td>{x.name} — <span className="muted">{x.title}</span></td>
                          <td className="wrap">{x.q}</td>
                          <td className="muted">{x.wall === 1 ? 'Run A · Life Begins' : 'Run B · Learning & Purpose'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {s.id === 's3' && (
                <div className="chips" style={{ marginTop: 12 }}>
                  {HOUSE_AREAS.map((a) => <span key={a} className="chip">{a}</span>)}
                </div>
              )}
              {s.id === 's4' && (
                <div className="grid-3" style={{ marginTop: 12 }}>
                  {NODES.map((n) => (
                    <div key={n.n} className="sub-card">
                      <span className="eyebrow">Node {n.n} · {n.sub}</span>
                      <b>{n.title}</b>
                      <span className="muted small">{n.exhibit}</span>
                    </div>
                  ))}
                </div>
              )}
              {s.id === 's5' && (
                <div className="chips" style={{ marginTop: 12 }}>
                  {VALUES.map((v) => <span key={v.v} className="chip" title={v.s}><span className="sw" style={{ background: v.c }} />{v.v} — <span className="muted-3">{v.s}</span></span>)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
