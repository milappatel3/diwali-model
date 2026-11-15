// Dev only: commit layout/ and push the current branch, so Claude can pull the edits.
import { execFile } from 'child_process';
import { promisify } from 'util';

const run = promisify(execFile);
const git = (args: string[]) => run('git', args, { cwd: process.cwd(), env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }, timeout: 60_000 });

export async function POST(req: Request) {
  const { message } = (await req.json().catch(() => ({}))) as { message?: string };
  try {
    const branch = (await git(['rev-parse', '--abbrev-ref', 'HEAD'])).stdout.trim();
    await git(['add', 'layout']);
    const staged = (await git(['diff', '--cached', '--name-only', '--', 'layout'])).stdout.trim();
    if (staged) await git(['commit', '-m', message?.trim() || `Layout edits from the app (${new Date().toLocaleString()})`, '--', 'layout']);
    const out = await git(['push', '-u', 'origin', branch]);
    return Response.json({ ok: true, branch, committed: !!staged, output: (out.stdout + out.stderr).trim() });
  } catch (err: any) {
    return Response.json({ ok: false, error: String(err?.stderr || err?.message || err).trim() }, { status: 500 });
  }
}
