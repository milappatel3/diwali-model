// Make the static export self-contained & relative (works from any sub-path / artifact host)
import fs from 'fs';
import path from 'path';
const out = path.resolve('out');
if (fs.existsSync(path.join(out, '_next'))) fs.renameSync(path.join(out, '_next'), path.join(out, 'nx'));
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
let n = 0;
for (const f of walk(out)) {
  if (!/\.(html|js|css|txt|json)$/.test(f)) continue;
  let s = fs.readFileSync(f, 'utf8');
  const o = s;
  // HTML references become relative; JS keeps a '/nx/' marker that Next's runtime uses to derive the base URL
  // Next's getAssetPrefix() looks for the marker in the absolute script URL — keep it absolute-style there
  s = s.split('indexOf("/_next/")').join('indexOf("/nx/")');
  s = s.split('/_next/').join('./nx/');
  // Turbopack worker bootstrap: resolve chunk URLs against the page, not the origin (so sub-paths work)
  s = s.replace(/r=\[t\.map\(s=>e\.h\("string"==typeof s\?s:s\.path,n\)\)\.reverse\(\),e\.X,n\]/g, 'r=[t.map(s=>new URL(e.h("string"==typeof s?s:s.path,n),location.href).href).reverse(),e.X,new URL(n,location.href).href]');
  s = s.split('new URL(e.h(a,n),location.origin)').join('new URL(e.h(a,n),location.href)');
  if (f.endsWith('.js')) s = s.split('\uFFFD').join('\\uFFFD');
  if (s !== o) { fs.writeFileSync(f, s); n++; }
}
for (const f of ['404.html', '_not-found.html']) { const p = path.join(out, f); if (fs.existsSync(p)) fs.rmSync(p); }
console.log('rewrote', n, 'files');
