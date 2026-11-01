'use client';
// Quick light switches shown on the Plan & light map and the 3D walkthrough: the hall's ceiling (house) lights with a dimmer,
// and a master switch for all exhibit fixtures. Changes are normal plan edits — undoable, autosaved and recalculated.
import React from 'react';
import { useStore } from '@/lib/store';

export default function LightSwitches({ compact = false }: { compact?: boolean }) {
  const house = useStore((s) => s.project.house);
  const fixturesOff = useStore((s) => !!s.project.fixturesOff);
  const commit = useStore((s) => s.commit);
  const hallOn = house.enabled && house.level > 0;
  const setHall = (on: boolean) => commit((p) => ({ ...p, house: { ...p.house, enabled: on, level: on && p.house.level <= 0 ? 0.25 : p.house.level } }));
  const setLevel = (v: number) => commit((p) => ({ ...p, house: { ...p.house, enabled: v > 0, level: v } }), 'house-level');
  const setFixtures = (on: boolean) => commit((p) => ({ ...p, fixturesOff: !on }));
  return (
    <>
      <button className="chip" aria-pressed={hallOn} title="The hall's ceiling lights (house lights)" onClick={() => setHall(!hallOn)}>
        Hall lights {hallOn ? 'on' : 'off'}
      </button>
      {hallOn && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} title="Hall light level">
          <input type="range" min={0} max={1} step={0.05} value={house.level} onChange={(e) => setLevel(parseFloat(e.target.value))} style={{ width: compact ? 70 : 90, accentColor: 'var(--terra)' }} />
          <span className="small mono" style={{ minWidth: 30 }}>{Math.round(house.level * 100)}%</span>
        </span>
      )}
      <button className="chip" aria-pressed={!fixturesOff} title="Every exhibit fixture (spots, washes, floods)" onClick={() => setFixtures(fixturesOff)}>
        Exhibit lights {fixturesOff ? 'off' : 'on'}
      </button>
    </>
  );
}
