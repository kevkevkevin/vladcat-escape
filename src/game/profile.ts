export type PlayerAccount = { email: string; xHandle: string | null; walletAddress: string | null };
export function hasChallengeProfile(user: PlayerAccount | null): user is PlayerAccount & { xHandle: string; walletAddress: string } {
  return Boolean(user?.xHandle && user?.walletAddress);
}
