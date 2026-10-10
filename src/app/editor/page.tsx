import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { LevelCreatorPreview } from '@/components/LevelCreatorPreview';
export default function EditorPage() {
  return <div className="workspace creator-workspace"><SiteHeader active="editor" /><main>
    <h1 className="sr-only">VLADCAT level creator preview</h1>
    <LevelCreatorPreview />
    <div className="creator-preview-back"><Link className="button primary" href="/play">Play VLADCAT ESCAPE →</Link><Link href="/">Back to home</Link></div>
  </main><SiteFooter /></div>;
}
