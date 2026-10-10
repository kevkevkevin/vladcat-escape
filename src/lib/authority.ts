import 'server-only';
import { randomUUID } from 'node:crypto';
import { AuthoritySession } from '@/game/authority/session.mjs';
import { createEngine, serverBrowser } from '@/game/authority/browser.mjs';
import { rulesDigest } from '@/game/authority/proofs.mjs';
import { getGameSource } from '@/game/server';
import { runAction, saveEngineProgress, saveEngineCheckpoint } from '@/lib/supabase/runs';
import { ApiError } from '@/lib/supabase/server';
import type { CloudRun, RunTiming } from '@/game/timing';

type Session = AuthoritySession & { userId: string; streamId: string; timer?: ReturnType<typeof setTimeout>; polling?: boolean };
type Pool = { sessions: Map<string, Session>; locks: Map<string, Promise<unknown>>; reservations: Set<string>; starts?: Map<string, number[]> };
const poolKey = Symbol.for('vladcat.authority.pool');
const globals = globalThis as typeof globalThis & { [poolKey]?: Pool };
const pool: Pool = globals[poolKey] ??= { sessions: new Map(), locks: new Map(), reservations: new Set() };
const capacity = () => Math.max(1, Math.min(32, Number(process.env.VLADCAT_MAX_SESSIONS) || 4));
const starts: Map<string, number[]> = pool.starts ??= new Map<string, number[]>();

async function locked<T>(userId: string, work: () => Promise<T>): Promise<T> {
  const previous = pool.locks.get(userId) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(work);
  pool.locks.set(userId, next);
  try { return await next; } finally { if (pool.locks.get(userId) === next) pool.locks.delete(userId); }
}
async function dispose(session: Session) {
  if (session.timer) clearTimeout(session.timer);
  if (pool.sessions.get(session.userId) === session) pool.sessions.delete(session.userId);
  for (const send of session.streams) send({ closed: true });
  session.streams.clear();
  await session.close();
}
function poll(session: Session) {
  session.timer = setTimeout(async () => {
    if (session.closed) return;
    try {
      if (performance.now() - session.lastInput > 90000) { await dispose(session); return; }
      const frame = await session.tick();
      for (const send of session.streams) send(frame);
      if (session.run.status === 'completed') { await dispose(session); return; }
    } catch (error) {
      session.failure = error instanceof Error ? error.message : 'Gameplay verification stopped.';
      for (const send of session.streams) send({ error: session.failure });
      await dispose(session); return;
    }
    poll(session);
  }, 100);
  session.timer.unref?.();
}
export async function challengeAction(userId: string, input: Record<string, unknown>): Promise<CloudRun> {
  return locked(userId, async () => {
    const previous = pool.sessions.get(userId);
    if (input.action === 'start' || input.action === 'resume') {
      const attempts = (starts.get(userId) ?? []).filter(time => Date.now() - time < 60000);
      if (attempts.length >= 12) throw new ApiError('Please wait a minute before starting or reloading another challenge.', 429);
      attempts.push(Date.now()); starts.set(userId, attempts);
      if (starts.size > 4096) starts.delete(starts.keys().next().value!);
      if (!previous && pool.sessions.size + pool.reservations.size >= capacity()) throw new ApiError('Challenge servers are full. Practice is available; please retry shortly.', 503);
      pool.reservations.add(userId);
      try {
        try { await serverBrowser(); } catch { throw new ApiError('The challenge server needs Chromium installed. Practice is available.', 503); }
        if (previous) await dispose(previous);
        const run = await runAction(userId, input);
        const source = await getGameSource();
        const rules = rulesDigest(source);
        let engine;
        try { engine = await createEngine(source, run); }
        catch { throw new ApiError('Unable to start the trusted game engine. Your progress is saved; retry Resume challenge.', 503); }
        let current = run;
        const session = new AuthoritySession(engine, run, {
          progress: async (timing: RunTiming) => { current = await saveEngineProgress(userId, current, timing); return current; },
          checkpoint: async (stage: number, milliseconds: number) => { if (stage !== current.stage) throw new Error('Engine stage order mismatch'); current = await saveEngineCheckpoint(userId, current, milliseconds, rules); return current; },
        }) as Session;
        session.userId = userId; session.streamId = randomUUID();
        pool.sessions.set(userId, session); poll(session);
        return { ...run, streamId: session.streamId };
      } finally { pool.reservations.delete(userId); }
    }
    // Pausing a timer must pause the corresponding engine as well. Abandonment
    // disposes it before changing the immutable database outcome.
    if (previous && previous.run.id === input.id && previous.run.token === input.token) {
      if (input.action === 'pause') await previous.suspend();
      if (input.action === 'abandon') await dispose(previous);
    } else if (input.action === 'pause') throw new ApiError('Session ended. Resume your saved stage.', 409);
    return runAction(userId, input);
  });
}
export function getSession(userId: string, streamId: unknown): Session {
  const session = pool.sessions.get(userId);
  if (!session || session.streamId !== streamId || session.closed) throw new ApiError('Session ended. Resume your saved stage.', 409);
  return session;
}
export async function submitControls(userId: string, streamId: unknown, input: unknown) {
  try { return await getSession(userId, streamId).input(input); }
  catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(error instanceof Error ? error.message : 'Invalid controls.', 409); }
}
