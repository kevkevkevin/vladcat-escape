import test from 'node:test';
import assert from 'node:assert/strict';
import { challengeProfile, savedChallengeProfile } from '../src/game/profile-rules.mjs';
const wallet = '0x52908400098527886E0F7030069857D2E4169EE7';
test('challenge details normalize handles and checksum valid EVM addresses', () => {
  assert.deepEqual(challengeProfile({ xHandle: '  Cat_Guy  ', walletAddress: wallet.toLowerCase() }), { xHandle: '@Cat_Guy', walletAddress: wallet });
  assert.equal(challengeProfile({ xHandle: '@Cat', walletAddress: wallet }).xHandle, '@Cat');
});
test('challenge requires both details and rejects malformed or zero wallet addresses', () => {
  for (const xHandle of ['', '@', 'cat guy', 'cat/evil', 'a'.repeat(16), null]) assert.throws(() => challengeProfile({ xHandle, walletAddress: wallet }), /X handle/);
  for (const walletAddress of ['', '0x123', '0x' + '0'.repeat(40), wallet.replace('E0F', 'e0F'), null]) assert.throws(() => challengeProfile({ xHandle: 'Cat', walletAddress }), /EVM wallet/);
});
test('incomplete or unrelated metadata cannot satisfy the challenge gate', () => {
  const empty = { xHandle: null, walletAddress: null };
  assert.deepEqual(savedChallengeProfile(null), empty);
  assert.deepEqual(savedChallengeProfile({ xHandle: '@Spoof', walletAddress: wallet }), empty);
  assert.deepEqual(savedChallengeProfile({ vladcat_profile: { xHandle: '@Cat' } }), empty);
  assert.equal(savedChallengeProfile({ vladcat_profile: { xHandle: '@Cat', walletAddress: wallet } }).walletAddress, wallet);
});
