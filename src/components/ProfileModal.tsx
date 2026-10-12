"use client";
import { useEffect, useRef, useState } from 'react';
import type { PlayerAccount } from '@/game/profile';

export function ProfileModal({ open, user, takingChallenge, onSaved, onClose }: {
  open: boolean; user: PlayerAccount | null; takingChallenge: boolean;
  onSaved: (user: PlayerAccount) => Promise<void>; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [handle, setHandle] = useState('');
  const [wallet, setWallet] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (open) {
      setHandle(user?.xHandle ?? ''); setWallet(user?.walletAddress ?? ''); setError('');
      if (!dialog.current?.open) dialog.current?.showModal();
    } else if (dialog.current?.open) dialog.current.close();
  }, [open, user]);
  async function save() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ xHandle: handle, walletAddress: wallet }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      await onSaved(body.user);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save. Please retry.'); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} className="profile-dialog" aria-labelledby="profile-title" aria-describedby="profile-description" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}>
    <span className="eyebrow">YOUR CHALLENGE DETAILS</span>
    <img className="profile-mascot" src="/mewventure/pur-pur.webp" alt="PUR PUR waving hello" width={80} height={80} />
    <h2 id="profile-title">Your adventure starts with you.</h2>
    <p id="profile-description">Add your X handle and EVM wallet for the challenge and rewards.</p>
    <form onSubmit={e => { e.preventDefault(); void save(); }}>
      <label htmlFor="profile-handle">Enter X handle</label>
      <input id="profile-handle" aria-describedby="profile-handle-help" required maxLength={16} pattern="@?[A-Za-z0-9_]{1,15}" value={handle} onChange={e => setHandle(e.target.value)} placeholder="@your_handle" autoComplete="off" autoCapitalize="none" spellCheck={false} disabled={busy} />
      <p id="profile-handle-help" className="field-description">Make sure it is your active X handle. A wrong handle can’t receive rewards.</p>
      <label htmlFor="profile-wallet">Wallet address (EVM)</label>
      <input id="profile-wallet" aria-describedby="profile-wallet-help" required minLength={42} maxLength={42} value={wallet} onChange={e => setWallet(e.target.value)} placeholder="0x…" autoComplete="off" autoCapitalize="none" spellCheck={false} disabled={busy} />
      <p id="profile-wallet-help" className="field-description">Use an EVM wallet you control. Double-check the address; rewards will use this wallet.</p>
      {error && <p className="notice error" role="alert">{error}</p>}
      <div className="profile-actions"><button className="button primary" disabled={busy}>{busy ? 'Saving…' : takingChallenge ? 'Save & take the challenge →' : 'Save details →'}</button><button type="button" className="button secondary" disabled={busy} onClick={onClose}>{takingChallenge ? 'Cancel' : 'Close'}</button></div>
    </form>
  </dialog>;
}
