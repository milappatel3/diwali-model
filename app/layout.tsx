import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/jetbrains-mono';
import './showcaller.css';
import './app.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Lightplot',
  description: 'Exhibition space & lighting designer: pipe & drape, banners, fixtures, photometric lux and face/photo readiness for the Diwali Exhibition 2026 in the Assembly Hall.',
  icons: { icon: 'icon.svg' },
};
export const viewport: Viewport = { themeColor: '#0f0d0c', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
