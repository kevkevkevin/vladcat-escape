// Executed exclusively inside the isolated server browser, never shipped as
// the player's engine. All runtime state is derived from the original rules.
import './scripts/main.js';
import { RunTimer } from './run-timer.js';
import { installKeyGlow } from './key-glow.js';
const response = await fetch('/authority-project');
const { project, stage, handle, savedTiming } = await response.json();
const originalFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href);
  if (url.pathname === '/game/data.json') return Promise.resolve(new Response(JSON.stringify(project), { headers: { 'Content-Type': 'application/json' } }));
  return originalFetch(input, init);
};
let runtime;
const timer = new RunTimer(true);
timer.restore(savedTiming);
let loaded = false;
let expected = stage;
let events = [];
let manuallyPaused = true;
let previousScale = 1;
let tick = 0;
let lastTick = performance.now();
let audio = []; let audioId = 0;
const soundNames = new Set(project.project[7].map(([name]) => name));
const sound = event => { audio.push({ id: ++audioId, ...event }); if (audio.length > 128) audio.shift(); };
const blocked = () => manuallyPaused || !runtime || runtime.timeScale === 0 || runtime.globalVars.Paused === true || runtime.isSuspended;
window.__authority = {
  snapshot: () => ({ layout: loaded ? runtime.layout.name : '', stage: expected, tick, lastTick,
    blocked: blocked(), timing: timer.snapshot(),
    events: events.slice(), audio: audio.slice(), loaded,
  }),
  acknowledge: (count) => { events.splice(0, count); },
  acknowledgeAudio: (id) => { audio = audio.filter(event => event.id > id); },
  pause: (paused) => {
    if (expected > 49 && !paused) return;
    if (paused === manuallyPaused) return;
    timer.step(performance.now(), blocked());
    if (runtime) {
      if (paused) { previousScale = runtime.timeScale; runtime.timeScale = 0; }
      else runtime.timeScale = previousScale;
    }
    manuallyPaused = paused;
    timer.step(performance.now(), blocked());
  },
  inspect: () => Object.fromEntries(['spr_player_base', 'spr_key', 'spr_player_key', 'spr_door'].map(type => [type,
    loaded ? runtime.objects[type].getAllInstances().map(i => ({ x: i.x, y: i.y, width: i.width, height: i.height })) : []])),
};
window.runOnStartup(game => {
  runtime = game;
  installKeyGlow(game);
  // Mirror this pinned export's audio actions while keeping the original
  // actions and their return values intact for the game engine.
  const acts = self.C3.Plugins.Audio.Acts;
  const wrap = (name, event) => {
    const original = acts[name];
    acts[name] = function(...args) { const value = event.apply(this, args); if (value) sound(value); return original.apply(this, args); };
  };
  wrap('Play', function(file, loop, db, _pan, tag) { return !this._isSilent && soundNames.has(file[0]) ? { type: 'play', name: file[0], loop: Boolean(loop), volume: Math.pow(10, db / 20), tag } : null; });
  wrap('Stop', tag => ({ type: 'stop', tag }));
  wrap('StopAll', () => ({ type: 'stopAll' }));
  wrap('SetMuted', (tag, mode) => ({ type: 'mute', tag, muted: mode === 0 }));
  wrap('SetSilent', function(mode) { return { type: 'silent', silent: mode === 2 ? !this._IsSilent() : mode === 0 }; });
  wrap('SetMasterVolume', db => ({ type: 'master', volume: Math.pow(10, db / 20) }));
  self.EcodroidsTiming = {
    completeStage: level => {
      // This hook is called by the engine's actual exit rule. The server does
      // not expose any facility for a player to invoke it or alter globals.
      if (level < 1 || level > 49 || level !== expected || manuallyPaused || game.timeScale === 0 || game.globalVars.Paused) return;
      const count = timer.splits.length;
      timer.completeStage(performance.now(), blocked());
      if (timer.splits.length !== count + 1 || !timer.snapshot().eligible) return;
      events.push({ stage: level, tick, milliseconds: timer.splits.at(-1).milliseconds });
      expected++;
      if (level === 49) { manuallyPaused = true; game.timeScale = 0; }
    },
  };
  game.addEventListener('afteranylayoutstart', () => { game.globalVars.var_name_player = handle; timer.enterLayout(game.layout.name, performance.now()); timer.step(performance.now(), blocked()); });
  game.addEventListener('beforeanylayoutend', () => { timer.step(performance.now(), blocked()); timer.playing = false; });
  game.addEventListener('afterprojectstart', () => { loaded = true; game.timeScale = manuallyPaused ? 0 : 1; window.focus(); });
  game.addEventListener('tick', () => { tick++; lastTick = performance.now(); timer.step(lastTick, blocked()); });
});
window.c3_runtimeInterface = new window.RuntimeInterface({ useWorker: false, workerMainUrl: 'workermain.js', runtimeScriptList: ['scripts/c3main.js'], scriptFolder: 'scripts/', exportType: 'html5' });
