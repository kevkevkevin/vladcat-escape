import { getGameSource } from "@/game/server";
import { compileProject, validateLayout } from "@/game/codec.mjs";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const source = await getGameSource();
    return Response.json(compileProject(source, { startLayout: url.searchParams.get("layout") || undefined }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load game" }, { status: 400 });
  }
}
export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length")) > 2_000_000) return Response.json({ error: "Preview is too large" }, { status: 413 });
    const { layout } = await request.json();
    const source = await getGameSource();
    validateLayout(layout, source);
    return Response.json(compileProject(source, { startLayout: layout.name, override: layout }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid preview" }, { status: 400 });
  }
}
