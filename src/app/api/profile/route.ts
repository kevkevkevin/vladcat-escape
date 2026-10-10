import { adminClient, ApiError, apiFailure, requireUser } from '@/lib/supabase/server';
import { jsonInput } from '@/lib/supabase/request';
import { playerAccount } from '@/lib/supabase/profile';
import { challengeProfile } from '@/game/profile-rules.mjs';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const input = await jsonInput(request);
    const user = await requireUser();
    let profile;
    try { profile = challengeProfile(input); }
    catch (error) { throw new ApiError(error instanceof Error ? error.message : 'Check your challenge details.'); }
    const { data, error } = await adminClient().auth.admin.updateUserById(user.id, {
      app_metadata: { ...user.app_metadata, vladcat_profile: profile },
    });
    if (error || !data.user) throw new ApiError('Unable to save your challenge details. Please retry.', 503);
    return Response.json({ user: playerAccount(data.user) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiFailure(error); }
}
