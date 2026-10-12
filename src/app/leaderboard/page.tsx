import Link from 'next/link';
import type { Metadata, Viewport } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Leaderboard } from '@/components/Leaderboard';
import { ShameList } from '@/components/ShameList';
import { MewIcon } from '@/components/MewIcon';
export const metadata: Metadata = { title: 'Leaderboard | Purrvival', description: 'Celebrate the quickest paws and meet the adventure buddies who chose a nap.' };
export const viewport: Viewport = { themeColor: '#faf9fe' };
export default function LeaderboardPage() {
  return <div className="workspace leaderboard-workspace mew-ui">
    <SiteHeader active="leaderboard" />
    <main>
      <div className="board-intro"><div><span className="eyebrow">THE PURRVIVAL CHALLENGE</span><h1>Little paws.<br /><span>Lovely big victories.</span></h1><p>Every stage time adds up. The quickest paws take the top spot.</p></div><Link href="/play" className="button primary"><MewIcon name="paw" /> Take the challenge ↗</Link></div>
      <div className="board-rewards-note"><MewIcon name="star" /><div><span className="eyebrow">A LITTLE SPARKLE FOR YOUR BEST RUN</span><p>Weekly incentives for top players are planned from the token’s initial buy. <Link href="/#rewards">See the reward plan →</Link></p><span className="muted">Completed runs are ranked across all time. Reward details will be announced in our community.</span></div></div>
      <div className="mew-boards"><Leaderboard revision={0} /><ShameList revision={0} /></div>
    </main><SiteFooter />
  </div>;
}
