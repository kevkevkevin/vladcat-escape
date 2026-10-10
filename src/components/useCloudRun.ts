"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CloudRun } from "@/game/timing";

export function useCloudRun(onError: (message: string) => void) {
  const [run, setRun] = useState<CloudRun | null>(null);
  const [blocked, setBlocked] = useState(false);
  const ref = useRef<CloudRun | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const generation = useRef(0);
  const onErrorRef = useRef(onError); onErrorRef.current = onError;
  const desiredPlaying = useRef(false);
  const replace = useCallback((next: CloudRun | null) => {
    generation.current++;
    ref.current = next; setRun(next); setBlocked(false); desiredPlaying.current = false;
  }, []);
  const accept = useCallback((next: CloudRun) => {
    if (ref.current?.id !== next.id) return;
    const value = { ...next, streamId: ref.current.streamId };
    ref.current = value; setRun(value);
  }, []);
  const stop = useCallback((message: string) => { setBlocked(true); onErrorRef.current(message); }, []);
  const action = useCallback((kind: string, stage?: number, endpoint = '/api/runs') => {
    const id = ref.current?.id;
    const epoch = generation.current;
    const task = queue.current.catch(() => {}).then(async () => {
      const current = ref.current;
      if (!current || current.id !== id || epoch !== generation.current) return null;
      if (kind === 'heartbeat' && current.status !== 'active') return null;
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: current.id, token: current.token, action: kind, stage }), signal: AbortSignal.timeout(10000) });
      const body = await response.json();
      if (ref.current?.id !== current.id || epoch !== generation.current) return null;
      if (!response.ok) throw new Error(body.error);
      if (endpoint === '/api/runs') { ref.current = body; setRun(body); }
      else if (kind === 'abandon' || kind === 'finish') {
        const next = body.run ?? { ...current, status: kind === 'abandon' ? 'abandoned' : 'completed' };
        ref.current = next; setRun(next);
      }
      return body;
    }).catch(error => { if (epoch !== generation.current) return null; throw error; });
    queue.current = task;
    return task;
  }, []);
  const syncPlaying = useCallback((playing: boolean, stage: number) => {
    if (ref.current?.authoritative) return;
    if (!ref.current || !['active','paused'].includes(ref.current.status) || blocked) return;
    if (desiredPlaying.current === playing) return;
    desiredPlaying.current = playing;
    void action(playing ? 'play' : 'pause', stage).catch(e => { setBlocked(true); onErrorRef.current(e.message); });
  }, [action, blocked]);
  const checkpoint = useCallback(async (stage: number) => {
    if (ref.current?.authoritative) return;
    if (!ref.current) return;
    desiredPlaying.current = false;
    try { return await action('checkpoint', stage); }
    catch (e) { setBlocked(true); onErrorRef.current(e instanceof Error ? e.message : 'Progress could not be saved.'); throw e; }
  }, [action]);
  useEffect(() => {
    if (!run) return;
    const interval = setInterval(() => {
      if (ref.current?.status !== 'active' || ref.current.authoritative || blocked) return;
      void action('heartbeat').catch(e => { setBlocked(true); onErrorRef.current(e.message); });
    }, 4000);
    return () => clearInterval(interval);
  }, [Boolean(run), action, blocked]);
  useEffect(() => {
    const leave = () => {
      const current = ref.current;
      if (current?.status === 'active') void fetch('/api/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: current.id, token: current.token, action: 'pause' }), keepalive: true }).catch(() => {});
    };
    window.addEventListener('pagehide', leave);
    return () => { window.removeEventListener('pagehide', leave); leave(); };
  }, []);
  return { run, blocked, replace, accept, stop, action, checkpoint, syncPlaying };
}
