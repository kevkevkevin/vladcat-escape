import { apiFailure, requireGameplayUser } from '@/lib/supabase/server';
import { jsonInput } from '@/lib/supabase/request';
import { submitControls } from '@/lib/authority';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const input = await jsonInput(request);
    return Response.json(await submitControls((await requireGameplayUser()).id, input.streamId, input.controls), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiFailure(error); }
}
