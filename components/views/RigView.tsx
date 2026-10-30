'use client';
import React, { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { fixtureRows, rigLoads, computeBom, aliLink } from '@/lib/bom';
import { FIXTURES, OWNED_KEYS, BUY_KEYS, resolveModel } from '@/lib/fixtures';
import { SECTION_MAP } from '@/lib/content';
import { rgbCss, NumIn } from '../ui';
import { fmtFt } from '@/lib/geom';

export default function RigView() {
  const project = useStore((s) => s.project);
  const commit = useStore((s) => s.commit);
  const select = useStore((s) => s.select);
  const selected = useStore((s) => s.selected);
  const rows = useMemo(() => fixtureRows(project), [project]);
  const loads = useMemo(() => rigLoads(project), [project]);
  const bom = useMemo(() => computeBom(project), [project]);
  const circuits = useMemo(() => {
    const m = new Map<string, { w: number; max: number; n: number }>();
    for (const r of rows) {
      const c = m.get(r.circuit) || { w: 0, max: 0, n: 0 };
      c.w += r.watts;
      c.max += r.wattsMax;
      c.n++;
      m.set(r.circuit, c);
    }
    return [...m.entries()];
  }, [rows]);
  const setInv = (k: string, v: number) => commit((p) => ({ ...p, inventory: { ...p.inventory, [k]: Math.max(0, Math.round(v)) } }), `inv-${k}`);
  return (
    <div className="view">
      <div className="section-title">
        <h1 className="h-display">Fixtures & patch</h1>
        <span className="muted small">Your kit, what the design uses, what to buy, DMX addresses, stand loads and power.</span>
      </div>
      <div className="grid-2" style={{ marginBottom: 12 }}>
        <div className="card">
          <h2 className="h2" style={{ marginBottom: 10 }}>Your kit vs. the design</h2>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Fixture</th><th className="num">Owned</th><th className="num">Used</th><th className="num">Spare / buy</th></tr>
              </thead>
              <tbody>
                {[...OWNED_KEYS, ...BUY_KEYS].map((k) => {
                  const m = resolveModel(k, project.artSpotVariant);
                  const u = bom.fixtureUse.find((f) => f.key === k);
                  const owned = project.inventory[k] ?? 0;
                  const used = u?.used ?? 0;
                  const diff = owned - used;
                  return (
                    <tr key={k}>
                      <td>
                        <div className="stack" style={{ gap: 1 }}>
                          <span>{k === 'artSpot' ? 'LED Art Spot' : m.short} <span className="muted-3 tiny">{OWNED_KEYS.includes(k as any) ? 'owned type' : 'AliExpress'}</span></span>
                          <span className="muted-3 tiny trunc" style={{ maxWidth: 300 }}>{m.name}</span>
                        </div>
                      </td>
                      <td className="num" style={{ width: 90 }}><NumIn value={owned} step={1} min={0} onChange={(v) => setInv(k, v)} /></td>
                      <td className="num">{used}</td>
                      <td className="num">{diff >= 0 ? <span className="muted">{diff} spare</span> : <a className="link" href={aliLink(m.ali || m.name)} target="_blank" rel="noreferrer">buy {-diff}</a>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="field" style={{ marginTop: 10, gridTemplateColumns: '150px 1fr' }}>
            <label>“LED Art Spot” is a…</label>
            <select className="txt-in" value={project.artSpotVariant} onChange={(e) => commit((p) => ({ ...p, artSpotVariant: e.target.value as any }))}>
              <option value="framing20">20 W mini profile with shutters (warm/cool)</option>
              <option value="pinspot10">10 W RGBW pinspot (≈ 6° beam)</option>
              <option value="gallery30">30 W gallery spot 3000 K CRI 90</option>
            </select>
          </div>
        </div>
        <div className="card">
          <h2 className="h2" style={{ marginBottom: 10 }}>Stands & loads</h2>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Stand</th><th className="num">Height</th><th className="num">Fixtures</th><th className="num">Load</th><th className="num">Watts</th></tr></thead>
              <tbody>
                {loads.map((l) => (
                  <tr key={l.rig.id} className={`row ${selected === l.rig.id ? 'sel' : ''}`} onClick={() => select(l.rig.id)}>
                    <td>{l.rig.name} <span className="muted-3 tiny">{l.rig.type === 'tbar' ? 'T-bar' : l.rig.type === 'crank' ? 'crank' : l.rig.type === 'drape' ? 'drape light pipe' : 'light pipe'}</span></td>
                    <td className="num">{fmtFt(l.rig.params.h ?? 11)}</td>
                    <td className="num">{l.fixtures.length}</td>
                    <td className="num" style={{ color: l.ok ? undefined : '#ff9a8c' }}>{l.lb.toFixed(0)} / {l.cap} lb</td>
                    <td className="num">{l.watts.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h2 className="h2" style={{ margin: '14px 0 8px' }}>Power (15 A · 120 V circuits, 1,440 W continuous)</h2>
          <div className="stack" style={{ gap: 6 }}>
            {circuits.map(([c, v]) => (
              <div key={c} className="row-flex" style={{ gap: 10, flexWrap: 'nowrap' }}>
                <span className="mono small" style={{ width: 70 }}>{c}</span>
                <div className="bar-mini" style={{ flex: 1, height: 8 }}>
                  <span style={{ width: `${Math.min(100, (v.max / 1440) * 100)}%`, background: v.max > 1440 ? 'var(--err)' : 'var(--ink-line)' }} />
                  <span style={{ width: `${Math.min(100, (v.w / 1440) * 100)}%`, background: 'var(--terra)' }} />
                </div>
                <span className="mono tiny" style={{ width: 130, textAlign: 'right' }}>{v.w.toFixed(0)} W set · {v.max.toFixed(0)} max</span>
              </div>
            ))}
            <span className="muted-3 tiny">Ask the facility which wall receptacles share a breaker; keep each group under 1,440 W at full.</span>
          </div>
        </div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="row-flex" style={{ padding: '14px 18px 8px', justifyContent: 'space-between' }}>
          <h2 className="h2">Patch — every fixture</h2>
          <span className="muted-3 tiny">{rows.filter((r) => r.dmxCh).reduce((a, r) => a + r.dmxCh, 0)} DMX channels · universe {Math.max(1, ...rows.map((r) => r.universe))}</span>
        </div>
        <div className="tbl-wrap" style={{ border: 0, borderRadius: 0 }}>
          <table className="tbl">
            <thead>
              <tr><th>Fixture</th><th>Section</th><th>Type</th><th>Stand</th><th className="num">Lens ht</th><th className="num">Throw</th><th className="num">Dim</th><th className="num">Lumens</th><th className="num">CRI</th><th className="num">W</th><th className="num">DMX</th><th>Circuit</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const it = project.items.find((i) => i.id === r.id)!;
                return (
                  <tr key={r.id} className={`row ${selected === r.id ? 'sel' : ''}`} onClick={() => select(r.id)}>
                    <td><span className="row-flex" style={{ gap: 7, flexWrap: 'nowrap' }}><span className="ch-sw" style={{ background: rgbCss(r.rgb), boxShadow: `0 0 8px ${rgbCss(r.rgb, 0.7)}` }} />{r.name}</span></td>
                    <td><span className="chip-sec"><i style={{ background: SECTION_MAP[r.section]?.color }} />{SECTION_MAP[r.section]?.num ? `S${SECTION_MAP[r.section].num}` : SECTION_MAP[r.section]?.title}</span></td>
                    <td>{r.modelKey === 'artSpot' ? 'Art Spot' : r.model.short}{!FIXTURES[r.modelKey]?.owned && r.modelKey !== 'artSpot' ? <span className="muted-3 tiny"> buy</span> : ''}</td>
                    <td className="muted">{r.rig?.name || (it.params.mount === 'clamp' ? 'clamped' : 'floor')}</td>
                    <td className="num">{fmtFt(r.pos.z)}</td>
                    <td className="num">{fmtFt(r.throwFt)}</td>
                    <td className="num">{Math.round((it.params.dim ?? 1) * 100)}%</td>
                    <td className="num">{r.lm.toFixed(0)}</td>
                    <td className="num">{r.cri ? r.cri.toFixed(0) : '—'}</td>
                    <td className="num">{r.watts.toFixed(0)}</td>
                    <td className="num">{r.address ? `${r.universe}.${String(r.address).padStart(3, '0')}` : '—'}</td>
                    <td className="mono small">{r.circuit}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
