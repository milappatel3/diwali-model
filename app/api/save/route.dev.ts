// Dev-only (npm run dev): the app posts its saved plan here and it is written into the project folder, so layout edits made in
// the browser land in data/ next to the code (and can be committed). Not part of the static export — see pageExtensions.
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const FILES: Record<string, string> = { plan: 'plan-2027.json', campus: 'campus-2027.json' };

export async function POST(req: Request) {
  let body: { kind?: string; data?: unknown };
  try { body = await req.json(); } catch { return new Response('bad json', { status: 400 }); }
  const name = body.kind ? FILES[body.kind] : undefined;
  if (!name || !body.data || typeof body.data !== 'object') return new Response('bad request', { status: 400 });
  const dir = path.join(process.cwd(), 'data');
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, name);
  const tmp = file + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(body.data, null, 1));
  await fs.rename(tmp, file);
  return Response.json({ ok: true, file: `data/${name}`, at: new Date().toISOString() });
}
