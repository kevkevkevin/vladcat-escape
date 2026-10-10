import "server-only";
import { adminClient, ApiError } from "./server";
import { xHandle } from "@/game/leaderboard-rules.mjs";
import type { StageSplit } from "@/game/timing";

type Row = { id: string; handle: string; token: string; stage: number; stage_ms: number; total_ms: number; status: string; splits: StageSplit[]; finished_at: string };
export function runState(row: Row) {
  return { id: row.id, name: row.handle, token: row.token, stage: row.stage, stageMs: Number(row.stage_ms), totalMs: Number(row.total_ms), splits: row.splits, status: row.status };
}
export async function savedRun(userId: string) {
  const { data, error } = await adminClient().from("vladcat_runs").select("*").eq("user_id", userId).in("status", ["active", "paused"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new ApiError("Cloud progress is awaiting the database setup.", 503);
  // Browsing saved progress does not resume the clock or take over another tab.
  return data ? { ...runState(data), token: "" } : null;
}
export async function runAction(userId: string, input: Record<string, unknown>) {
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
  return runState(data);
}
export async function publicBoard(outcome: 'completed' | 'abandoned') {
  const columns = "id,handle,total_ms,splits,stage,finished_at";
  let query = adminClient().from("vladcat_runs").select(columns).eq("status", outcome);
  query = outcome === 'completed' ? query.order("total_ms").order("finished_at") : query.order("finished_at", { ascending: false });
  const { data, error } = await query.limit(100);
  if (error) throw new ApiError("The online leaderboard is awaiting database setup.", 503);
  return { storage: "online", entries: (data ?? []).map(row => outcome === 'completed' ? {
    id: row.id, name: row.handle, totalMs: Number(row.total_ms), splits: row.splits, completedAt: row.finished_at,
  } : { id: row.id, name: row.handle, totalMs: Number(row.total_ms), stage: row.stage, completedStages: row.splits.length, abandonedAt: row.finished_at }) };
}
