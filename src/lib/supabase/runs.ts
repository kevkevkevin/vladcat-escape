import "server-only";
import { adminClient, ApiError } from "./server";
import { xHandle } from "@/game/leaderboard-rules.mjs";
import type { CloudRun, RunTiming, StageSplit } from "@/game/timing";
import { publicAction } from '@/game/authority/protocol.mjs';
import { attestSplit, verifiedRun, PROOF_VERSION } from '@/game/authority/proofs.mjs';

type Row = { id: string; user_id: string; handle: string; token: string; stage: number; stage_ms: number; total_ms: number; status: string; splits: StageSplit[]; finished_at: string };
const signingKey = () => process.env.VLADCAT_VERIFICATION_KEY || process.env.SUPABASE_SECRET_KEY || '';
export function runState(row: Row) {
  return { id: row.id, name: row.handle, token: row.token, stage: row.stage, stageMs: Number(row.stage_ms), totalMs: Number(row.total_ms), splits: row.splits.map(({ stage, milliseconds }) => ({ stage, milliseconds })), status: row.status, authoritative: true };
}
export async function savedRun(userId: string) {
  const { data, error } = await adminClient().from("vladcat_runs").select("*").eq("user_id", userId).in("status", ["active", "paused"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new ApiError("Cloud progress is awaiting the database setup.", 503);
  // Browsing saved progress does not resume the clock or take over another tab.
  return data ? { ...runState(data), token: "" } : null;
}
export async function runAction(userId: string, input: Record<string, unknown>) {
  if (!publicAction(String(input.action))) throw new ApiError('Stage completion and timers are controlled by the game server.', 403);
  const row = await applyAction(userId, input);
  if (input.action === 'finish' && !verifiedRun(row, signingKey())) throw new ApiError('This run has not passed server gameplay verification.', 409);
  return runState(row);
}
// Server-only: routes cannot select this path with a flag or client payload.
export async function saveEngineProgress(userId: string, run: CloudRun, timing: RunTiming) {
  if (timing.stage !== run.stage || !timing.eligible || !Number.isSafeInteger(timing.stageMs) || timing.stageMs < run.stageMs) throw new ApiError('Invalid engine clock.', 409);
  const now = new Date().toISOString();
  // Equal lease/clock timestamps prevent the legacy RPC from adding database
  // transit time when resuming an engine-timed run. Only this trusted clock counts.
  const { data, error } = await adminClient().from('vladcat_runs').update({ stage_ms: timing.stageMs, status: timing.stopped ? 'paused' : 'active', clock_at: now, lease_until: now, updated_at: now }).eq('id', run.id).eq('user_id', userId).eq('token', run.token).eq('stage', run.stage).in('status', ['active','paused']).select('*').maybeSingle();
  if (error || !data) throw new ApiError('Gameplay session changed. Resume your saved stage.', 409);
  return runState(data);
}
export async function saveEngineCheckpoint(userId: string, run: CloudRun, milliseconds: number, rules: string) {
  if (run.stage < 1 || run.stage > 49 || !Number.isSafeInteger(milliseconds) || milliseconds < 1 || milliseconds < run.stageMs) throw new ApiError('Invalid engine split.', 409);
  const { data: row, error: readError } = await adminClient().from('vladcat_runs').select('*').eq('id', run.id).eq('user_id', userId).eq('token', run.token).eq('stage', run.stage).in('status', ['active','paused']).maybeSingle();
  if (readError || !row) throw new ApiError('Gameplay session changed. Resume your saved stage.', 409);
  if (row.splits.length !== run.stage - 1) throw new ApiError('Invalid saved stage order.', 409);
  const split = attestSplit(row, { stage: run.stage, milliseconds }, rules, signingKey());
  const splits = [...row.splits, split];
  const stage = run.stage + 1;
  const now = new Date().toISOString();
  // The receipt, ordered advance, finality and trusted split commit together.
  const { data, error } = await adminClient().from('vladcat_runs').update({ splits, stage, stage_ms: 0, total_ms: splits.reduce((sum, part) => sum + part.milliseconds, 0), status: stage === 50 ? 'completed' : 'paused', clock_at: null, lease_until: null, updated_at: now, ...(stage === 50 ? { finished_at: now } : {}) }).eq('id', run.id).eq('user_id', userId).eq('token', run.token).eq('stage', run.stage).in('status', ['active','paused']).select('*').maybeSingle();
  if (error || !data) throw new ApiError('Verified progress could not be saved. Resume your saved stage.', 409);
  return runState(data);
}
async function applyAction(userId: string, input: Record<string, unknown>): Promise<Row> {
  const action = input.action;
  if (!['start','resume','play','pause','heartbeat','checkpoint','abandon','finish'].includes(String(action))) throw new ApiError("Invalid run action.");
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (action !== 'start' && (typeof input.id !== 'string' || !uuid.test(input.id))) throw new ApiError("Invalid run.");
  if (!['start','resume'].includes(String(action)) && (typeof input.token !== 'string' || !uuid.test(input.token))) throw new ApiError("Invalid run session.");
  if (['play','checkpoint'].includes(String(action)) && (!Number.isInteger(input.stage) || Number(input.stage) < 1 || Number(input.stage) > 49)) throw new ApiError("Invalid stage.");
  let handle: string | null = null;
  if (action === 'start') { try { handle = xHandle(input.name); } catch { throw new ApiError("Enter a valid X handle (1–15 letters, numbers or underscores)."); } }
  // No client time, splits, status, user ID, or total is forwarded to Postgres.
  const { data, error } = await adminClient().rpc("vladcat_run_action", {
    p_user: userId, p_action: action, p_id: action === 'start' ? null : input.id,
    p_token: ['start','resume'].includes(String(action)) ? null : input.token,
    p_stage: ['play','checkpoint'].includes(String(action)) ? input.stage : null, p_handle: handle,
  });
  if (error) {
    const safe = /^(Run not found|Challenge has ended|This run is open in another session|Stage is not active|Stage order mismatch|Connection interrupted|Stage completed too quickly|Complete every stage)/.test(error.message);
    throw new ApiError(safe ? error.message : "Cloud progress is awaiting the database setup.", safe ? 409 : 503);
  }
  return data;
}
export async function publicBoard(outcome: 'completed' | 'abandoned') {
  const columns = "id,user_id,handle,total_ms,splits,stage,status,finished_at";
  if (outcome === 'completed') {
    const firstReceipt = [{ stage: 1, verification: { version: PROOF_VERSION } }];
    // Unsigned legacy times cannot crowd verified scores out of the limit.
    const [candidates, old] = await Promise.all([
      adminClient().from('vladcat_runs').select(columns).eq('status', 'completed').contains('splits', JSON.stringify(firstReceipt)).order('total_ms').order('finished_at').limit(1000),
      adminClient().from('vladcat_runs').select(columns).eq('status', 'completed').not('splits', 'cs', JSON.stringify(firstReceipt)).order('total_ms').order('finished_at').limit(100),
    ]);
    if (candidates.error || old.error) throw new ApiError('The online leaderboard is awaiting database setup.', 503);
    const clean = (row: NonNullable<typeof candidates.data>[number]) => ({ id: row.id, name: row.handle, totalMs: Number(row.total_ms), splits: (row.splits as StageSplit[]).map(({ stage, milliseconds }) => ({ stage, milliseconds })), completedAt: row.finished_at });
    const valid = (candidates.data ?? []).filter(row => verifiedRun(row, signingKey()));
    const provisional = [...(candidates.data ?? []).filter(row => !verifiedRun(row, signingKey())), ...(old.data ?? [])].sort((a,b) => Number(a.total_ms) - Number(b.total_ms));
    return { storage: 'online', entries: valid.slice(0,100).map(clean), provisional: provisional.slice(0,100).map(clean) };
  }
  let query = adminClient().from("vladcat_runs").select(columns).eq("status", outcome);
  query = query.order("finished_at", { ascending: false });
  const { data, error } = await query.limit(100);
  if (error) throw new ApiError("The online leaderboard is awaiting database setup.", 503);
  return { storage: "online", entries: (data ?? []).map(row => ({ id: row.id, name: row.handle, totalMs: Number(row.total_ms), stage: row.stage, completedStages: row.splits.length, abandonedAt: row.finished_at })) };
}
