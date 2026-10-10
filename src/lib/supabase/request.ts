import { isSameOrigin } from "@/game/request-origin";
import { ApiError } from "./server";
export async function jsonInput(request: Request) {
  if (!isSameOrigin(request)) throw new ApiError("Invalid origin.", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ApiError("JSON required.", 415);
  // Limit bytes while reading; do not allocate an arbitrary incoming body.
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError("Invalid request.");
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 4096) { await reader.cancel(); throw new ApiError("Request is too large.", 413); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally { reader.releaseLock(); }
  try {
    const body = JSON.parse(text);
    if (!body || Array.isArray(body) || typeof body !== "object") throw new Error();
    return body as Record<string, unknown>;
  } catch { throw new ApiError("Invalid request."); }
}
