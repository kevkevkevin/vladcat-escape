import { readShames } from "@/game/leaderboard-store.mjs";
import { apiFailure, cloudConfigured, requireUser } from "@/lib/supabase/server";
import { publicBoard, runAction } from "@/lib/supabase/runs";
import { jsonInput } from "@/lib/supabase/request";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return Response.json(cloudConfigured() ? await publicBoard('abandoned') : await readShames(), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return apiFailure(error); }
}
export async function POST(request: Request) {
  try {
    const input = await jsonInput(request);
    const run = await runAction((await requireUser()).id, { ...input, action: 'abandon' });
    return Response.json({ id: run.id, run, ...(await publicBoard('abandoned')) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiFailure(error); }
}
