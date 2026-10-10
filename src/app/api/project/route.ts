import { getGameSource } from "@/game/server";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(await getGameSource(), { headers: { "Cache-Control": "no-store" } });
}
