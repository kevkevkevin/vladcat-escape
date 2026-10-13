"use client";
import { useState } from 'react';

export function ContractAddress({ contract, compact = false }: { contract: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  async function copy() {
    try { await navigator.clipboard.writeText(contract); setCopied(true); setError(''); }
    catch { setError('Select and copy the address above.'); }
  }
  return <div className={compact ? 'purr-hero-contract' : 'contract-card'}>
    <span className="eyebrow">$PURRZ · CONTRACT ADDRESS</span>
    <div><code>{contract}</code><button type="button" className="button secondary" onClick={() => void copy()} aria-label="Copy $PURRZ contract address">{copied ? 'Copied ✓' : 'Copy CA'}</button></div>
    {copied && <span className="sr-only" role="status">Contract address copied.</span>}
    {error && <p role="status">{error}</p>}
  </div>;
}
