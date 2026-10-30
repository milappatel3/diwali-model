'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useStore, type ViewKey } from '@/lib/store';
import { Icon } from './ui';
import { buildScene, computeAll, type FullResult } from '@/lib/engine';
import Inspector from './Inspector';
import Palette from './Palette';
import OverviewView from './views/OverviewView';
import LightView from './views/LightView';
import RigView from './views/RigView';
import BuildView from './views/BuildView';
import ExhibitsView from './views/ExhibitsView';
import VenueView from './views/VenueView';
import PlanView from './plan/PlanView';

const CampusView = dynamic(() => import('./three/CampusView'), { ssr: false, loading: () => <div className="empty">Loading campus…</div> });
const CampusPlan = dynamic(() => import('./plan/CampusPlan'), { ssr: false, loading: () => <div className="empty">Loading campus plan…</div> });
const ThreeView = dynamic(() => import('./three/ThreeView'), { ssr: false, loading: () => <div className="empty">Loading 3D…</div> });

const NAV: { key: ViewKey; label: string; short: string; icon: keyof typeof Icon }[] = [
  { key: 'overview', label: 'Overview', short: 'Home', icon: 'overview' },
  { key: 'plan', label: 'Plan & light map', short: 'Plan', icon: 'plan' },
  { key: '3d', label: '3D walkthrough', short: '3D', icon: 'cube' },
  { key: 'campusplan', label: 'Campus plan', short: 'Map', icon: 'plan' },
  { key: 'campus', label: 'Campus 3D', short: 'Campus', icon: 'cube' },
  { key: 'light', label: 'Photo & lux check', short: 'Lux', icon: 'camera' },
  { key: 'rig', label: 'Fixtures & patch', short: 'Rig', icon: 'rig' },
  { key: 'build', label: 'Build list', short: 'Build', icon: 'box' },
  { key: 'exhibits', label: 'Exhibits', short: 'Exhibits', icon: 'frame' },
  { key: 'venue', label: 'Venue & settings', short: 'Venue', icon: 'venue' },
];

function useCalc() {
  const project = useStore((s) => s.project);
  const setResult = useStore((s) => s.setResult);
  const setProgress = useStore((s) => s.setProgress);
  const workerRef = useRef<Worker | null>(null);
  const reqId = useRef(0);
  const failed = useRef(false);
  const latest = useRef(project);
  latest.current = project;
  const runMain = (id: number, proj: typeof project) => {
    setTimeout(() => {
      try {
        const r = computeAll(buildScene(proj));
        if (id === reqId.current) setResult(r);
      } catch (err: any) {
        setResult(null, 'error', String(err));
      }
    }, 10);
  };
  useEffect(() => {
    if (failed.current) return;
    try {
      const w = new Worker(new URL('../lib/calc.worker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (e: MessageEvent<any>) => {
        const d = e.data;
        if (d.id !== reqId.current) return;
        if (d.progress !== undefined) setProgress(d.progress);
        else if (d.error) setResult(useStore.getState().result, 'error', d.error);
        else if (d.result) setResult(d.result as FullResult);
      };
      w.onerror = (ev) => {
        ev.preventDefault?.();
        failed.current = true;
        workerRef.current = null;
        w.terminate();
        runMain(reqId.current, latest.current);
      };
      w.onmessageerror = () => {
        failed.current = true;
        workerRef.current = null;
        runMain(reqId.current, latest.current);
      };
      workerRef.current = w;
      return () => w.terminate();
    } catch {
      failed.current = true;
    }
  }, [setProgress, setResult]);
  useEffect(() => {
    const t = setTimeout(() => {
      const id = ++reqId.current;
      setProgress(0);
      if (workerRef.current && !failed.current) {
        workerRef.current.postMessage({ id, project });
        // safety net: if the worker never answers (blocked by the host), fall back to the main thread
        setTimeout(() => {
          if (id === reqId.current && useStore.getState().calcState === 'running' && useStore.getState().calcProgress === 0) {
            failed.current = true;
            workerRef.current?.terminate();
            workerRef.current = null;
            runMain(id, latest.current);
          }
        }, 4000);
      } else runMain(id, project);
    }, 220);
    return () => clearTimeout(t);
  }, [project, setProgress, setResult]);
}

export default function App() {
  useCalc();
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const navOpen = useStore((s) => s.navOpen);
  const setNav = useStore((s) => s.setNav);
  const project = useStore((s) => s.project);
  const calcState = useStore((s) => s.calcState);
  const progress = useStore((s) => s.calcProgress);
  const result = useStore((s) => s.result);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const setPalette = useStore((s) => s.setPalette);
  const selected = useStore((s) => s.selected);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement;
      const typing = tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.tagName === 'SELECT' || tgt.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette(true);
        return;
      }
      if (typing) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (!e.metaKey && !e.ctrlKey && !e.altKey && /^[1-9]$/.test(e.key) && useStore.getState().view !== '3d') {
        setView(NAV[parseInt(e.key) - 1].key);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setView, undo, redo, setPalette]);

  const issues = useMemo(() => {
    if (!result) return 0;
    return result.surfaces.filter((s) => s.verdict === 'low' || s.verdict === 'glare').length + result.probes.filter((p) => p.verdict === 'dark').length;
  }, [result]);

  return (
    <div className={`shell ${navOpen ? '' : 'nav-closed'}`}>
      <nav className="rail" aria-label="Views">
        <div className="brand">
          <img className="brand-mark" src="icon.svg" alt="" />
          <div>
            <div className="brand-word">Lightplot</div>
            <div className="brand-sub">Exhibit light designer</div>
          </div>
          <button className="rail-close btn-ghost icon-btn hide-sm" style={{ background: 'none', border: 0 }} onClick={() => setNav(false)} title="Hide sidebar">
            <Icon.close size={16} />
          </button>
        </div>
        {NAV.map((n, i) => {
          const I = Icon[n.icon];
          return (
            <button key={n.key} className="nav-btn" aria-current={view === n.key ? 'page' : undefined} onClick={() => setView(n.key)}>
              <I size={18} />
              <span className="nav-long">{n.label}</span>
              <span className="nav-short">{n.short}</span>
              {n.key === 'light' && issues > 0 ? <span className="badge badge-warn">{issues}</span> : <span className="kbd hide-sm" style={{ marginLeft: 'auto', opacity: 0.6 }}>{i + 1}</span>}
            </button>
          );
        })}
        <div className="nav-sep" />
        <div className="rail-foot">
          Hall from <b>Hindu_Temple_Milpitas_Campus.dwg</b>
          <br />
          Content from the Final Content Proposal
          <br />
          <span className="muted-3">⌘K search · ⌘Z undo · 1–8 views</span>
        </div>
      </nav>
      <main className="main">
        <header className="topbar" style={{ position: 'relative' }}>
          {calcState === 'running' && <div className="progress-line" style={{ width: `${Math.max(4, progress * 100)}%` }} />}
          {!navOpen && (
            <button className="btn icon-btn btn-ghost" onClick={() => setNav(true)} title="Show sidebar">
              <Icon.menu size={16} />
            </button>
          )}
          <div className="file">
            <b>{project.name}</b>
            <span>{project.venue}</span>
          </div>
          <div className="spacer" />
          <span className="pill hide-sm" title="Photometric calculation">
            <span className="dot" style={{ background: calcState === 'running' ? 'var(--warn)' : calcState === 'error' ? 'var(--err)' : 'var(--ok)' }} />
            {calcState === 'running' ? 'Calculating…' : calcState === 'error' ? 'Calc error' : result ? `${result.srcCount} sources · ${result.ms} ms` : '—'}
          </span>
          <button className="btn icon-btn" onClick={undo} title="Undo (⌘Z)">
            <Icon.undo size={16} />
          </button>
          <button className="btn icon-btn" onClick={redo} title="Redo (⇧⌘Z)">
            <Icon.redo size={16} />
          </button>
          <button className="btn" onClick={() => setPalette(true)}>
            <Icon.search size={15} />
            <span className="hide-sm">Search</span>
            <span className="kbd hide-sm">⌘K</span>
          </button>
        </header>
        {view === 'overview' && <OverviewView />}
        {view === 'plan' && <PlanView />}
        {view === '3d' && <ThreeView />}
        {view === 'campus' && <CampusView />}
        {view === 'campusplan' && <CampusPlan />}
        {view === 'light' && <LightView />}
        {view === 'rig' && <RigView />}
        {view === 'build' && <BuildView />}
        {view === 'exhibits' && <ExhibitsView />}
        {view === 'venue' && <VenueView />}
      </main>
      {selected && (view === 'plan' || view === '3d' || view === 'rig' || view === 'light' || view === 'exhibits') && <Inspector />}
      <Palette />
    </div>
  );
}

export function useNavLabel(v: ViewKey) {
  return NAV.find((n) => n.key === v)?.label;
}
export function SectionDot({ color }: { color: string }) {
  return <i style={{ width: 8, height: 8, borderRadius: 3, display: 'inline-block', background: color }} />;
}
export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}
