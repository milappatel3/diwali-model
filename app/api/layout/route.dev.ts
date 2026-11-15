// Dev only (see pageExtensions in next.config): save the current layout from the browser into the repo,
// so it can be committed, pushed and read by Claude.
//   POST { project, campus } → writes layout/plan-2027.json and layout/campus-2027.json
//   GET → the saved files (or nulls)
import { promises as fs } from 'fs';
import path from 'path';

const DIR = path.join(process.cwd(), 'layout');
const PLAN = path.join(DIR, 'plan-2027.json');
const CAMPUS = path.join(DIR, 'campus-2027.json');

async function readJSON(f: string) {
  try { return JSON.parse(await fs.readFile(f, 'utf8')); } catch { return null; }
}

export async function GET() {
  return Response.json({ project: await readJSON(PLAN), campus: await readJSON(CAMPUS) });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.project?.items || !body?.campus) return Response.json({ ok: false, error: 'Expected { project, campus }' }, { status: 400 });
  const savedAt = new Date().toISOString();
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(PLAN, JSON.stringify({ ...body.project, savedAt }, null, 1) + '\n');
  await fs.writeFile(CAMPUS, JSON.stringify({ ...body.campus, savedAt }, null, 1) + '\n');
  return Response.json({ ok: true, savedAt, files: ['layout/plan-2027.json', 'layout/campus-2027.json'] });
}
