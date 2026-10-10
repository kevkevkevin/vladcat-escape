import fs from "node:fs/promises";
import path from "node:path";
import { getGameSource } from "@/game/server";
import { validateLayout } from "@/game/codec.mjs";

export async function PUT(request: Request) {
  if (process.env.NODE_ENV !== "development") return Response.json({ error: "Source saving is available in local development. Download the JSON to keep these changes." }, { status: 405 });
  const authority = request.headers.get("host") ?? "";
  const host = new URL(`http://${authority}`).hostname;
  const origin = request.headers.get("origin");
  // Next may normalize request.url to localhost. Match the actual HTTP Host
  // header, so an editor opened at 127.0.0.1 can save its own source.
  if (!["localhost", "127.0.0.1", "[::1]"].includes(host) || (origin && new URL(origin).host !== authority) || !request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ error: "Source saving requires a same-origin local request" }, { status: 403 });
  try {
    if (Number(request.headers.get("content-length")) > 2_000_000) return Response.json({ error: "Layout is too large" }, { status: 413 });
    const layout = await request.json();
    const source = await getGameSource();
    validateLayout(layout, source);
    const manifest = JSON.parse(await fs.readFile(path.join(process.cwd(), "src/game/layouts/manifest.json"), "utf8")) as { name: string; file: string }[];
    const entry = manifest.find((l) => l.name === layout.name);
    if (!entry || path.basename(entry.file) !== entry.file) throw new Error("Invalid layout file");
    const target = path.join(process.cwd(), "src/game/layouts", entry.file);
    const temporary = `${target}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(layout, null, 2) + "\n");
    await fs.rename(temporary, target);
    return Response.json({ saved: true, file: `src/game/layouts/${entry.file}` });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to save layout" }, { status: 400 });
  }
}
