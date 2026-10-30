'use client';
// Procedural canvas textures — every graphic in the 3D is drawn from the proposal content.
import * as THREE from 'three';
import { SAMSKARAS, PANEL_COLORS, FESTIVALS, VALUES, NODES } from '@/lib/content';

const cache = new Map<string, THREE.Texture>();
function tex(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, opts: { repeat?: [number, number]; srgb?: boolean; aniso?: number } = {}) {
  const k = key + (opts.repeat ? opts.repeat.join('x') : '');
  if (cache.has(k)) return cache.get(k)!;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = opts.aniso ?? 8;
  if (opts.repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(opts.repeat[0], opts.repeat[1]);
  }
  cache.set(k, t);
  return t;
}
function rnd(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const SERIF = '"Fraunces Variable", Georgia, serif';
const SANS = '"DM Sans Variable", Helvetica, Arial, sans-serif';

function wrapText(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines = 6) {
  const words = text.split(' ');
  let line = '';
  let n = 0;
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > maxW && line) {
      g.fillText(line, x, y + n * lh);
      line = w;
      n++;
      if (n >= maxLines) return n;
    } else line = t;
  }
  if (line) g.fillText(line, x, y + n * lh);
  return n + 1;
}
function fauxLines(g: CanvasRenderingContext2D, x: number, y: number, w: number, n: number, lh: number, color: string, seed = 1) {
  const r = rnd(seed);
  g.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const lw = i % 5 === 4 ? w * (0.4 + r() * 0.3) : w * (0.85 + r() * 0.15);
    g.fillRect(x + (w - lw) / 2, y + i * lh, lw, lh * 0.38);
  }
}
function lotus(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string, stroke = false) {
  g.save();
  g.translate(cx, cy);
  g.beginPath();
  for (const a of [-60, -30, 0, 30, 60]) {
    g.save();
    g.rotate((a * Math.PI) / 180);
    g.moveTo(0, 0);
    g.bezierCurveTo(s * 0.35, -s * 0.35, s * 0.2, -s * 0.85, 0, -s);
    g.bezierCurveTo(-s * 0.2, -s * 0.85, -s * 0.35, -s * 0.35, 0, 0);
    g.restore();
  }
  if (stroke) {
    g.strokeStyle = color;
    g.lineWidth = s * 0.07;
    g.stroke();
  } else {
    g.fillStyle = color;
    g.fill();
  }
  g.restore();
}
function diya(g: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  const grd = g.createRadialGradient(cx, cy - s * 0.9, 0, cx, cy - s * 0.9, s * 1.4);
  grd.addColorStop(0, 'rgba(255,214,120,0.95)');
  grd.addColorStop(1, 'rgba(255,150,40,0)');
  g.fillStyle = grd;
  g.beginPath();
  g.arc(cx, cy - s * 0.9, s * 1.4, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffd36b';
  g.beginPath();
  g.ellipse(cx, cy - s * 0.7, s * 0.18, s * 0.42, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#b5541c';
  g.beginPath();
  g.ellipse(cx, cy, s * 0.7, s * 0.3, 0, 0, Math.PI);
  g.fill();
}

// ——— materials’ base textures ———
export const carpetTex = () =>
  tex('carpet', 512, 512, (g, w, h) => {
    g.fillStyle = '#5a1f24';
    g.fillRect(0, 0, w, h);
    const r = rnd(7);
    for (let i = 0; i < 26000; i++) {
      const v = r();
      g.fillStyle = v > 0.5 ? `rgba(120,40,46,${0.25 + r() * 0.3})` : `rgba(30,8,10,${0.2 + r() * 0.3})`;
      g.fillRect(r() * w, r() * h, 1.5, 1.5);
    }
    g.strokeStyle = 'rgba(190,140,80,0.18)';
    g.lineWidth = 3;
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        const cx = (i + 0.5) * (w / 4), cy = (j + 0.5) * (h / 4);
        g.beginPath();
        g.moveTo(cx, cy - 34);
        g.lineTo(cx + 34, cy);
        g.lineTo(cx, cy + 34);
        g.lineTo(cx - 34, cy);
        g.closePath();
        g.stroke();
      }
  }, { repeat: [40, 30] });

export const woodTex = (tone = '#a0703f', key = 'wood') =>
  tex(key, 512, 512, (g, w, h) => {
    g.fillStyle = tone;
    g.fillRect(0, 0, w, h);
    const r = rnd(key.length * 13);
    for (let i = 0; i < 160; i++) {
      const y = r() * h;
      g.strokeStyle = `rgba(${r() > 0.5 ? '60,35,15' : '200,160,110'},${0.06 + r() * 0.12})`;
      g.lineWidth = 1 + r() * 3;
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x / 60 + i) * 4 + (r() - 0.5) * 2);
      g.stroke();
    }
  }, { repeat: [2, 2] });

export const plywoodTex = () =>
  tex('ply', 512, 512, (g, w, h) => {
    g.fillStyle = '#d7b786';
    g.fillRect(0, 0, w, h);
    const r = rnd(3);
    for (let i = 0; i < 90; i++) {
      g.strokeStyle = `rgba(150,105,55,${0.05 + r() * 0.12})`;
      g.lineWidth = 2 + r() * 6;
      const y = r() * h;
      g.beginPath();
      g.ellipse(w * r(), y, 40 + r() * 200, 6 + r() * 26, 0, 0, Math.PI * 2);
      g.stroke();
    }
  }, { repeat: [1, 1] });

export const ceilingTex = () =>
  tex('ceil', 256, 128, (g, w, h) => {
    g.fillStyle = '#d9d6cf';
    g.fillRect(0, 0, w, h);
    const r = rnd(5);
    for (let i = 0; i < 2000; i++) {
      g.fillStyle = `rgba(120,115,105,${r() * 0.18})`;
      g.fillRect(r() * w, r() * h, 1.5, 1.5);
    }
    g.strokeStyle = '#f2f0ec';
    g.lineWidth = 6;
    g.strokeRect(0, 0, w, h);
  }, { repeat: [60, 48] });

export const wallTex = () =>
  tex('wall', 256, 256, (g, w, h) => {
    g.fillStyle = '#cfc4b4';
    g.fillRect(0, 0, w, h);
    const r = rnd(11);
    for (let i = 0; i < 3000; i++) {
      g.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '90,80,70'},${r() * 0.05})`;
      g.fillRect(r() * w, r() * h, 2, 2);
    }
  }, { repeat: [20, 4] });

// ——— graphics ———
type Style = 'cream' | 'saffron' | 'maroon' | 'photo' | 'night';
const PAL: Record<Style, { bg: [string, string]; ink: string; head: string; accent: string }> = {
  cream: { bg: ['#f6ecd9', '#ead8b9'], ink: '#4a2416', head: '#7b1c1c', accent: '#c58b2b' },
  saffron: { bg: ['#f39a34', '#c4501c'], ink: '#fff6e6', head: '#fff3d6', accent: '#ffe08a' },
  maroon: { bg: ['#7b1c1c', '#3e0d0f'], ink: '#fbe9cf', head: '#ffd98a', accent: '#e2b04a' },
  photo: { bg: ['#6e1420', '#2a0710'], ink: '#ffe8c0', head: '#ffd36b', accent: '#e9b44c' },
  night: { bg: ['#14234d', '#070b1c'], ink: '#e9efff', head: '#ffd98a', accent: '#8fb3ff' },
};

export function posterTex(title: string, sub: string, style: Style, wFt: number, hFt: number, seed = 1) {
  const W = 512, H = Math.round((512 * hFt) / wFt);
  return tex(`poster:${title}:${sub}:${style}:${W}x${H}`, W, Math.min(H, 2048), (g, w, h) => {
    const p = PAL[style] || PAL.cream;
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, p.bg[0]);
    gr.addColorStop(1, p.bg[1]);
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = p.accent;
    g.lineWidth = 8;
    g.strokeRect(18, 18, w - 36, h - 36);
    g.lineWidth = 2;
    g.strokeRect(32, 32, w - 64, h - 64);
    lotus(g, w / 2, 110, 46, p.accent, true);
    g.fillStyle = p.head;
    g.textAlign = 'center';
    g.font = `600 ${w * 0.085}px ${SERIF}`;
    const n = wrapText(g, title, w / 2, 190, w - 110, w * 0.095, 4);
    g.fillStyle = p.accent;
    g.fillRect(w / 2 - 60, 190 + n * w * 0.095, 120, 3);
    if (sub) {
      g.fillStyle = p.ink;
      g.font = `400 ${w * 0.045}px ${SANS}`;
      wrapText(g, sub, w / 2, 230 + n * w * 0.095, w - 120, w * 0.055, 3);
    }
    const top = 300 + n * w * 0.095;
    fauxLines(g, 70, top, w - 140, Math.max(4, Math.floor((h - top - 150) / 26)), 26, style === 'cream' ? 'rgba(74,36,22,0.55)' : 'rgba(255,240,220,0.55)', seed);
    diya(g, w / 2, h - 70, 30);
  });
}

export function bannerTex(title: string, sub: string, style: Style, wFt: number, hFt: number) {
  const W = 1024, H = Math.max(128, Math.round((1024 * hFt) / wFt));
  return tex(`banner:${title}:${sub}:${style}:${W}x${H}`, W, Math.min(H, 2048), (g, w, h) => {
    const p = PAL[style] || PAL.saffron;
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, p.bg[0]);
    gr.addColorStop(1, p.bg[1]);
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    const ratio = w / h;
    if (style === 'photo') {
      // rangoli pattern backdrop
      g.globalAlpha = 0.25;
      for (let i = 0; i < 7; i++)
        for (let j = 0; j < 6; j++) {
          lotus(g, (i + 0.5) * (w / 7), (j + 0.7) * (h / 6), 34, p.accent, true);
        }
      g.globalAlpha = 1;
      const rg = g.createRadialGradient(w / 2, h * 0.42, 10, w / 2, h * 0.42, w * 0.45);
      rg.addColorStop(0, 'rgba(255,200,110,0.35)');
      rg.addColorStop(1, 'rgba(255,200,110,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, w, h);
      g.fillStyle = p.head;
      g.textAlign = 'center';
      g.font = `600 ${w * 0.11}px ${SERIF}`;
      g.fillText(title, w / 2, h * 0.3);
      g.font = `400 ${w * 0.035}px ${SANS}`;
      g.fillStyle = p.ink;
      g.fillText(sub, w / 2, h * 0.38);
      for (let i = 0; i < 9; i++) diya(g, w * (0.1 + i * 0.1), h * 0.93, 26);
      return;
    }
    g.strokeStyle = p.accent;
    g.lineWidth = Math.max(4, h * 0.03);
    g.strokeRect(h * 0.06, h * 0.06, w - h * 0.12, h - h * 0.12);
    g.textAlign = 'center';
    g.fillStyle = p.head;
    const fs = ratio > 4 ? h * 0.42 : Math.min(h * 0.16, w * 0.09);
    g.font = `600 ${fs}px ${SERIF}`;
    g.fillText(title, w / 2, ratio > 4 ? h * (sub ? 0.56 : 0.64) : h * 0.32);
    if (sub) {
      g.fillStyle = p.ink;
      g.font = `500 ${ratio > 4 ? h * 0.17 : fs * 0.36}px ${SANS}`;
      g.fillText(sub.toUpperCase(), w / 2, ratio > 4 ? h * 0.82 : h * 0.43);
    }
    if (ratio > 4) {
      lotus(g, h * 0.55, h * 0.72, h * 0.4, p.accent);
      lotus(g, w - h * 0.55, h * 0.72, h * 0.4, p.accent);
    } else {
      for (let i = 0; i < 7; i++) diya(g, w * (0.2 + i * 0.1), h * 0.8, h * 0.05);
    }
  });
}

export function samskaraTex(i: number) {
  const s = SAMSKARAS[i];
  return tex(`samskara:${i}`, 300, 1160, (g, w, h) => {
    const c = PANEL_COLORS[i];
    g.fillStyle = '#efe6d2';
    g.fillRect(0, 0, w, h);
    g.fillStyle = c;
    g.fillRect(0, 0, w, 210);
    g.fillRect(0, h - 60, w, 60);
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.font = `700 34px ${SANS}`;
    g.fillText(`STAGE ${i + 1}`, w / 2, 60);
    g.font = `600 38px ${SERIF}`;
    wrapText(g, s.name, w / 2, 112, w - 30, 40, 2);
    g.fillStyle = '#4a2416';
    g.font = `600 24px ${SERIF}`;
    wrapText(g, s.title, w / 2, 262, w - 40, 30, 3);
    // engraved art (circles/lines like the concept)
    g.strokeStyle = 'rgba(90,60,40,0.35)';
    g.lineWidth = 3;
    for (let k = 0; k < 5; k++) {
      g.beginPath();
      g.arc(w / 2, 470, 34 + k * 16, Math.PI * 0.9, Math.PI * 2.1);
      g.stroke();
    }
    g.fillStyle = c;
    g.beginPath();
    g.arc(w / 2, 470, 26, 0, Math.PI * 2);
    g.fill();
    // reflection box (flap)
    g.fillStyle = '#7a1414';
    const by = 640;
    g.fillRect(24, by, w - 48, 230);
    g.fillStyle = '#fbe9cf';
    g.font = `500 19px ${SANS}`;
    wrapText(g, s.q, w / 2, by + 44, w - 80, 26, 7);
    fauxLines(g, 34, 920, w - 68, 7, 22, 'rgba(74,36,22,0.4)', i + 3);
  });
}

export const introPanelTex = () =>
  tex('intro', 500, 1100, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#2d7a3a');
    gr.addColorStop(1, '#174d22');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffe08a';
    g.textAlign = 'center';
    g.font = `700 58px ${SERIF}`;
    g.fillText('The Game', w / 2, 120);
    g.fillText('of Life', w / 2, 186);
    g.font = `500 30px ${SANS}`;
    g.fillStyle = '#fff6e0';
    g.fillText('16 SACRED STEPS', w / 2, 240);
    g.font = `400 22px ${SANS}`;
    wrapText(g, 'Sanatan Dharma believes life to be a sacred journey. From before birth to the final rites after death, each important moment is marked by Samskaras — sacred ceremonies to refine and uplift the spirit.', w / 2, 320, w - 70, 32, 9);
    for (let i = 0; i < 16; i++) {
      g.fillStyle = PANEL_COLORS[i];
      g.beginPath();
      g.arc(70 + (i % 4) * 120, 720 + Math.floor(i / 4) * 85, 30, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.font = `700 22px ${SANS}`;
      g.fillText(String(i + 1), 70 + (i % 4) * 120, 728 + Math.floor(i / 4) * 85);
    }
  });

// simplified India outline (normalised -0.5..0.5, y up)
export const INDIA: [number, number][] = [
  [-0.02, 0.5], [0.06, 0.46], [0.08, 0.38], [0.04, 0.33], [0.1, 0.27], [0.2, 0.25], [0.28, 0.2], [0.36, 0.22], [0.44, 0.26], [0.5, 0.22], [0.47, 0.13], [0.4, 0.13], [0.36, 0.07],
  [0.33, 0.12], [0.28, 0.1], [0.27, 0.03], [0.22, -0.02], [0.16, -0.05], [0.12, -0.14], [0.06, -0.2], [0.04, -0.3], [0.0, -0.38], [-0.04, -0.47], [-0.08, -0.4], [-0.1, -0.3],
  [-0.14, -0.2], [-0.18, -0.1], [-0.2, 0.0], [-0.26, 0.02], [-0.36, 0.06], [-0.4, 0.1], [-0.33, 0.14], [-0.34, 0.2], [-0.24, 0.24], [-0.18, 0.32], [-0.14, 0.4], [-0.08, 0.44],
];
export const mapTopTex = () =>
  tex('maptop', 1024, 1024, (g, w, h) => {
    g.drawImage((plywoodTex().image as HTMLCanvasElement), 0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fillRect(0, 0, w, h);
  });
export const indiaTex = () =>
  tex('india', 1024, 1024, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const P = (x: number, y: number): [number, number] => [w / 2 + x * w * 0.9, h / 2 - y * h * 0.9];
    g.save();
    g.beginPath();
    INDIA.forEach(([x, y], i) => (i ? g.lineTo(...P(x, y)) : g.moveTo(...P(x, y))));
    g.closePath();
    g.clip();
    const bands = ['#e8892e', '#f0dcb4', '#5b8a3a'];
    bands.forEach((c, i) => {
      g.fillStyle = c;
      g.fillRect(0, h * (0.05 + i * 0.3), w, h * 0.32);
    });
    const r = rnd(9);
    for (let i = 0; i < 400; i++) {
      g.strokeStyle = `rgba(90,60,30,${0.05 + r() * 0.1})`;
      g.beginPath();
      g.moveTo(0, r() * h);
      g.lineTo(w, r() * h);
      g.stroke();
    }
    g.restore();
    g.strokeStyle = '#7a4a22';
    g.lineWidth = 5;
    g.beginPath();
    INDIA.forEach(([x, y], i) => (i ? g.lineTo(...P(x, y)) : g.moveTo(...P(x, y))));
    g.closePath();
    g.stroke();
    g.textAlign = 'center';
    for (const f of FESTIVALS) {
      const [x, y] = P(f.u, f.v);
      g.fillStyle = f.color;
      g.beginPath();
      g.arc(x, y, 16, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#fff';
      g.lineWidth = 3;
      g.stroke();
      g.fillStyle = '#2a160b';
      g.font = `600 19px ${SANS}`;
      g.fillText(f.fest, x, y - 24);
    }
  });

export function dioramaTex(art: 'god' | 'guru') {
  return tex(`dio:${art}`, 1024, 1024, (g, w, h) => {
    if (art === 'god') {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#0c1a48');
      gr.addColorStop(1, '#22356f');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      const r = rnd(4);
      for (let i = 0; i < 260; i++) {
        g.fillStyle = `rgba(255,240,200,${0.3 + r() * 0.7})`;
        g.beginPath();
        g.arc(r() * w, r() * h * 0.7, r() * 2.6, 0, Math.PI * 2);
        g.fill();
      }
      const rg = g.createRadialGradient(w / 2, h * 0.42, 20, w / 2, h * 0.42, w * 0.3);
      rg.addColorStop(0, '#fff6d8');
      rg.addColorStop(0.5, '#f7d98a');
      rg.addColorStop(1, 'rgba(247,217,138,0)');
      g.fillStyle = rg;
      g.beginPath();
      g.arc(w / 2, h * 0.42, w * 0.3, 0, Math.PI * 2);
      g.fill();
      // meditating figure silhouette
      g.fillStyle = '#d9a64e';
      g.beginPath();
      g.arc(w / 2, h * 0.33, 40, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.moveTo(w / 2 - 120, h * 0.55);
      g.quadraticCurveTo(w / 2, h * 0.36, w / 2 + 120, h * 0.55);
      g.quadraticCurveTo(w / 2, h * 0.6, w / 2 - 120, h * 0.55);
      g.fill();
      g.fillRect(w / 2 - 50, h * 0.37, 100, 120);
      // hills / clouds
      g.fillStyle = '#3b5aa0';
      g.beginPath();
      g.moveTo(0, h * 0.72);
      for (let x = 0; x <= w; x += 40) g.lineTo(x, h * 0.7 + Math.sin(x / 90) * 30);
      g.lineTo(w, h);
      g.lineTo(0, h);
      g.fill();
      // temples
      g.fillStyle = '#c99a5b';
      for (const [cx, s] of [[150, 1], [300, 0.7], [760, 0.8], [900, 1]] as [number, number][]) {
        g.beginPath();
        g.moveTo(cx - 70 * s, h * 0.86);
        g.lineTo(cx - 50 * s, h * 0.78);
        g.lineTo(cx, h * 0.62 - 40 * s);
        g.lineTo(cx + 50 * s, h * 0.78);
        g.lineTo(cx + 70 * s, h * 0.86);
        g.fill();
      }
      g.fillStyle = '#1a1208';
      g.fillRect(0, h * 0.86, w, h * 0.14);
      g.fillStyle = '#e8c27a';
      g.textAlign = 'center';
      g.font = `600 54px ${SERIF}`;
      g.fillText('Ekam Satyam', w / 2, h * 0.93);
      g.font = `500 24px ${SANS}`;
      g.fillText('THE ONE SUPREME REALITY', w / 2, h * 0.97);
      // arch frame
      g.fillStyle = '#b8874e';
      g.beginPath();
      g.rect(0, 0, w, h * 0.86);
      g.moveTo(w * 0.12, h * 0.86);
      g.lineTo(w * 0.12, h * 0.25);
      g.quadraticCurveTo(w * 0.12, h * 0.08, w * 0.3, h * 0.08);
      g.quadraticCurveTo(w * 0.4, h * 0.02, w * 0.5, h * 0.06);
      g.quadraticCurveTo(w * 0.6, h * 0.02, w * 0.7, h * 0.08);
      g.quadraticCurveTo(w * 0.88, h * 0.08, w * 0.88, h * 0.25);
      g.lineTo(w * 0.88, h * 0.86);
      g.closePath();
      g.fill('evenodd');
    } else {
      g.fillStyle = '#d8b880';
      g.fillRect(0, 0, w, h);
      const r = rnd(8);
      for (let i = 0; i < 2000; i++) {
        g.fillStyle = `rgba(120,80,30,${r() * 0.12})`;
        g.fillRect(r() * w, r() * h, 3, 3);
      }
      g.strokeStyle = 'rgba(90,60,25,0.6)';
      g.setLineDash([10, 10]);
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(120, 900);
      g.bezierCurveTo(300, 700, 160, 500, 400, 420);
      g.bezierCurveTo(650, 340, 600, 160, 880, 120);
      g.stroke();
      g.setLineDash([]);
      // bead silhouette of a sadhu profile
      g.fillStyle = '#5a2d16';
      const prof: [number, number][] = [];
      for (let t = 0; t < 1; t += 0.012) {
        const a = Math.PI * 1.1 + t * Math.PI * 1.5;
        prof.push([w / 2 + Math.cos(a) * 170, h * 0.42 + Math.sin(a) * 200]);
      }
      for (let t = 0; t < 1; t += 0.03) prof.push([w / 2 + 40 + t * 140, h * 0.62 + t * 200]);
      for (const [x, y] of prof) {
        g.beginPath();
        g.arc(x, y, 9, 0, Math.PI * 2);
        g.fill();
      }
      // compass
      g.strokeStyle = '#5a3a1a';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(860, 160, 60, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.moveTo(860, 90);
      g.lineTo(875, 160);
      g.lineTo(860, 230);
      g.lineTo(845, 160);
      g.closePath();
      g.stroke();
      g.fillStyle = '#5a3a1a';
      g.font = `600 30px ${SERIF}`;
      g.textAlign = 'center';
      g.fillText('N', 860, 80);
      // carved arch frame
      g.fillStyle = '#7a4c22';
      g.beginPath();
      g.rect(0, 0, w, h);
      g.moveTo(w * 0.1, h * 0.95);
      g.lineTo(w * 0.1, h * 0.25);
      g.quadraticCurveTo(w * 0.1, h * 0.1, w * 0.3, h * 0.1);
      g.quadraticCurveTo(w * 0.5, 0, w * 0.7, h * 0.1);
      g.quadraticCurveTo(w * 0.9, h * 0.1, w * 0.9, h * 0.25);
      g.lineTo(w * 0.9, h * 0.95);
      g.closePath();
      g.fill('evenodd');
    }
  });
}

export const tvTex = () =>
  tex('tv', 1024, 576, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#dff3ff');
    gr.addColorStop(1, '#a8d6f0');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#5a3a1e';
    g.lineCap = 'round';
    const branch = (x: number, y: number, a: number, l: number, d: number) => {
      if (d === 0) {
        g.fillStyle = ['#2f8f4e', '#4fb06a', '#7cc47a', '#e0a44a', '#57a0d8'][Math.floor((x + y) % 5)];
        g.beginPath();
        g.arc(x, y, 7, 0, Math.PI * 2);
        g.fill();
        return;
      }
      const x2 = x + Math.cos(a) * l, y2 = y - Math.sin(a) * l;
      g.lineWidth = d * 2.2;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x2, y2);
      g.stroke();
      branch(x2, y2, a + 0.42, l * 0.72, d - 1);
      branch(x2, y2, a - 0.42, l * 0.72, d - 1);
    };
    branch(w / 2, h - 30, Math.PI / 2, 130, 8);
    g.fillStyle = '#123';
    g.font = `600 30px ${SERIF}`;
    g.textAlign = 'center';
    g.fillText('What happens after this life? · Punarjanma', w / 2, 44);
    g.font = `500 18px ${SANS}`;
    g.fillText('8.4 MILLION LIFE FORMS', w / 2, 72);
  });

export const kioskTex = () =>
  tex('kiosk', 1024, 576, (g, w, h) => {
    const gr = g.createRadialGradient(w * 0.55, h * 0.55, 10, w * 0.55, h * 0.55, w * 0.6);
    gr.addColorStop(0, '#e8f6ff');
    gr.addColorStop(1, '#8cc8ea');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(30,90,140,0.35)';
    for (let i = 1; i < 16; i++) {
      g.lineWidth = 4 - i * 0.18;
      g.beginPath();
      g.arc(w * 0.55, h * 0.55, i * 28, 0, Math.PI * 2);
      g.stroke();
    }
    g.fillStyle = '#1b3a5a';
    g.fillRect(w * 0.25, 20, w * 0.5, 60);
    g.fillStyle = '#fff';
    g.font = `600 24px ${SANS}`;
    g.textAlign = 'center';
    g.fillText('KARMA: The Law of Action & Consequence', w / 2, 58);
  });

export const lotusWallTex = () =>
  tex('lotuswall', 2048, 1024, (g, w, h) => {
    g.drawImage(plywoodTex().image as HTMLCanvasElement, 0, 0, w, h);
    // poster zone (left 4 of 16 ft)
    const pz = w * 0.25;
    g.fillStyle = '#f3ead8';
    g.fillRect(40, 60, pz - 80, h - 120);
    g.fillStyle = '#4a2416';
    g.textAlign = 'center';
    lotus(g, pz / 2, 230, 70, '#7b1c1c', true);
    g.font = `600 70px ${SERIF}`;
    g.fillText('The Lotus', pz / 2, 360);
    g.font = `400 30px ${SANS}`;
    wrapText(g, 'Hindu Mulya — Values that guide our life’s journey. Which value will you imbibe this year? Choose a value. Make a Sankalp. Let it blossom.', pz / 2, 430, pz - 140, 40, 10);
    // string art lotus in the nail zone
    const cx = pz + (w - pz) / 2, cy = h * 0.62;
    const petals = [
      { a: 0, l: 1.0, c: '#e8456a' }, { a: -0.42, l: 0.86, c: '#f06292' }, { a: 0.42, l: 0.86, c: '#f06292' },
      { a: -0.85, l: 0.72, c: '#f2994a' }, { a: 0.85, l: 0.72, c: '#f2994a' }, { a: -1.25, l: 0.6, c: '#f2c94c' }, { a: 1.25, l: 0.6, c: '#f2c94c' },
    ];
    const S = h * 0.52;
    g.lineWidth = 2.2;
    petals.forEach((p, pi) => {
      const pts: [number, number][] = [];
      for (let t = 0; t <= 1; t += 0.08) {
        const s = Math.sin(t * Math.PI) * 0.28 * p.l;
        for (const side of [-1, 1]) {
          const x = side * s * S, y = -t * S * p.l;
          pts.push([cx + x * Math.cos(p.a) - y * Math.sin(p.a), cy + x * Math.sin(p.a) + y * Math.cos(p.a)]);
        }
      }
      g.strokeStyle = VALUES[pi % VALUES.length].c;
      for (let i = 0; i < pts.length; i++)
        for (let j = i + 3; j < pts.length; j += 5) {
          g.globalAlpha = 0.75;
          g.beginPath();
          g.moveTo(...pts[i]);
          g.lineTo(...pts[j]);
          g.stroke();
        }
      g.globalAlpha = 1;
      g.fillStyle = '#dcdcdc';
      for (const q of pts) {
        g.beginPath();
        g.arc(q[0], q[1], 4, 0, Math.PI * 2);
        g.fill();
      }
      void p.c;
    });
    // leaves
    g.strokeStyle = '#3fae5a';
    for (let i = 0; i < 40; i++) {
      g.beginPath();
      g.moveTo(cx - S * 0.7 + (i % 20) * S * 0.07, cy + 20);
      g.lineTo(cx - S * 0.4 + ((i * 7) % 20) * S * 0.04, cy + 80 + (i % 3) * 10);
      g.stroke();
    }
    g.fillStyle = '#7b1c1c';
    g.font = `600 52px ${SERIF}`;
    g.fillText('Hindu Mulya — Values that Guide Our Life’s Journey', cx, 90);
  });

export function bayTex(kind: number) {
  return tex(`bay:${kind}`, 512, 768, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h * 0.35, 10, w / 2, h * 0.4, h * 0.7);
    gr.addColorStop(0, '#fff1cf');
    gr.addColorStop(1, '#b5803f');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.textAlign = 'center';
    if (kind === 0) {
      g.fillStyle = '#e6c08a';
      g.beginPath();
      g.moveTo(w / 2 - 140, h * 0.8);
      g.lineTo(w / 2 - 110, h * 0.55);
      g.lineTo(w / 2, h * 0.15);
      g.lineTo(w / 2 + 110, h * 0.55);
      g.lineTo(w / 2 + 140, h * 0.8);
      g.fill();
      g.fillStyle = '#e8732c';
      g.beginPath();
      g.moveTo(w / 2, h * 0.15);
      g.lineTo(w / 2 + 60, h * 0.1);
      g.lineTo(w / 2, h * 0.06);
      g.fill();
    } else if (kind === 1) {
      g.fillStyle = '#f7ead0';
      g.fillRect(w * 0.18, h * 0.5, w * 0.64, h * 0.2);
      g.strokeStyle = '#7a4a22';
      g.lineWidth = 4;
      g.strokeRect(w * 0.18, h * 0.5, w * 0.64, h * 0.2);
      g.beginPath();
      g.moveTo(w / 2, h * 0.5);
      g.lineTo(w / 2, h * 0.7);
      g.stroke();
      for (let i = 0; i < 5; i++) {
        g.fillStyle = ['#7b1c1c', '#9a5b1c', '#3d5a2c', '#2b4a6b', '#6a3a7a'][i];
        g.fillRect(w * 0.3, h * (0.24 + i * 0.045), w * 0.4, h * 0.04);
      }
    } else {
      g.fillStyle = '#e8732c';
      g.beginPath();
      g.moveTo(w / 2 - 120, h * 0.78);
      g.quadraticCurveTo(w / 2, h * 0.4, w / 2 + 120, h * 0.78);
      g.fill();
      g.fillStyle = '#d29a6a';
      g.beginPath();
      g.arc(w / 2, h * 0.4, 46, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#f2f2f2';
      g.beginPath();
      g.arc(w / 2, h * 0.47, 30, 0, Math.PI);
      g.fill();
    }
    g.fillStyle = '#4a2416';
    g.font = `600 40px ${SERIF}`;
    g.fillText(['Mandir', 'Shastra', 'Sant'][kind], w / 2, h * 0.9);
    g.font = `400 20px ${SANS}`;
    g.fillText(['Connects us with the Divine', 'Guides us with wisdom', 'Shows us the path'][kind], w / 2, h * 0.95);
  });
}

export const signTex = (num: number, title: string) =>
  tex(`sign:${num}:${title}`, 330, 790, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#f6ecd9');
    gr.addColorStop(1, '#e7d2ae');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#7b1c1c';
    g.fillRect(0, 0, w, 220);
    g.fillStyle = '#ffe08a';
    g.textAlign = 'center';
    g.font = `700 150px ${SERIF}`;
    g.fillText(String(num), w / 2, 175);
    g.fillStyle = '#4a2416';
    g.font = `600 44px ${SERIF}`;
    wrapText(g, title, w / 2, 300, w - 40, 50, 4);
    lotus(g, w / 2, h - 120, 60, '#c58b2b', true);
  });

export const exitTex = () =>
  tex('exit', 256, 96, (g, w, h) => {
    g.fillStyle = '#1a0606';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff2a1f';
    g.textAlign = 'center';
    g.font = `700 64px ${SANS}`;
    g.fillText('EXIT', w / 2, 72);
  });

export const houseWallTex = () =>
  tex('studs', 512, 512, (g, w, h) => {
    g.fillStyle = '#c9a26e';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#b48a55';
    for (let i = 0; i < 4; i++) g.fillRect(i * (w / 4), 0, 22, h);
    g.fillRect(0, h * 0.5, w, 18);
  }, { repeat: [3, 1] });

export { NODES };

// ——— exhibit-house finishes ———
/** Matte lime-wash / emulsion paint: base colour with soft brush mottling */
export const limeWashTex = (base: string, key: string) =>
  tex(`lime-${key}`, 256, 256, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const r = rnd(key.length * 31 + 5);
    for (let i = 0; i < 900; i++) {
      const x = r() * w, y = r() * h, s = 6 + r() * 26;
      const light = r() > 0.5;
      g.fillStyle = light ? `rgba(255,248,235,${0.025 + r() * 0.04})` : `rgba(70,40,20,${0.02 + r() * 0.035})`;
      g.beginPath();
      g.ellipse(x, y, s, s * (0.4 + r() * 0.6), r() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
  }, { repeat: [3, 2] });

/** Polished off-white marble floor tiles, 2′ grid */
export const marbleTileTex = () =>
  tex('marble', 512, 512, (g, w, h) => {
    const r = rnd(41);
    const n = 4, s = w / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const v = 228 + Math.floor(r() * 14);
        g.fillStyle = `rgb(${v},${v - 6},${v - 16})`;
        g.fillRect(i * s, j * s, s, s);
        for (let k = 0; k < 5; k++) {
          g.strokeStyle = `rgba(150,135,120,${0.06 + r() * 0.1})`;
          g.lineWidth = 0.6 + r() * 1.6;
          g.beginPath();
          let x = i * s + r() * s, y = j * s;
          g.moveTo(x, y);
          for (let q = 0; q < 6; q++) {
            x += (r() - 0.5) * s * 0.45;
            y += s / 6;
            g.lineTo(x, y);
          }
          g.stroke();
        }
      }
    g.strokeStyle = 'rgba(120,105,90,0.55)';
    g.lineWidth = 2;
    for (let i = 0; i <= n; i++) {
      g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke();
    }
  }, { repeat: [2.5, 2.5] });

/** Hand-knotted style rug: madder red field, indigo border, central medallion */
export const rugTex = (key = 'rug', field = '#8e2420', border = '#1f2c55') =>
  tex(key, 512, 768, (g, w, h) => {
    g.fillStyle = border;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#d8b46a';
    g.fillRect(28, 28, w - 56, h - 56);
    g.fillStyle = field;
    g.fillRect(44, 44, w - 88, h - 88);
    const r = rnd(key.length * 7);
    // border motifs
    g.fillStyle = '#e7c98a';
    for (let y = 60; y < h - 60; y += 34) { g.beginPath(); g.arc(16, y, 6, 0, Math.PI * 2); g.arc(w - 16, y, 6, 0, Math.PI * 2); g.fill(); }
    for (let x = 60; x < w - 60; x += 34) { g.beginPath(); g.arc(x, 16, 6, 0, Math.PI * 2); g.arc(x, h - 16, 6, 0, Math.PI * 2); g.fill(); }
    // medallion
    const cx = w / 2, cy = h / 2;
    for (let k = 5; k >= 1; k--) {
      g.fillStyle = ['#1f2c55', '#e3b25c', '#7a1a18', '#f0dcae', '#1f2c55'][k - 1];
      g.beginPath();
      for (let a = 0; a <= 16; a++) {
        const t = (a / 16) * Math.PI * 2, rr = k * 34 * (a % 2 ? 0.78 : 1);
        g.lineTo(cx + Math.cos(t) * rr * 0.85, cy + Math.sin(t) * rr * 1.25);
      }
      g.fill();
    }
    // field scatter
    for (let i = 0; i < 70; i++) {
      g.fillStyle = r() > 0.5 ? 'rgba(232,196,120,0.55)' : 'rgba(30,44,85,0.6)';
      const x = 70 + r() * (w - 140), y = 70 + r() * (h - 140);
      if (Math.hypot(x - cx, (y - cy) / 1.4) < 190) continue;
      g.beginPath(); g.moveTo(x, y - 8); g.lineTo(x + 6, y); g.lineTo(x, y + 8); g.lineTo(x - 6, y); g.fill();
    }
    // wool noise
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.08})`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
  });

/** Rangoli at the threshold: concentric petals in festival colours */
export const rangoliTex = () =>
  tex('rangoli', 512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const rings: [number, number, string][] = [[240, 16, '#f2c94c'], [205, 16, '#eb5757'], [168, 12, '#ff8a00'], [130, 12, '#27ae60'], [95, 8, '#bb6bd9'], [60, 8, '#f2994a']];
    for (const [rr, n, col] of rings) {
      g.fillStyle = col;
      for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2;
        g.save(); g.translate(cx + Math.cos(t) * rr * 0.62, cy + Math.sin(t) * rr * 0.62); g.rotate(t);
        g.beginPath(); g.ellipse(0, 0, rr * 0.36, rr * 0.13, 0, 0, Math.PI * 2); g.fill(); g.restore();
      }
    }
    g.fillStyle = '#fff3d6'; g.beginPath(); g.arc(cx, cy, 34, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#eb5757'; g.beginPath(); g.arc(cx, cy, 18, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = 3;
    g.beginPath(); g.arc(cx, cy, 250, 0, Math.PI * 2); g.stroke();
  }, { aniso: 4 });

/** Carved wooden jharokha window with lattice (jali) */
export const jharokhaTex = () =>
  tex('jharokha', 256, 384, (g, w, h) => {
    g.fillStyle = '#4a2a14';
    g.fillRect(0, 0, w, h);
    // arch
    g.fillStyle = '#2a170b';
    g.beginPath();
    g.moveTo(28, h - 30); g.lineTo(28, 120); g.quadraticCurveTo(w / 2, 10, w - 28, 120); g.lineTo(w - 28, h - 30); g.closePath(); g.fill();
    // lattice
    g.save(); g.clip();
    g.fillStyle = '#1a0e06'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#8a5a30'; g.lineWidth = 5;
    for (let k = -h; k < w + h; k += 22) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + h, h); g.stroke(); g.beginPath(); g.moveTo(k, h); g.lineTo(k + h, 0); g.stroke(); }
    g.restore();
    // frame mouldings
    g.strokeStyle = '#c08a50'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(28, h - 30); g.lineTo(28, 120); g.quadraticCurveTo(w / 2, 10, w - 28, 120); g.lineTo(w - 28, h - 30); g.closePath(); g.stroke();
    g.fillStyle = '#6b3d1c'; g.fillRect(10, h - 34, w - 20, 22);
  });

/** Book spines for the reading-corner shelf */
export const booksTex = () =>
  tex('books', 256, 512, (g, w, h) => {
    g.fillStyle = '#2a170b'; g.fillRect(0, 0, w, h);
    const r = rnd(19);
    const shelves = 5, sh = h / shelves;
    const cols = ['#7a1a18', '#1f3a5f', '#c48a2a', '#2e5a3a', '#e9d6b4', '#5a2a5a', '#b5541c', '#d8b46a'];
    for (let s = 0; s < shelves; s++) {
      let x = 6;
      while (x < w - 10) {
        const bw = 7 + r() * 12, bh = sh * (0.62 + r() * 0.3);
        g.fillStyle = cols[Math.floor(r() * cols.length)];
        g.fillRect(x, (s + 1) * sh - 8 - bh, bw, bh);
        g.fillStyle = 'rgba(255,230,170,0.5)';
        g.fillRect(x + 1, (s + 1) * sh - 8 - bh * 0.8, bw - 2, 2);
        x += bw + 1;
      }
      g.fillStyle = '#6b3d1c'; g.fillRect(0, (s + 1) * sh - 8, w, 8);
    }
  });

/** Pichwai-style back panel for the Ghar Mandir */
export const mandirBackTex = () =>
  tex('mandirback', 512, 384, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h * 0.45, 20, w / 2, h * 0.45, w * 0.6);
    gr.addColorStop(0, '#f7c35c'); gr.addColorStop(0.55, '#c2571f'); gr.addColorStop(1, '#5a1410');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3; i++) {
      const cx = w * (0.25 + i * 0.25), cy = h * 0.5;
      g.fillStyle = 'rgba(255,240,200,0.85)';
      g.beginPath(); g.arc(cx, cy - 40, 46, 0, Math.PI * 2); g.fill(); // halo
      g.fillStyle = ['#2d3f7a', '#b5541c', '#2d3f7a'][i];
      g.beginPath(); g.ellipse(cx, cy + 30, 30, 62, 0, 0, Math.PI * 2); g.fill(); // murti silhouette
      g.fillStyle = '#e9c46a';
      g.beginPath(); g.arc(cx, cy - 40, 22, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = '#f2c94c'; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
    lotus(g, w / 2, h - 34, 28, '#f6d38a');
  });
