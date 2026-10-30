'use client';
import dynamic from 'next/dynamic';

const App = dynamic(() => import('@/components/App'), {
  ssr: false,
  loading: () => <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center', color: 'var(--on-dark-3)', fontFamily: 'var(--f-ui)' }}>Loading Lightplot…</div>,
});

export default function Page() {
  return <App />;
}
