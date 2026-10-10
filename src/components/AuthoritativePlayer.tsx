'use client';
import { useEffect, useRef, useState, type ReactNode, type PointerEvent } from 'react';
import { HEIGHT, WIDTH, KEY_CODES, enqueueControls } from '@/game/authority/protocol.mjs';
import { GameAudio } from '@/game/authority/audio.mjs';
import type { CloudRun, RunTiming } from '@/game/timing';

type Controls = { sequence: number; keys: string[]; pointer: { x: number; y: number; down: boolean } | null; paused: boolean };
export function AuthoritativePlayer({ streamId, paused, ended, overlay, onRun, onLayout, onTiming, onEnded, onError }: {
  streamId: string; paused: boolean; ended: boolean; overlay?: ReactNode;
  onRun: (run: CloudRun) => void; onLayout: (name: string) => void; onTiming: (timing: RunTiming) => void; onEnded: (timing: RunTiming) => void; onError: (message: string) => void;
}) {
  const [image, setImage] = useState('');
  const [status, setStatus] = useState('Connecting to your challenge…');
  const surface = useRef<HTMLImageElement>(null);
  const keys = useRef(new Set<string>());
  const pointer = useRef<Controls['pointer']>(null);
  const queue = useRef<(Omit<Controls, 'sequence'> & { transition: boolean })[]>([]);
  const sequence = useRef(0);
  const busy = useRef(false);
  const timing = useRef<RunTiming | null>(null);
  const callbacks = useRef({ onRun, onLayout, onTiming, onEnded, onError });
  callbacks.current = { onRun, onLayout, onTiming, onEnded, onError };
  const stopped = useRef(paused || ended); stopped.current = paused || ended;
  const endedSent = useRef(false);
  const ending = useRef(ended); ending.current = ended;
  const audio = useRef<GameAudio | null>(null);
  function enqueue(transition = false) {
    enqueueControls(queue.current, { keys: stopped.current ? [] : [...keys.current], pointer: stopped.current ? null : pointer.current ? { ...pointer.current } : null, paused: stopped.current || document.hidden }, transition);
  }
  useEffect(() => {
    let alive = true; let transportClosed = false; let source: EventSource | undefined;
    audio.current = new GameAudio();
    let lastSent = 0;
    const fail = (message: string) => { if (!alive) return; source?.close(); if (transportClosed || ending.current) return; setStatus(message); callbacks.current.onError(message); };
    const send = async () => {
      if (!alive || transportClosed || timing.current?.finished || busy.current || !source || source.readyState !== EventSource.OPEN) return;
      if (!queue.current.length && Date.now() - lastSent > 1000) enqueue();
      const queued = queue.current.shift(); if (!queued) return;
      const { transition: _transition, ...next } = queued;
      if (queue.current.length > 32) { fail('Connection too slow. Resume your saved stage.'); return; }
      busy.current = true;
      try {
        const response = await fetch('/api/gameplay', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ streamId, controls: { ...next, sequence: sequence.current + 1 } }), signal: AbortSignal.timeout(8000) });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Controls could not be delivered.');
        sequence.current = body.sequence; lastSent = Date.now();
      } catch (error) { if (alive) fail(error instanceof Error ? error.message : 'Connection interrupted. Resume your saved stage.'); }
      finally { busy.current = false; }
    };
    // Deferral avoids opening two streams during Strict Mode's effect probe.
    const connect = setTimeout(() => {
      source = new EventSource(`/api/gameplay/stream?session=${encodeURIComponent(streamId)}`);
      source.onopen = () => { enqueue(true); void send(); };
      source.onmessage = event => {
        if (!alive) return;
        try {
          const body = JSON.parse(event.data);
          if (body.closed) { transportClosed = true; source?.close(); return; }
          if (body.error) { fail(body.error); return; }
          if (body.image) { setImage(`data:image/jpeg;base64,${body.image}`); setStatus(''); }
          audio.current?.receive(body.audio ?? []);
          callbacks.current.onRun(body.run); callbacks.current.onLayout(body.layout);
          timing.current = body.timing; callbacks.current.onTiming(body.timing);
        } catch { fail('Game stream interrupted. Resume your saved stage.'); }
      };
      source.onerror = () => fail('Game connection interrupted. Resume your saved stage.');
    }, 50);
    const interval = setInterval(() => { void send(); }, 100);
    const release = () => { keys.current.clear(); if (pointer.current) pointer.current.down = false; enqueue(true); };
    const keyUp = (event: KeyboardEvent) => { if (keys.current.delete(event.code)) enqueue(true); };
    window.addEventListener('keyup', keyUp); window.addEventListener('blur', release); document.addEventListener('visibilitychange', release);
    return () => { alive = false; clearTimeout(connect); clearInterval(interval); source?.close(); audio.current?.close(); audio.current = null; window.removeEventListener('keyup', keyUp); window.removeEventListener('blur', release); document.removeEventListener('visibilitychange', release); };
  }, [streamId]);
  useEffect(() => { if (paused || ended) keys.current.clear(); enqueue(true); }, [paused, ended]);
  useEffect(() => { if (image && !paused && !ended && !overlay) surface.current?.focus({ preventScroll: true }); }, [Boolean(image), paused]);
  useEffect(() => {
    if (ended && timing.current && !endedSent.current) { endedSent.current = true; callbacks.current.onEnded(timing.current); }
  }, [ended]);
  function point(event: PointerEvent<HTMLImageElement>, down = pointer.current?.down ?? false) {
    if (overlay || stopped.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = Math.min(rect.width / WIDTH, rect.height / HEIGHT);
    const left = rect.left + (rect.width - WIDTH * scale) / 2;
    const top = rect.top + (rect.height - HEIGHT * scale) / 2;
    const changed = down !== Boolean(pointer.current?.down);
    pointer.current = { x: Math.max(0, Math.min(WIDTH, (event.clientX - left) / scale)), y: Math.max(0, Math.min(HEIGHT, (event.clientY - top) / scale)), down };
    enqueue(changed);
  }
  function touchKey(code: string, down: boolean) { if (down) { audio.current?.unlock(); keys.current.add(code); } else keys.current.delete(code); enqueue(true); }
  return <div className={`game-player authoritative-player${overlay ? ' game-player-overlay' : ''}`}>
    {image && <img ref={surface} className="authority-screen" src={image} alt="VLADCAT ESCAPE live challenge" width={WIDTH} height={HEIGHT} draggable={false} tabIndex={overlay ? -1 : 0}
      onKeyDown={event => { if (overlay || stopped.current || !Object.hasOwn(KEY_CODES, event.code)) return; audio.current?.unlock(); event.preventDefault(); if (!event.repeat && !keys.current.has(event.code)) { keys.current.add(event.code); enqueue(true); } }}
      onPointerDown={event => { if (event.button !== 0) return; audio.current?.unlock(); event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture(event.pointerId); point(event, true); }}
      onPointerMove={event => point(event)} onPointerUp={event => point(event, false)} onPointerCancel={event => point(event, false)} onContextMenu={event => event.preventDefault()} />}
    {!overlay && !ended && <div className="authority-touch-controls" aria-label="Touch controls">{[['ArrowLeft','←'],['ArrowUp','↑'],['ArrowRight','→']].map(([code, label]) => <button key={code} aria-label={code === 'ArrowUp' ? 'Jump' : code === 'ArrowLeft' ? 'Move left' : 'Move right'} onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); touchKey(code, true); }} onPointerUp={() => touchKey(code, false)} onPointerCancel={() => touchKey(code, false)}>{label}</button>)}</div>}
    {overlay}
    {status && <div className="game-loading" role="status"><span>{status}</span></div>}
  </div>;
}
