import { adminClient, ApiError, apiFailure, authClient, cloudConfigured } from "@/lib/supabase/server";
import { jsonInput } from "@/lib/supabase/request";
import { playerAccount } from "@/lib/supabase/profile";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function GET() {
  if (!cloudConfigured()) return Response.json({ user: null, configured: false }, { headers });
  try {
    const { data } = await (await authClient()).auth.getUser();
    return Response.json({ user: data.user ? playerAccount(data.user) : null, configured: true }, { headers });
  } catch (error) { return apiFailure(error); }
}
export async function POST(request: Request) {
  try {
    const body = await jsonInput(request);
    const client = await authClient();
    if (body.action === 'logout') {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw new ApiError("Unable to log out. Please retry.");
      return Response.json({ user: null }, { headers });
    }
    if (!['login','signup'].includes(String(body.action))) throw new ApiError("Invalid login action.");
    if (typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || body.email.length > 254) throw new ApiError("Enter a valid email address.");
    if (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 128) throw new ApiError("Use a password between 8 and 128 characters.");
    // Fail closed until score storage is provisioned; do not create unusable accounts.
    adminClient();
    const credentials = { email: body.email.trim(), password: body.password };
    const { data, error } = body.action === 'signup' ? await client.auth.signUp(credentials) : await client.auth.signInWithPassword(credentials);
    if (error) throw new ApiError(body.action === 'login' ? "Email or password is incorrect, or login is temporarily unavailable." : "Account creation failed. Try logging in if you already have an account.");
    if (!data.session) throw new ApiError("Email confirmation is still enabled in Supabase. Disable Confirm email in Authentication settings to enable immediate login.", 503);
    if (!data.user) throw new ApiError('Unable to load your account.', 503);
    return Response.json({ user: playerAccount(data.user) }, { headers });
  } catch (error) { return apiFailure(error); }
}
