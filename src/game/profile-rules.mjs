import { getAddress, isAddress, zeroAddress } from 'viem';

export function challengeProfile(input) {
  const handle = typeof input?.xHandle === 'string' ? input.xHandle.trim().replace(/^@/, '') : '';
  if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) throw new Error('Enter your active X handle: 1–15 letters, numbers or underscores.');
  const address = typeof input?.walletAddress === 'string' ? input.walletAddress.trim() : '';
  if (!isAddress(address) || address.toLowerCase() === zeroAddress) throw new Error('Enter a valid, non-zero EVM wallet address. Check its spelling and checksum.');
  return { xHandle: `@${handle}`, walletAddress: getAddress(address) };
}

export function savedChallengeProfile(metadata) {
  try { return challengeProfile(metadata?.vladcat_profile); }
  catch { return { xHandle: null, walletAddress: null }; }
}
