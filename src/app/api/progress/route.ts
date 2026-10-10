import { apiFailure, requireUser } from "@/lib/supabase/server";
import { savedRun } from "@/lib/supabase/runs";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return Response.json({ run: await savedRun((await requireUser()).id) }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return apiFailure(error); }
}
