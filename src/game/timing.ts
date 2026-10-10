export type StageSplit = { stage: number; milliseconds: number };
export type RunTiming = {
  stage: number | null;
  stageMs: number;
  totalMs: number;
  splits: StageSplit[];
  eligible: boolean;
  reason: string;
  finished: boolean;
  stopped: boolean;
};
export type RunTicket = { token: string; id: string; name: string };
export type CloudRun = RunTicket & { stage: number; stageMs: number; totalMs: number; splits: StageSplit[]; status: string };
export type LeaderboardEntry = { id: string; name: string; totalMs: number; splits: StageSplit[]; completedAt: string };
export type ShameEntry = { id: string; name: string; totalMs: number; stage: number; completedStages: number; abandonedAt: string };

export function formatTime(milliseconds: number) {
  const centiseconds = Math.floor(Math.max(0, milliseconds) / 10);
  const seconds = Math.floor(centiseconds / 100);
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}.${(centiseconds % 100).toString().padStart(2, "0")}`;
}
