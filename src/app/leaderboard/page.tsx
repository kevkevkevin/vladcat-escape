import Link from 'next/link';
import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Leaderboard } from '@/components/Leaderboard';
import { ShameList } from '@/components/ShameList';
export const metadata: Metadata = { title: 'Leaderboard | VLADCAT ESCAPE', description: 'The fastest VLADCAT escapes and the cat wranglers who tapped out.' };
export default function LeaderboardPage() {
  return <div className="workspace leaderboard-workspace"><SiteHeader active="leaderboard" /><main><div className="board-intro"><div><span className="eyebrow">THE CATGUY CHALLENGE</span><h1>Big claws.<br /><span>Small escape times.</span></h1><p>Finish the challenge. Every stage time adds up. Lowest total wins.</p></div><Link href="/play" className="button primary">Take the challenge ↗</Link></div><div className="board-rewards-note"><span className="eyebrow">WEEKLY INCENTIVES</span><p>Our plan is to reward top leaderboard players weekly from the token’s initial buy. <Link href="/#rewards">See the reward plan →</Link></p><span className="muted">Rankings below show completed runs across all time.</span></div><Leaderboard revision={0} /><ShameList revision={0} /></main><SiteFooter /></div>;
}
