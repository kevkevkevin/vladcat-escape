import 'server-only';
import type { User } from '@supabase/supabase-js';
import { savedChallengeProfile } from '@/game/profile-rules.mjs';
import type { PlayerAccount } from '@/game/profile';
import { ApiError } from './server';

export function playerAccount(user: User): PlayerAccount {
  return { email: user.email ?? '', ...savedChallengeProfile(user.app_metadata) };
}
export function requireChallengeProfile(user: User) {
  const profile = savedChallengeProfile(user.app_metadata);
  if (!profile.xHandle || !profile.walletAddress) throw new ApiError('Add your active X handle and EVM wallet before taking the challenge.', 422);
  return profile;
}
