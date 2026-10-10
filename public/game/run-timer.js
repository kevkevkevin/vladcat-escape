// Real elapsed play time, independent of the engine's capped physics delta.
// Layout retries keep their time; completion hooks stop before exit fades.
export const TIMED_STAGES = 49;

export class RunTimer {
  constructor(ranked = false) {
    this.ranked = ranked;
    this.stage = null;
    this.elapsed = 0;
    this.splits = [];
    this.playing = false;
    this.frozen = false;
    this.finished = false;
    this.reason = ranked ? "" : "Practice run";
    this.last = null;
    this.blocked = false;
  }

  step(now, blocked = false) {
    if (this.last !== null && this.playing && !this.frozen && !this.blocked && !blocked) {
      this.elapsed += Math.max(0, now - this.last);
    }
    this.last = now;
    this.blocked = blocked;
  }

  restore(saved) {
    if (!saved || !Number.isInteger(saved.stage) || saved.stage < 1 || saved.stage > TIMED_STAGES || !Array.isArray(saved.splits) || saved.splits.length !== saved.stage - 1) return;
    this.stage = saved.stage;
    this.elapsed = Math.max(0, Number(saved.stageMs) || 0);
    this.splits = saved.splits.map(split => ({ stage: split.stage, milliseconds: split.milliseconds }));
  }

  enterLayout(name, now) {
    const match = /^Level_(\d+)$/.exec(name);
    const stage = match ? Number(match[1]) : null;
    this.last = now;
    if (stage === 50) {
      this.finished = this.stage === TIMED_STAGES && this.frozen && this.splits.length === TIMED_STAGES;
      if (!this.finished) this.invalidate("Start at stage 1 to rank a complete run.");
      this.playing = false;
      return;
    }
    if (!stage || stage > TIMED_STAGES) { this.playing = false; return; }
    if (stage === 1 && this.stage !== null && (this.stage !== 1 || this.frozen)) {
      this.invalidate("Start a new ranked run to post another time.");
      this.stage = null;
      this.elapsed = 0;
      this.splits = [];
      this.frozen = false;
      this.finished = false;
    }
    if (stage !== this.stage) {
      if (this.stage === null ? stage !== 1 : stage !== this.stage + 1 || !this.frozen) {
        this.invalidate("Stages must be completed in order. Start a new ranked run.");
      }
      this.stage = stage;
      this.elapsed = 0;
      this.frozen = false;
    }
    this.playing = true;
    this.blocked = false;
  }

  completeStage(now, blocked = false) {
    this.step(now, blocked);
    if (!this.playing || this.frozen || !this.stage) return;
    this.frozen = true;
    this.splits.push({ stage: this.stage, milliseconds: Math.max(1, Math.round(this.elapsed)) });
  }

  invalidate(reason) { if (this.ranked) this.reason = reason; }

  snapshot() {
    const stageMs = Math.round(this.elapsed);
    return {
      stage: this.stage, stageMs,
      totalMs: this.splits.reduce((sum, split) => sum + split.milliseconds, 0) + (this.frozen ? 0 : stageMs),
      splits: this.splits.map((split) => ({ ...split })),
      eligible: this.ranked && !this.reason,
      reason: this.reason,
      finished: this.finished,
      stopped: !this.playing || this.frozen || this.blocked,
    };
  }
}
