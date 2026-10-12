"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { GameLayout } from "@/game/types";
import type { CloudRun, RunTiming } from "@/game/timing";

export function GamePlayer({ layout, override, paused = false, ranked = false, handle = "", ended = false, savedTiming, overlay, onCheckpoint, onLayout, onTiming, onEnded }: { layout?: string; override?: GameLayout; paused?: boolean; ranked?: boolean; handle?: string; ended?: boolean; savedTiming?: CloudRun; overlay?: ReactNode; onCheckpoint?: (stage: number) => void; onLayout?: (name: string) => void; onTiming?: (timing: RunTiming) => void; onEnded?: (timing: RunTiming) => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const onLayoutRef = useRef(onLayout);
  const pausedRef = useRef(paused);
  const onTimingRef = useRef(onTiming);
  const onEndedRef = useRef(onEnded);
  const onCheckpointRef = useRef(onCheckpoint);
  const endedRef = useRef(ended);
  const [status, setStatus] = useState("Getting your adventure ready…");
  const [failed, setFailed] = useState(false);
  onLayoutRef.current = onLayout;
  pausedRef.current = paused;
  onTimingRef.current = onTiming;
  onEndedRef.current = onEnded;
  onCheckpointRef.current = onCheckpoint;
  endedRef.current = ended;

  useEffect(() => {
    const controller = new AbortController();
    let data: unknown;
    // Send when either side becomes ready. This also handles React Strict Mode
    // remounting an effect after the iframe already announced its readiness.
    const send = () => { if (data) frame.current?.contentWindow?.postMessage({ type: "game:init", data, ranked, handle, savedTiming }, window.location.origin); };
    const syncPause = () => frame.current?.contentWindow?.postMessage({ type: "game:pause", paused: pausedRef.current || document.hidden }, window.location.origin);
    const listener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === "game:waiting") send();
      if (event.data?.type === "game:loaded") {
        setStatus("");
        syncPause();
        if (endedRef.current) frame.current?.contentWindow?.postMessage({ type: "game:end" }, window.location.origin);
      }
      if (event.data?.type === "game:layout") onLayoutRef.current?.(event.data.layout);
      if (event.data?.type === "game:timing") onTimingRef.current?.(event.data.timing);
      if (event.data?.type === "game:checkpoint") onCheckpointRef.current?.(event.data.stage);
      if (event.data?.type === "game:ended") onEndedRef.current?.(event.data.timing);
      if (event.data?.type === "game:error") { setStatus(event.data.message); setFailed(true); }
    };
    window.addEventListener("message", listener);
    document.addEventListener("visibilitychange", syncPause);
    fetch(override ? "/api/runtime" : `/api/runtime${layout ? `?layout=${encodeURIComponent(layout)}` : ""}`, {
      method: override ? "POST" : "GET", headers: override ? { "Content-Type": "application/json" } : undefined,
      body: override ? JSON.stringify({ layout: override }) : undefined, signal: controller.signal,
    }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load the game");
      data = body; send();
    }).catch((error) => { if (error.name !== "AbortError") { setStatus(error.message); setFailed(true); } });
    return () => { controller.abort(); window.removeEventListener("message", listener); document.removeEventListener("visibilitychange", syncPause); };
  }, [layout, override, ranked, handle, savedTiming]);

  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: "game:pause", paused: paused || document.hidden }, window.location.origin);
  }, [paused]);

  useEffect(() => {
    if (ended) frame.current?.contentWindow?.postMessage({ type: "game:end" }, window.location.origin);
  }, [ended]);

  return <div className={`game-player${overlay ? " game-player-overlay" : ""}`}>
    <iframe ref={frame} src="/game/index.html" title="Purrvival escape game" allow="autoplay; fullscreen" allowFullScreen tabIndex={overlay ? -1 : 0} aria-hidden={Boolean(overlay)} />
    {overlay}
    {status && <div className={`game-loading ${failed ? "failed" : ""}`} role={failed ? "alert" : "status"}>
      {!failed && <span className="loader" />}<span>{status}</span>
    </div>}
  </div>;
}
