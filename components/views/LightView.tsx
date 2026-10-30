'use client';
import React, { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { SECTION_MAP, SECTIONS } from '@/lib/content';
import { VERDICT_COLOR, fmtLux, luxCss } from '@/lib/heat';
import { Seg } from '../ui';

const PROBE_LABEL: Record<string, string> = { great: 'Photo-ready', good: 'Good', dim: 'Dim', dark: 'Too dark' };
const SURF_LABEL: Record<string, string> = { ok: 'On target', low: 'Too dim', high: 'Too bright', uneven: 'Uneven', glare: 'Washed out' };

export default function LightView() {
  const project = useStore((s) => s.project);
  const result = useStore((s) => s.result);
  const select = useStore((s) => s.select);
  const selected = useStore((s) => s.selected);
  const setView = useStore((s) => s.setView);
  const [filter, setFilter] = useState<'all' | 'problems'>('all');
  const surfaces = useMemo(() => {
    const s = result?.surfaces || [];
    return filter === 'problems' ? s.filter((x) => x.verdict !== 'ok') : s;
  }, [result, filter]);
  if (!result) return <div className="view"><div className="empty">Calculating…</div></div>;
  const secOrder = SECTIONS.map((s) => s.id as string).concat(['infra']);
  const grouped = secOrder.map((id) => ({ id, rows: surfaces.filter((s) => s.section === id) })).filter((g) => g.rows.length);
  return (
    <div className="view">
      <div className="section-title">
        <h1 className="h-display">Photo & lux check</h1>
        <span className="muted small">Faces are measured on a vertical plane at {project.settings.faceHeightFt}′ pointing toward the camera; phone ISO assumes f/1.8 at 1/60 s. Click a row to inspect it.</span>
      </div>

      <div className="card" style={{ marginBottom: 12, padding: 0 }}>
        <div className="row-flex" style={{ padding: '14px 18px 8px', justifyContent: 'space-between' }}>
          <h2 className="h2">People — can a photo be taken here?</h2>
          <button className="btn btn-sm" onClick={() => setView('plan')}>Add people on the plan →</button>
        </div>
        <div className="tbl-wrap" style={{ border: 0, borderRadius: 0 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Spot</th>
                <th>Verdict</th>
                <th className="num">Face lx</th>
                <th className="num">Cyl lx</th>
                <th className="num">ISO</th>
                <th className="num">CRI</th>
                <th className="num">CCT</th>
                <th className="num">Key elev</th>
                <th>Main light</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {result.probes.map((p) => (
                <tr key={p.id} className={`row ${selected === p.id ? 'sel' : ''}`} onClick={() => select(p.id)}>
                  <td>
                    <span className="chip-sec"><i style={{ background: SECTION_MAP[project.probes.find((q) => q.id === p.id)?.section || 'infra']?.color || '#777' }} />{p.name}</span>
                  </td>
                  <td><span className="row-flex" style={{ gap: 6 }}><span className="dotv" style={{ background: VERDICT_COLOR[p.verdict] }} />{PROBE_LABEL[p.verdict]}</span></td>
                  <td className="num"><b>{fmtLux(p.face)}</b></td>
                  <td className="num">{fmtLux(p.cyl)}</td>
                  <td className="num">{p.iso > 6400 ? '6400+' : p.iso.toFixed(0)}</td>
                  <td className="num">{p.cri ? p.cri.toFixed(0) : '—'}</td>
                  <td className="num">{p.cct ? Math.round(p.cct / 100) * 100 : '—'}</td>
                  <td className="num">{p.elev.toFixed(0)}°</td>
                  <td className="trunc" style={{ maxWidth: 180 }}>{p.contrib[0]?.name || '—'}</td>
                  <td className="wrap muted small" style={{ maxWidth: 380 }}>{p.issues[0] || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="row-flex" style={{ padding: '14px 18px 8px', justifyContent: 'space-between' }}>
          <h2 className="h2">Posters, panels, banners & exhibits</h2>
          <Seg value={filter} onChange={setFilter} options={[{ v: 'all', label: 'All' }, { v: 'problems', label: 'Needs attention' }]} />
        </div>
        <div className="tbl-wrap" style={{ border: 0, borderRadius: 0 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Surface</th>
                <th>Verdict</th>
                <th className="num">Avg lx</th>
                <th>Range vs target</th>
                <th className="num">Min/avg</th>
                <th className="num">CRI</th>
                <th className="num">CCT</th>
                <th>Lit by</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((g) => (
                <React.Fragment key={g.id}>
                  <tr>
                    <td colSpan={8} style={{ background: 'var(--ink-2)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--on-dark-3)' }}>
                      {SECTION_MAP[g.id as keyof typeof SECTION_MAP]?.num ? `${SECTION_MAP[g.id as keyof typeof SECTION_MAP].num} · ` : ''}
                      {SECTION_MAP[g.id as keyof typeof SECTION_MAP]?.title || 'Other'}
                    </td>
                  </tr>
                  {g.rows.map((s) => {
                    const scale = Math.max(s.target[1] * 1.6, s.max * 1.05, 50);
                    return (
                      <tr key={s.id} className={`row ${selected === s.itemId ? 'sel' : ''}`} onClick={() => select(s.itemId)}>
                        <td className="trunc" style={{ maxWidth: 280 }}>{s.name}</td>
                        <td><span className="row-flex" style={{ gap: 6 }}><span className="dotv" style={{ background: VERDICT_COLOR[s.verdict] }} />{s.kind === 'diorama' || s.kind === 'screen' || s.kind === 'mirror' ? (s.verdict === 'glare' ? 'Washed out' : 'Self-lit ok') : SURF_LABEL[s.verdict]}</span></td>
                        <td className="num"><b>{fmtLux(s.avg)}</b></td>
                        <td style={{ minWidth: 160 }}>
                          <div className="bar-mini" style={{ height: 10 }}>
                            <div className="band" style={{ left: `${(s.target[0] / scale) * 100}%`, width: `${((s.target[1] - s.target[0]) / scale) * 100}%` }} />
                            <span style={{ left: `${(s.min / scale) * 100}%`, width: `${Math.max(1.5, ((s.max - s.min) / scale) * 100)}%`, background: luxCss(s.avg) }} />
                          </div>
                        </td>
                        <td className="num">{s.uni.toFixed(2)}</td>
                        <td className="num">{s.cri ? s.cri.toFixed(0) : '—'}</td>
                        <td className="num">{s.cct ? Math.round(s.cct / 100) * 100 : '—'}</td>
                        <td className="muted small trunc" style={{ maxWidth: 260 }}>{s.top.slice(0, 2).map((t) => `${t.name} ${fmtLux(t.lux)}`).join(' · ')}</td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row-flex muted small" style={{ padding: '10px 18px 14px' }}>
          Bounce light added per space: {result.zones.map((z, i) => `${z.name} ${fmtLux(result.zoneInd[i])} lx`).join(' · ')}
        </div>
      </div>
    </div>
  );
}
