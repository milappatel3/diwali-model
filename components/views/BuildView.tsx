'use client';
import React, { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { computeBom, aliLink, bomCSV } from '@/lib/bom';
import { drapeCounts, params as itemParams } from '@/lib/catalog';
import { SECTION_MAP } from '@/lib/content';
import { Icon } from '../ui';
import { fmtFt } from '@/lib/geom';

const CATS = ['Lighting', 'Rigging & stands', 'Pipe & drape', 'Banners & print', 'Crowd control', 'Power & data', 'Practicals', 'Build (by team)'];

export default function BuildView() {
  const project = useStore((s) => s.project);
  const select = useStore((s) => s.select);
  const setView = useStore((s) => s.setView);
  const bom = useMemo(() => computeBom(project), [project]);
  const runs = project.items.filter((i) => i.type === 'drape');
  const banners = project.items.filter((i) => i.type === 'banner' || i.type === 'poster' || i.type === 'posterStand' || i.type === 'signStand');
  const [copied, setCopied] = React.useState(false);
  const copyCsv = async () => {
    try { await navigator.clipboard.writeText(bomCSV(bom)); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard refused */ }
  };
  const download = () => {
    const blob = new Blob([bomCSV(bom)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'diwali-exhibition-2026-build-list.csv';
    a.click();
  };
  return (
    <div className="view">
      <div className="section-title">
        <h1 className="h-display">Build list</h1>
        <span className="muted small">Counted from the plan, so it updates as you move things. Prices are typical AliExpress ranges (USD, before shipping).</span>
        <div className="spacer" style={{ flex: 1 }} />
        <button className="btn btn-sm" onClick={copyCsv}><Icon.copy size={14} /> {copied ? 'Copied' : 'Copy as CSV'}</button>
        <button className="btn btn-sm" onClick={download}><Icon.download size={14} /> CSV file</button>
      </div>
      <div className="tiles" style={{ marginBottom: 12 }}>
        <div className="card card-terra"><div className="stat"><span className="eyebrow">Estimated spend</span><span className="big" style={{ fontSize: 34 }}>${bom.cost[0].toLocaleString()}–{bom.cost[1].toLocaleString()}</span><span className="small" style={{ color: '#6f4430' }}>excluding team-built exhibits & shipping</span></div></div>
        {CATS.slice(0, 5).map((c) => {
          const ls = bom.byCat[c] || [];
          const lo = ls.reduce((a, l) => a + (l.price ? l.price[0] * l.toBuy : 0), 0), hi = ls.reduce((a, l) => a + (l.price ? l.price[1] * l.toBuy : 0), 0);
          return (
            <div key={c} className="card"><div className="stat"><span className="eyebrow">{c}</span><span className="big" style={{ fontSize: 28 }}>${Math.round(lo).toLocaleString()}–{Math.round(hi).toLocaleString()}</span><span className="small muted">{ls.length} line items</span></div></div>
          );
        })}
      </div>
      {CATS.map((c) => {
        const ls = bom.byCat[c];
        if (!ls?.length) return null;
        return (
          <div key={c} className="card" style={{ padding: 0, marginBottom: 12 }}>
            <div style={{ padding: '14px 18px 8px' }}><h2 className="h2">{c}</h2></div>
            <div className="tbl-wrap" style={{ border: 0, borderRadius: 0 }}>
              <table className="tbl">
                <thead><tr><th>Item</th><th className="num">Need</th><th className="num">Owned</th><th className="num">Buy</th><th className="num">Unit $</th><th className="num">Subtotal $</th><th>Where</th></tr></thead>
                <tbody>
                  {ls.map((l) => (
                    <tr key={l.key}>
                      <td className="wrap" style={{ maxWidth: 520 }}>{l.name}{l.note && <div className="muted-3 tiny">{l.note}</div>}</td>
                      <td className="num">{l.qty} {l.unit !== 'ea' ? <span className="muted-3 tiny">{l.unit}</span> : ''}</td>
                      <td className="num">{l.owned || ''}</td>
                      <td className="num"><b>{c === 'Build (by team)' ? '—' : l.toBuy}</b></td>
                      <td className="num">{l.price ? `${l.price[0]}–${l.price[1]}` : '—'}</td>
                      <td className="num">{l.price && l.toBuy ? `${Math.round(l.price[0] * l.toBuy)}–${Math.round(l.price[1] * l.toBuy)}` : '—'}</td>
                      <td>{l.ali ? <a className="link small" href={aliLink(l.ali)} target="_blank" rel="noreferrer">AliExpress search ↗</a> : <span className="muted-3 small">{c === 'Build (by team)' ? 'volunteer build' : 'local'}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      <div className="grid-2">
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 18px 8px' }}><h2 className="h2">Pipe & drape runs</h2></div>
          <table className="tbl">
            <thead><tr><th>Run</th><th className="num">Length</th><th className="num">Height</th><th>Colour</th><th className="num">Uprights</th><th className="num">Crossbars</th><th className="num">Panels</th></tr></thead>
            <tbody>
              {runs.map((r) => {
                const c = drapeCounts(r);
                const p = itemParams(r);
                return (
                  <tr key={r.id} className="row" onClick={() => { setView('plan'); select(r.id); }}>
                    <td>{r.name}</td><td className="num">{fmtFt(c.length)}</td><td className="num">{p.h}′</td><td>{p.color}</td><td className="num">{c.uprights}</td><td className="num">{c.bays}</td><td className="num">{c.panels}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 18px 8px' }}><h2 className="h2">Banners, posters & signs to print</h2></div>
          <div className="tbl-wrap" style={{ border: 0, borderRadius: 0, maxHeight: 420 }}>
            <table className="tbl">
              <thead><tr><th>Piece</th><th>Section</th><th className="num">Size</th><th>Type</th></tr></thead>
              <tbody>
                {banners.map((b) => {
                  const p = itemParams(b);
                  return (
                    <tr key={b.id} className="row" onClick={() => { setView('plan'); select(b.id); }}>
                      <td className="trunc" style={{ maxWidth: 260 }}>{p.title || b.name}</td>
                      <td><span className="chip-sec"><i style={{ background: SECTION_MAP[b.section]?.color }} />{SECTION_MAP[b.section]?.num ? `S${SECTION_MAP[b.section].num}` : SECTION_MAP[b.section]?.title}</span></td>
                      <td className="num">{Math.round(p.w * 12)}″ × {Math.round(p.h * 12)}″</td>
                      <td className="muted small">{b.type === 'banner' ? 'tension fabric' : b.type === 'signStand' ? 'roll-up' : b.type === 'poster' ? 'foam board on drape' : 'foam board on easel'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
