// The bridge keeps the original engine inside its own document while Next.js
// owns navigation, editable source, and the level editor.
import "./scripts/main.js";
import { RunTimer } from "./run-timer.js";
import { installKeyGlow } from "./key-glow.js";

const embedded = window.parent !== window;
const post = (type, payload = {}) => {
  if (embedded) window.parent.postMessage({ type, ...payload }, location.origin);
};
let runtime;
let project;
let resolveProject;
let ranked = false;
let timer;
let handle = "";
let challengeEnded = false;
let savedTiming;
const projectReady = new Promise((resolve) => { resolveProject = resolve; });

window.addEventListener("message", (event) => {
  if (event.origin !== location.origin || event.source !== window.parent) return;
  const message = event.data;
  if (message?.type === "game:init" && !project && message.data?.project) {
    ranked = message.ranked === true;
    savedTiming = message.savedTiming;
    handle = typeof message.handle === "string" ? message.handle.slice(0, 24) : "";
    project = message.data;
    resolveProject(project);
  }
  if (message?.type === "game:pause" && runtime) {
    if (challengeEnded) return;
    timer?.step(performance.now(), runtime.timeScale === 0 || runtime.globalVars.Paused);
    runtime.timeScale = message.paused ? 0 : 1;
    timer?.step(performance.now(), message.paused || runtime.globalVars.Paused);
    if (timer) post("game:timing", { timing: timer.snapshot() });
  }
  if (message?.type === "game:end" && runtime && timer) {
    if (!challengeEnded && timer.splits.length < 49) {
      timer.step(performance.now(), runtime.timeScale === 0 || runtime.globalVars.Paused || runtime.isSuspended || document.hidden);
      timer.playing = false;
      timer.invalidate("Challenge ended.");
      runtime.timeScale = 0;
      challengeEnded = true;
    }
    post("game:ended", { timing: timer.snapshot() });
  }
});

function fail(error) {
  const message = error instanceof Error ? error.message : String(error);
  document.getElementById("runtime-error").textContent = `Unable to start the game: ${message}`;
  post("game:error", { message });
}

try {
  if (!window.C3_Is_Supported) throw new Error("This browser does not support the game's graphics features.");
  if (embedded) post("game:waiting");
  else {
    const response = await fetch("/api/runtime");
    if (!response.ok) throw new Error("The game data could not be loaded.");
    project = await response.json();
    resolveProject(project);
  }
  await projectReady;
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.href);
    if (url.pathname === "/game/data.json") return Promise.resolve(new Response(JSON.stringify(project), { headers: { "Content-Type": "application/json" } }));
    return originalFetch(input, init);
  };
  window.runOnStartup((game) => {
    runtime = game;
    installKeyGlow(game);
    timer = new RunTimer(ranked);
    if (ranked) timer.restore(savedTiming);
    const blocked = () => game.isSuspended || game.timeScale === 0 || game.globalVars.Paused === true || document.hidden;
    // Expression 138 is called by the actual exit rule, including the stage-49
    // back button. Skipping a stage never calls this hook.
    self.EcodroidsTiming = {
      completeStage: (level) => {
        if (level !== timer.stage) return;
        timer.completeStage(performance.now(), blocked());
        if (ranked) post("game:checkpoint", { stage: level });
        post("game:timing", { timing: timer.snapshot() });
      },
    };
    game.addEventListener("afteranylayoutstart", () => {
      game.globalVars.var_name_player = handle;
      timer.enterLayout(game.layout.name, performance.now());
      post("game:layout", { layout: game.layout.name });
      post("game:timing", { timing: timer.snapshot() });
    });
    game.addEventListener("beforeanylayoutend", () => {
      timer.step(performance.now(), blocked());
      timer.playing = false;
    });
    game.addEventListener("afterprojectstart", () => {
      post("game:loaded", { layout: game.layout.name });
      window.focus();
    });
    let last = "";
    let lastUpdate = 0;
    game.addEventListener("tick", () => {
      const name = game.layout.name;
      if (name !== last) { last = name; post("game:layout", { layout: name }); }
      const now = performance.now();
      timer.step(now, blocked());
      if (timer.playing && !timer.frozen && game.globalVars.Level > timer.stage) {
        timer.invalidate("Skipped stages are practice only. Start a new ranked run.");
      }
      if (now - lastUpdate >= 100) {
        lastUpdate = now;
        post("game:timing", { timing: timer.snapshot() });
      }
    });
  });
  // Main-thread mode lets the editor use the supported runtime script interface.
  window.c3_runtimeInterface = new window.RuntimeInterface({
    useWorker: false, workerMainUrl: "workermain.js",
    runtimeScriptList: ["scripts/c3main.js"], scriptFolder: "scripts/", exportType: "html5",
  });
  window.addEventListener("unhandledrejection", (event) => fail(event.reason));
} catch (error) { fail(error); }
