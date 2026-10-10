"use client";
import { useState } from "react";
import { hasChallengeProfile, type PlayerAccount } from '@/game/profile';
export function AccountPanel({ user, loading, onChange, onLogout, onEditProfile }: { user: PlayerAccount | null; loading: boolean; onChange: (user: PlayerAccount) => void; onLogout: () => Promise<void>; onEditProfile: () => void }) {
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch('/api/account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: signup ? 'signup' : 'login', email, password }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setPassword(""); onChange(body.user);
    } catch (e) { setError(e instanceof Error ? e.message : 'Login failed. Please retry.'); }
    finally { setBusy(false); }
  }
  return <section className="account-card" id="player-account" aria-label="Player account">
    <div><span className="eyebrow">YOUR ESCAPE, SAVED</span><h2>{user ? 'Welcome back, cat wrangler.' : 'Pick up where you left off.'}</h2><p>{user ? user.email : 'Log in with email to save your stages and join the leaderboard. You can practice without an account.'}</p>{user && <div className="account-details">{hasChallengeProfile(user) && <p><strong>{user.xHandle}</strong><span className="account-wallet">Wallet: {user.walletAddress}</span></p>}<button className="account-switch" onClick={onEditProfile}>{hasChallengeProfile(user) ? 'Edit X handle and wallet address' : 'Enter X handle and wallet address →'}</button><p className="field-description">Use your active X handle. A wrong handle can’t receive rewards.</p></div>}</div>
    {loading ? <p role="status">Checking your account…</p> : user ? <button className="button secondary" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await onLogout(); } catch(e) { setError(e instanceof Error ? e.message : 'Logout failed.'); } finally { setBusy(false); } }}>Log out</button> : <form className="account-form" onSubmit={e => { e.preventDefault(); void submit(); }}>
      <label>Email<input type="email" required autoComplete="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
      <label>Password<input type="password" required minLength={8} maxLength={128} autoComplete={signup ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>
      <button className="button primary" disabled={busy}>{busy ? 'Please wait…' : signup ? 'Create account →' : 'Log in →'}</button>
      <button className="account-switch" type="button" disabled={busy} onClick={() => { setSignup(!signup); setError(''); }}>{signup ? 'Already playing? Log in' : 'New here? Create an account'}</button>
    </form>}
    {error && <p className="notice error" role="alert">{error}</p>}
  </section>;
}
