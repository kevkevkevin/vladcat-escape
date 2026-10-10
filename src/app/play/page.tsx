import type { Metadata } from 'next';
import { GameWorkspace } from '@/components/GameWorkspace';
export const metadata: Metadata = { title: 'Play | VLADCAT ESCAPE', description: 'Practice the escape, take the VLADCAT challenge and beat the clock.' };
export default function PlayPage() { return <GameWorkspace mode="play" />; }
