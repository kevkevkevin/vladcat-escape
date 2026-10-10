import Link from 'next/link';
export function SiteHeader({ active }: { active: 'home' | 'play' | 'leaderboard' | 'editor' }) {
  return <header className="site-header">
    <Link href="/" className="brand" aria-label="VLADCAT ESCAPE home"><img className="brand-mark" src="/vladcat/mark.svg" alt="" width={38} height={38} /><span>VLADCAT<span className="brand-subtitle">ESCAPE</span></span></Link>
    <nav className="main-nav" aria-label="Main navigation">{([['home', '/', 'Home'], ['play', '/play', 'Play'], ['leaderboard', '/leaderboard', 'Leaderboard'], ['editor', '/editor', 'Level editor']] as const).map(([key, href, label]) => <Link key={key} href={href} className={active === key ? 'active' : ''} aria-current={active === key ? 'page' : undefined}>{label}</Link>)}</nav>
    <span className="header-tag"><span className="status-dot" />THE CATGUY CHALLENGE</span>
  </header>;
}
