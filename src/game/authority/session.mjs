import { controls } from './protocol.mjs';

// Receipt persistence is ordered; controls remain responsive during saves.
// A transport can never call checkpoint; only this server-owned engine can.
export class AuthoritySession {
  constructor(engine, run, adapter, now = () => performance.now()) {
    this.engine = engine; this.run = run; this.adapter = adapter; this.now = now;
    this.queue = Promise.resolve(); this.sequence = 0; this.closed = false;
    this.lastInput = now(); this.lastSave = now(); this.closing = false;
    this.streams = new Set(); this.failure = ''; this.inputPending = false;
  }
  exclusive(task) {
    const next = this.queue.catch(() => {}).then(() => { if (this.closed) throw new Error('Session ended. Resume your saved stage.'); return task(); });
    this.queue = next; return next;
  }
  setRun(run) { this.run = run; this.lastSave = this.now(); }
  async syncClock(state) {
    if (!['active','paused'].includes(this.run.status)) return;
    const timing = state.timing;
    if (!timing.eligible) throw new Error('Unverified stage transition');
    if (timing.stage !== this.run.stage) return; // Exit fade before the next layout.
    const playing = !timing.stopped;
    if (playing !== (this.run.status === 'active') || !playing && timing.stageMs > this.run.stageMs || playing && this.now() - this.lastSave > 1000) this.setRun(await this.adapter.progress(timing));
  }
  async advance() {
    let state = await this.engine.snapshot();
    while (state.events.length) {
      const event = state.events[0];
      if (event.stage !== this.run.stage || event.stage < 1 || event.stage > 49 || !Number.isSafeInteger(event.tick) || !Number.isSafeInteger(event.milliseconds) || event.milliseconds < 1) throw new Error('Engine stage order mismatch');
      if (!state.timing.eligible || !['active','paused'].includes(this.run.status)) throw new Error('Engine completed an invalid run');
      this.setRun(await this.adapter.checkpoint(event.stage, event.milliseconds));
      await this.engine.acknowledge(1);
      state = await this.engine.snapshot();
    }
    state = await this.engine.snapshot();
    const layoutStage = /^Level_(\d+)$/.exec(state.layout)?.[1];
    if (layoutStage && Number(layoutStage) > this.run.stage) throw new Error('Unverified stage transition');
    await this.syncClock(state);
    return state;
  }
  async input(raw) {
    const input = controls(raw);
    if (this.closed || this.closing) throw new Error('Session ended. Resume your saved stage.');
    if (this.inputPending) throw new Error('Controls are arriving too quickly');
    this.inputPending = true;
    try {
      if (input.sequence !== this.sequence + 1) throw new Error('Input order mismatch. Resume your saved stage.');
      // Controls do not wait for database saves/screenshots. Completion still
      // commits through the ordered server queue using the trusted engine clock.
      await this.engine.pause(input.paused);
      await this.engine.input(input);
      this.sequence = input.sequence; this.lastInput = this.now();
      return { sequence: this.sequence };
    } finally { this.inputPending = false; }
  }
  async suspend() {
    await this.engine.pause(true);
    await this.engine.input({ keys: [], pointer: null, paused: true });
    return this.exclusive(async () => {
      await this.advance();
      return this.run;
    });
  }
  tick() {
    return this.exclusive(async () => {
      if (this.now() - this.lastInput > 6000) { await this.engine.pause(true); await this.engine.input({ keys: [], pointer: null, paused: true }); }
      await this.advance();
      // Saving progress can take longer than a frame. Read the trusted clock
      // again so the display includes gameplay that happened during that save.
      const state = await this.engine.snapshot();
      const timing = { ...state.timing, splits: this.run.splits, finished: this.run.status === 'completed', ...(this.run.status === 'completed' ? { stage: 50, stageMs: 0, totalMs: this.run.totalMs, stopped: true } : {}) };
      const frame = this.streams.size ? await this.engine.frame() : null;
      if (frame && state.audio?.length) await this.engine.acknowledgeAudio(state.audio.at(-1).id);
      return { layout: this.run.status === 'completed' ? 'Level_50' : state.layout, timing, run: this.run,
        ...(frame ? { image: frame, audio: state.audio ?? [] } : {}) };
    });
  }
  async close() {
    if (this.closed) return;
    this.closing = true;
    try { await this.suspend(); } catch { /* A rotated token cannot change the new session. */ }
    this.closed = true;
    await this.engine.close();
  }
}
