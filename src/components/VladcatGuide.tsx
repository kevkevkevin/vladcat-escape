"use client";
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { builtInGuide, guideTopics } from '@/game/guide-knowledge.mjs';
type Message = { role: 'user' | 'assistant'; text: string };
export function VladcatGuide() {
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [question, setQuestion] = useState('');
  const [mode, setMode] = useState<'ai' | 'builtin'>('builtin');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', text: 'Hey, cat wrangler. I’m mini VLADCAT. Big ears, tiny patience. Need a paw with the game?' }]);
  const launcher = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  const sending = useRef(false);
  function close() { setOpen(false); launcher.current?.focus(); }
  useEffect(() => {
    const change = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', change);
    return () => document.removeEventListener('fullscreenchange', change);
  }, []);
  useEffect(() => {
    if (open) input.current?.focus();
    const controller = new AbortController();
    if (open) fetch('/api/guide', { cache: 'no-store', signal: controller.signal }).then(response => response.json()).then(body => setMode(body.mode === 'ai' ? 'ai' : 'builtin')).catch(() => {});
    const escape = (event: KeyboardEvent) => {
      if (open && event.key === 'Escape' && !document.querySelector('dialog[open]')) { setOpen(false); launcher.current?.focus(); }
    };
    document.addEventListener('keydown', escape);
    return () => { controller.abort(); document.removeEventListener('keydown', escape); };
  }, [open]);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { if (open && log.current) log.current.scrollTop = log.current.scrollHeight; }, [messages, open]);
  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending.current) return;
    const history = messages.slice(-2).map(message => ({ role: message.role, content: message.text.slice(0, 240) }));
    setMessages(previous => [...previous.slice(-18), { role: 'user', text: trimmed }]);
    setQuestion(''); setNotice('');
    let reply = builtInGuide(trimmed);
    if (mode === 'ai') {
      sending.current = true; setBusy(true);
      const controller = new AbortController(); request.current = controller;
      const timeout = window.setTimeout(() => controller.abort(), 20000);
      try {
        const response = await fetch('/api/guide', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: trimmed, history }), signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? 'Live AI is unavailable.');
        reply = body.reply; setMode(body.mode === 'ai' ? 'ai' : 'builtin'); setNotice(body.notice ?? '');
      } catch (error) { setNotice(error instanceof Error && error.name !== 'AbortError' ? `${error.message} Showing built-in help.` : 'Live AI took too long. Showing built-in help.'); }
      finally { window.clearTimeout(timeout); sending.current = false; setBusy(false); request.current = null; }
    }
    setMessages(previous => [...previous, { role: 'assistant', text: reply }]);
  }
  return <aside className="vladcat-guide" hidden={fullscreen} aria-label="VLADCAT game guide">
    {open && <section className="guide-panel" role="dialog" aria-modal="false" aria-labelledby="guide-title" aria-describedby="guide-mode">
      <header className="guide-header"><img src="/vladcat/vladcat-chibi.webp" alt="" width={40} height={60} /><div><span className="eyebrow">A LITTLE PAW FROM VLADCAT</span><h2 id="guide-title">Your catguy guide.</h2></div><button className="guide-close" aria-label="Close VLADCAT guide" onClick={close}>×</button></header>
      <p id="guide-mode" className="guide-mode"><span className="status-dot" /> {mode === 'ai' ? 'Live AI · messages sent to OpenAI' : 'Built-in game help'}</p>
      <div className="guide-log" ref={log} role="log" aria-label="Guide conversation" aria-live="polite" aria-relevant="additions">{messages.map((message, index) => <div className={`guide-message ${message.role}`} key={index}><span>{message.role === 'assistant' ? 'VLADCAT' : 'YOU'}</span><p>{message.text}</p></div>)}</div>
      {busy && <p className="guide-notice" role="status">VLADCAT is thinking…</p>}
      {notice && <p className="guide-notice" role="status">{notice}</p>}
      <div className="guide-topics" aria-label="Quick help topics">{guideTopics.slice(0, 5).map(topic => <button key={topic.label} disabled={busy} onClick={() => void ask(topic.label)}>{topic.label}</button>)}</div>
      <form className="guide-form" onSubmit={event => { event.preventDefault(); void ask(question); }}><label className="sr-only" htmlFor="guide-question">Ask VLADCAT a game question</label><input ref={input} id="guide-question" value={question} maxLength={400} autoComplete="off" onChange={event => setQuestion(event.target.value)} placeholder="Need a paw? Ask about the game…" /><button className="button primary" disabled={busy || !question.trim()} aria-label="Send guide question">↑</button></form>
      <div className="guide-links"><Link href="/play" onClick={() => setOpen(false)}>Play →</Link><Link href="/leaderboard" onClick={() => setOpen(false)}>Leaderboard →</Link><span>{mode === 'ai' ? 'Your question and two recent messages go to OpenAI.' : 'Built-in help stays in this browser.'}</span></div>
    </section>}
    <button ref={launcher} className="guide-launcher" aria-label={open ? 'Hide VLADCAT guide' : 'Open VLADCAT guide'} aria-expanded={open} onClick={() => open ? close() : setOpen(true)}><span className="guide-bubble">{open ? 'Got your back.' : 'Need a paw?'}</span><img src="/vladcat/vladcat-chibi.webp" alt="Chibi VLADCAT waving, with lime cat ears and sash" width={84} height={126} /></button>
  </aside>;
}
