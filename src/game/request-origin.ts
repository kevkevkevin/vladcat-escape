export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    // Next's internal request URL can use localhost behind a proxy; the Host
    // header identifies the actual public origin used by the browser.
    const source = new URL(origin);
    return (source.protocol === "http:" || source.protocol === "https:") && source.host === request.headers.get("host");
  } catch { return false; }
}
