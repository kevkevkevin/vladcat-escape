"use client";
import { useState } from 'react';
export function TokenLinks({ contract, xUrl, telegramUrl }: { contract: string; xUrl: string; telegramUrl: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  async function copy() {
    try { await navigator.clipboard.writeText(contract); setCopied(true); setError(''); }
    catch { setError('Select and copy the address above.'); }
  }
  return <div className="token-links"><div className="contract-card"><span className="eyebrow">TOKEN CONTRACT ADDRESS · CA</span><div><code>{contract || 'Contract address coming soon'}</code>{contract && <button className="button secondary" onClick={() => void copy()}>{copied ? 'Copied ✓' : 'Copy CA'}</button>}</div>{error && <p role="status">{error}</p>}</div><div className="social-links">{xUrl ? <a className="button secondary" href={xUrl} target="_blank" rel="noopener noreferrer">Follow on X ↗</a> : <span className="social-pending">X · Link coming soon</span>}{telegramUrl ? <a className="button secondary" href={telegramUrl} target="_blank" rel="noopener noreferrer">Join Telegram ↗</a> : <span className="social-pending">Telegram · Link coming soon</span>}</div></div>;
}
