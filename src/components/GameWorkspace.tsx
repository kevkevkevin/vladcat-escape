"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { GamePlayer } from "./GamePlayer";
import { LevelEditor } from "./LevelEditor";
import type { GameProject } from "@/game/types";
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';
import { PlayDisclosure } from './PlayDisclosure';
import { EndChallengeModal } from "./EndChallengeModal";
import { StoryReader } from "./StoryReader";
import { EscapeEnding } from "./EscapeEnding";
import { AccountPanel } from "./AccountPanel";
import { ProfileModal } from "./ProfileModal";
import { hasChallengeProfile, type PlayerAccount } from '@/game/profile';
import { useCloudRun } from "./useCloudRun";
import { formatTime, type CloudRun, type RunTicket, type RunTiming } from "@/game/timing";

export function GameWorkspace({ mode }: { mode: "play" | "editor" }) {
  const [project, setProject] = useState<GameProject | null>(null);
  const [error, setError] = useState("");
  const [layout, setLayout] = useState<string>();
  const [current, setCurrent] = useState("Menu");
  const [revision, setRevision] = useState(0);
  const [paused, setPaused] = useState(false);
  const [ticket, setTicket] = useState<RunTicket | null>(null);
  const [timing, setTiming] = useState<RunTiming | null>(null);
  const [starting, setStarting] = useState(false);
  const [scoreStatus, setScoreStatus] = useState("");
  const [scoreError, setScoreError] = useState("");
  const [endModal, setEndModal] = useState(false);
  const [endStatus, setEndStatus] = useState<"saving" | "saved" | "error">("saving");
  const [endError, setEndError] = useState("");
  const [user, setUser] = useState<PlayerAccount | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileIntent, setProfileIntent] = useState<'start' | 'resume' | null>(null);
  const [saved, setSaved] = useState<CloudRun | null>(null);
  const [timerSeed, setTimerSeed] = useState<CloudRun>();
  const cloud = useCloudRun(setError);
  const ended = useRef(false);
  const endSnapshot = useRef<RunTiming | null>(null);
  const endSaving = useRef<string | null>(null);
  const submitted = useRef<string | null>(null);
  const activeTicket = useRef<string | null>(null);
  activeTicket.current = ticket?.id ?? null;
  const stage = useRef<HTMLDivElement>(null);
  const playerHandle = ticket?.name ?? user?.xHandle ?? '';
  // Completed split times come from the server. The local clock provides the
  // smooth in-progress display until the next server acknowledgement.
  const recorded = cloud.run;
  const displayedTiming = ticket && recorded && timing && recorded.stage >= (timing.stage ?? 0) ? {
    ...timing,
    splits: recorded.splits,
    stageMs: recorded.stage === timing.stage ? timing.stageMs : recorded.splits.find(split => split.stage === timing.stage)?.milliseconds ?? timing.stageMs,
    totalMs: recorded.totalMs + (recorded.stage === timing.stage && recorded.status !== 'completed' && recorded.status !== 'abandoned' ? timing.stageMs : 0),
  } : timing;
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/project", { signal: controller.signal }).then((r) => { if (!r.ok) throw new Error("The game source could not be loaded."); return r.json(); }).then(setProject).catch((e) => { if (e.name !== "AbortError") setError(e.message); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let alive = true;
    fetch('/api/account', { cache: 'no-store' }).then(r => r.json()).then(body => { if (alive) { setUser(body.user ?? null); if (body.error) setError(body.error); } }).catch(() => { if (alive) setError('Unable to check your login. Practice is available.'); }).finally(() => { if (alive) setAccountLoading(false); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!user) { setSaved(null); return; }
    const controller = new AbortController();
    fetch('/api/progress', { signal: controller.signal, cache: 'no-store' }).then(async r => { const body = await r.json(); if (!r.ok) throw new Error(body.error); return body.run; }).then(setSaved).catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, [user?.email]);

  useEffect(() => {
    if (user && !hasChallengeProfile(user) && mode === 'play') setProfileOpen(true);
  }, [user, mode]);

  function closeProfile() { setProfileOpen(false); setProfileIntent(null); }
  function editProfile() { setProfileIntent(null); setProfileOpen(true); }
  function accountChanged(next: PlayerAccount) { setUser(next); setError(''); }
  async function profileSaved(next: PlayerAccount) {
    const intent = profileIntent;
    setUser(next); closeProfile();
    if (intent === 'start') await startRanked(next);
    else if (intent === 'resume') await resumeRun(next);
  }
  function checkProfile(account: PlayerAccount | null, intent: 'start' | 'resume') {
    if (!account) {
      setError('Log in with email to take the challenge.');
      const panel = document.getElementById('profile-panel') as HTMLDetailsElement | null;
      if (panel) panel.open = true;
      document.getElementById('player-account')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      requestAnimationFrame(() => document.querySelector<HTMLInputElement>('.account-form input[type="email"]')?.focus({ preventScroll: true }));
      return false;
    }
    if (!hasChallengeProfile(account)) { setProfileIntent(intent); setProfileOpen(true); return false; }
    return true;
  }

  async function logout() {
    if (ticket && !timing?.finished && !endModal) await cloud.action('pause');
    const response = await fetch('/api/account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error);
    await preview(); setUser(null); setSaved(null);
  }

  function openRun(body: CloudRun) {
    activeTicket.current = body.id;
    cloud.replace(body); setSaved(body); setTimerSeed(body);
    setTicket(body); setLayout(`Level_${body.stage}`); setCurrent(`Level_${body.stage}`);
    setTiming(null); setRevision(value => value + 1); setPaused(false);
    ended.current = false; endSaving.current = null; endSnapshot.current = null; setEndModal(false);
    setScoreStatus(''); setScoreError(''); submitted.current = null;
  }
  async function resumeRun(account = user) {
    const target = cloud.run ?? saved;
    if (!target || starting) return;
    if (!checkProfile(account, 'resume')) return;
    setStarting(true); setError('');
    try {
      const response = await fetch('/api/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resume', id: target.id }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      openRun(body);
    } catch(e) { setError(e instanceof Error ? e.message : 'Unable to resume.'); }
    finally { setStarting(false); }
  }

  async function startRanked(account = user) {
    if (starting) return;
    if (!checkProfile(account, 'start')) return;
    if (ticket && !timing?.finished && (!endModal || endStatus !== 'saved')) { setError('Your current challenge is saved. End it with the skull button before starting another.'); return; }
    setStarting(true); setError("");
    try {
      const response = await fetch("/api/runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: 'start' }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      openRun(body);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to start a ranked run."); }
    finally { setStarting(false); }
  }

  async function submitScore(next: RunTiming) {
    if (!ticket || ended.current || submitted.current === ticket.id) return;
    submitted.current = ticket.id;
    setScoreStatus("Saving your time…"); setScoreError("");
    try {
      await cloud.action('finish', undefined, '/api/leaderboard');
      if (activeTicket.current !== ticket.id) return;
      setScoreStatus("Your time is on the leaderboard.");
    } catch (e) {
      if (activeTicket.current !== ticket.id) return;
      submitted.current = null; setScoreStatus("");
      setScoreError(e instanceof Error ? e.message : "Your score could not be saved.");
    }
  }

  function receiveTiming(next: RunTiming) {
    if (ended.current) return;
    setTiming(next);
    if (ticket && next.stage && !next.finished) cloud.syncPlaying(!next.stopped && next.eligible, next.stage);
    if (next.finished && next.eligible && ticket && !scoreError) void submitScore(next);
  }

  async function preview(nextLayout?: string) {
    const leaving = activeTicket.current;
    if (ticket && !timing?.finished && !endModal) {
      try { const next = await cloud.action('pause'); if (next) setSaved(next); }
      catch { if (cloud.run) setSaved(cloud.run); }
    }
    if (activeTicket.current !== leaving) return;
    cloud.replace(null); setTimerSeed(undefined);
    activeTicket.current = null;
    ended.current = false; endSaving.current = null; endSnapshot.current = null; setEndModal(false);
    setTicket(null); setTiming(null); setScoreStatus(""); setScoreError("");
    setLayout(nextLayout); setRevision((value) => value + 1); setPaused(false);
  }

  function endChallenge() {
    if (!ticket || !timing?.stage || timing.finished || timing.splits.length >= 49 || ended.current) return;
    ended.current = true; setEndStatus("saving"); setEndError(""); setEndModal(true);
  }

  async function saveShame(next: RunTiming) {
    if (!ticket || endSaving.current === ticket.id) return;
    endSaving.current = ticket.id; setEndStatus("saving"); setEndError("");
    try {
      await cloud.action('abandon', undefined, '/api/shames');
      if (activeTicket.current !== ticket.id) return;
      setEndStatus("saved"); setSaved(null);
    } catch (e) {
      if (activeTicket.current !== ticket.id) return;
      endSaving.current = null; setEndStatus("error");
      setEndError(e instanceof Error && e.name === "TimeoutError" ? "Saving took too long. Please retry." : e instanceof Error ? e.message : "Your shame entry could not be saved.");
    }
  }

  function receiveEnded(next: RunTiming) {
    if (!ended.current) return;
    if (next.finished || next.splits.length >= 49) {
      ended.current = false; setEndModal(false); receiveTiming(next); return;
    }
    endSnapshot.current = next; setTiming(next); void saveShame(next);
  }

  return <div className={`workspace ${mode === 'play' ? 'play-workspace' : ''}`}>
    <SiteHeader active={mode} />
    <main>
      {mode === 'editor' && <div className="page-intro vladcat-intro editor-intro">
        <div className="hero-copy"><div className="eyebrow">MEET VLADCAT. YOUR NEXT ESCAPE STARTS HERE.</div><h1>BUILD HIS<span>NEXT ESCAPE.</span></h1><p>VLADCAT’s world is yours to edit. Move a trap, redraw a platform, change the rules, and playtest your next escape.</p><div className="hero-facts"><span><strong>50</strong> STAGES</span><span><strong>01</strong> CATGUY</span><span><strong>YOUR</strong> BEST TIME</span></div></div>
        <div className="vladcat-art"><span className="hero-orbit" aria-hidden="true" /><img src="/vladcat/vladcat-hero.webp" alt="VLADCAT, a muscular catguy with brown hair, a goatee, lime cat ears and a lime shoulder sash" width={800} height={1200} fetchPriority="high" /><span className="character-tag"><span className="status-dot" />VLADCAT / READY TO ESCAPE</span></div>
      </div>}
      {error && <div className="notice error" role="alert">{error}</div>}
      {mode === "editor" ? project ? <LevelEditor project={project} onSaved={(next) => setProject(next)} /> : <div className="empty-state">Opening the level files…</div> : <>
        <div className="play-topline"><h1>VLADCAT ESCAPE<span className="play-title-dot">.</span></h1><Link href="/leaderboard">Leaderboard ↗</Link></div>
        <div className="play-panels"><PlayDisclosure id="profile-panel" title="Your profile" hint={user ? user.xHandle ?? 'Add challenge details' : 'Log in & save your escape'}><AccountPanel user={user} loading={accountLoading} onChange={accountChanged} onLogout={logout} onEditProfile={editProfile} /></PlayDisclosure>
        <PlayDisclosure id="instructions-panel" title="How to play" hint="Controls & challenge rules"><div className="play-instructions"><p><kbd>←</kbd> <kbd>→</kbd> Move <span className="control-divider" /> <kbd>↑</kbd> Jump</p><p>Grab the key and find the door. Some stages change the rules. On mobile, use the on-screen buttons.</p><p>Practice freely. Log in and add your active X handle and EVM wallet to take the challenge. Clear stages in order; the lowest total time wins.</p><p>Failed attempts count. Pauses don’t. Your challenge progress is saved so you can resume later.</p><p className="instruction-phone-tip">Turn your phone horizontally for a better experience. Tap ⛶ to enter fullscreen.</p></div></PlayDisclosure></div>
        <div className="rotate-phone-tip"><span aria-hidden="true">↻</span><p>Turn your phone horizontally for a better experience.</p></div>
        <ProfileModal open={profileOpen} user={user} takingChallenge={Boolean(profileIntent)} onSaved={profileSaved} onClose={closeProfile} />
        {user && saved && !ticket && <div className="saved-progress"><div><strong>Escape saved at stage {saved.stage}.</strong><p>{saved.name} · {saved.splits.length} stages completed · {formatTime(saved.totalMs + saved.stageMs)}</p></div><button className="button primary" disabled={starting} onClick={() => void resumeRun()}>Resume challenge →</button></div>}
        <section className="play-shell" ref={stage} aria-label="Game">
          <div className="stage-toolbar"><div className="stage-label"><span className="status-dot" /><span>{current.startsWith("Level_") ? `STAGE ${current.slice(6).padStart(2, "0")} / 50` : current === "Scene" ? "THE STORY" : "READY TO ESCAPE"}</span></div><div className="run-clocks"><div><span>STAGE TIME</span><time aria-label="Stage time">{formatTime(displayedTiming?.stageMs ?? 0)}</time></div><div><span>TOTAL TIME</span><time aria-label="Total time">{formatTime(displayedTiming?.totalMs ?? 0)}</time></div></div><div className="toolbar-actions">
            <button className="icon-button" aria-label={paused ? "Resume game" : "Pause game"} onClick={() => setPaused(!paused)}>{paused ? "▶" : "Ⅱ"}</button>
            <button className="icon-button" disabled={starting} aria-label={ticket ? "Reload saved stage" : "Restart game"} onClick={() => { if (ticket) void resumeRun(); else preview(layout); }}>↻</button>
            <button className="icon-button" aria-label="Enter fullscreen" onClick={() => stage.current?.requestFullscreen().catch(() => setError("Fullscreen is unavailable in this browser."))}>⛶</button>
            <button className="end-challenge-button" aria-label="End challenge" title={ticket ? "End challenge and join the list of shames" : "Start a ranked run to enter the challenge"} disabled={!ticket || !timing?.stage || timing.finished || timing.splits.length >= 49 || starting || endModal} onClick={endChallenge}><span aria-hidden="true">☠</span><span className="end-challenge-label">End challenge</span></button>
          </div></div>
          <GamePlayer key={`${revision}-${layout}`} layout={layout} paused={paused || cloud.blocked || profileOpen} ranked={Boolean(ticket)} handle={ticket?.name ?? ""} ended={endModal} savedTiming={timerSeed} onCheckpoint={(completed) => { void cloud.checkpoint(completed).catch(() => {}); }} onLayout={setCurrent} onTiming={receiveTiming} onEnded={receiveEnded} overlay={current === "Scene" ? <StoryReader onBegin={() => preview("Level_1")} /> : current === "Level_50" ? <EscapeEnding handle={playerHandle} totalMs={cloud.run?.status === 'completed' ? cloud.run.totalMs : timing?.finished ? timing.totalMs : undefined} onReplay={() => preview()} /> : undefined} />
          {cloud.blocked && <div className="paused-banner"><span>Progress sync stopped. Resume your saved stage to continue.</span><button className="button primary" disabled={starting} onClick={() => void resumeRun()}>Resume saved stage →</button></div>}
          {paused && <div className="paused-banner"><span>Taking a breather.</span><button className="button primary" onClick={() => setPaused(false)}>Resume game →</button></div>}
          <div className="stage-footer"><span><span className="small-dot" /> {ticket ? `CHALLENGE · ${ticket.name}` : 'PRACTICE'}</span></div>
          <EndChallengeModal open={endModal} handle={ticket?.name ?? ""} timing={displayedTiming} status={endStatus} error={endError} onRetry={() => { if (endSnapshot.current) void saveShame(endSnapshot.current); }} onReturn={() => { window.location.assign('/leaderboard#shames'); }} />
        </section>
        <div className="challenge-invite"><div><span className="eyebrow">TAKE THE VLADCAT CHALLENGE</span><h2>{ticket && !timing?.finished && !endModal ? 'Challenge accepted. Save CLANK WORLD.' : 'Want to take the challenge?'}</h2><p>A fresh timer for each stage. One total for your escape.</p></div><button className="button primary" disabled={accountLoading || starting || Boolean(ticket && !timing?.finished && (!endModal || endStatus !== 'saved'))} onClick={() => void startRanked()}>{starting ? 'Starting…' : ticket && !timing?.finished && !endModal ? 'Challenge in progress' : 'Take the challenge →'}</button></div>
        <div className="run-summary">
          <p>{ticket && timing?.eligible ? "Complete each stage in order to post your time. Failed attempts count; pauses do not." : timing?.reason && timing.reason !== "Practice run" ? timing.reason : "Practice freely, or take the challenge to join the leaderboard."}</p>
          {displayedTiming?.splits.length ? <details><summary>{displayedTiming.splits.length} stage{displayedTiming.splits.length === 1 ? "" : "s"} completed · View times</summary><div className="split-grid">{displayedTiming.splits.map((split) => <span key={split.stage}><small>Stage {split.stage.toString().padStart(2, "0")}</small><time>{formatTime(split.milliseconds)}</time></span>)}</div></details> : null}
          {timing?.finished && <div className="run-finished"><span className="eyebrow">ESCAPE COMPLETE</span><h2>Your total: {formatTime(cloud.run?.status === 'completed' ? cloud.run.totalMs : timing.totalMs)}</h2><p role="status">{scoreStatus || (ticket ? scoreError : "Take the challenge to post a time.")}</p>{scoreError && <button className="button primary" onClick={() => void submitScore(timing)}>Retry saving score</button>}<Link className="invite-link" href="/leaderboard">View leaderboard →</Link></div>}
        </div>
      </>}
    </main>
    <SiteFooter />
  </div>;
}
