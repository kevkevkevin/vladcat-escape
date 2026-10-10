import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import WebSocket from "ws";
// Supabase recommends ws for Node <22; @types/ws includes server overloads
// and event types which differ from Supabase's browser-shaped constructor.
type Transport = NonNullable<NonNullable<Parameters<typeof createClient>[2]>["realtime"]>["transport"];
const serverTransport = WebSocket as unknown as Transport;

export class ApiError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export const cloudConfigured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new ApiError("Cloud progress is awaiting Supabase setup. Practice is available.", 503);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { transport: serverTransport } });
}
// Authentication stays behind our same-origin API. Tokens never enter game
// messages or localStorage. Route Handlers can refresh these HttpOnly cookies.
export async function authClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new ApiError("Email login is awaiting Supabase setup.", 503);
  const jar = await cookies();
  return createServerClient(url, key, {
    realtime: { transport: serverTransport },
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => { for (const { name, value, options } of values) jar.set(name, value, options); },
    },
  });
}
export async function requireUser() {
  const client = await authClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new ApiError("Log in to save progress and play a ranked challenge.", 401);
  return data.user;
}
// Frequent control packets need identity only. Signature/expiry verification
// uses Supabase's cached public signing keys; symmetric projects fall back to
// the Auth server. Start/resume, profile and stream still use fresh getUser().
export async function requireGameplayUser() {
  const { data, error } = await (await authClient()).auth.getClaims();
  if (error || typeof data?.claims.sub !== 'string') throw new ApiError('Log in to continue your challenge.', 401);
  return { id: data.claims.sub };
}
export function apiFailure(error: unknown) {
  return Response.json({ error: error instanceof ApiError ? error.message : "Cloud storage is unavailable. Please retry." }, { status: error instanceof ApiError ? error.status : 503, headers: { "Cache-Control": "no-store" } });
}
