import { apiFailure, requireUser, ApiError } from '@/lib/supabase/server';
import { getSession } from '@/lib/authority';
import { isSameOrigin } from '@/game/request-origin';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    if (request.headers.get('sec-fetch-site') === 'cross-site' || request.headers.has('origin') && !isSameOrigin(request)) throw new ApiError('Invalid origin.', 403);
    const session = getSession((await requireUser()).id, new URL(request.url).searchParams.get('session'));
    // One active viewer per engine. Reject a second connection rather than
    // letting it interleave controls or multiply screenshot work.
    if (session.streams.size) throw new ApiError('This challenge is already connected in another tab.', 409);
    const encoder = new TextEncoder();
    let send: (value: unknown) => void;
    const body = new ReadableStream({
      start(controller) {
        send = value => {
          try {
            if (controller.desiredSize !== null && controller.desiredSize < -1) { controller.error(new Error('Slow connection')); session.streams.delete(send); return; }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(value)}\n\n`));
            if (value && typeof value === 'object' && ('error' in value || 'closed' in value)) { session.streams.delete(send); controller.close(); }
          } catch { session.streams.delete(send); }
        };
        session.streams.add(send);
        request.signal.addEventListener('abort', () => { session.streams.delete(send); void session.suspend().catch(() => {}); }, { once: true });
      },
      cancel() { session.streams.delete(send); void session.suspend().catch(() => {}); },
    });
    return new Response(body, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store, no-transform', 'X-Accel-Buffering': 'no' } });
  } catch (error) { return apiFailure(error); }
}
