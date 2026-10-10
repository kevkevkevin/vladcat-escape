import { apiFailure, requireUser } from "@/lib/supabase/server";
import { challengeAction } from "@/lib/authority";
import { jsonInput } from "@/lib/supabase/request";
import { requireChallengeProfile } from "@/lib/supabase/profile";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const input = await jsonInput(request);
    const user = await requireUser();
    const action = input.action ?? 'start';
    const profile = action === 'start' || action === 'resume' ? requireChallengeProfile(user) : null;
    return Response.json(await challengeAction(user.id, { ...input, action, name: profile?.xHandle }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiFailure(error); }
}
