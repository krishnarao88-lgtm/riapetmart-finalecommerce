import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Email-link landing (confirm sign-up, reset password, staff sign-in): turns the link into a session.
// token_hash links work in any browser; `code` links only in the browser that asked for them.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const loginPath = searchParams.get("login") ?? "/admin/login";
  // Only same-site paths, so the link can't bounce users to another domain.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const safeLogin = loginPath.startsWith("/") && !loginPath.startsWith("//") ? loginPath : "/admin/login";

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(`${origin}${type === "recovery" ? "/account/password" : safeNext}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  }
  return NextResponse.redirect(`${origin}${safeLogin}?error=link`);
}
