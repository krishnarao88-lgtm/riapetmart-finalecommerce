import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Magic-link landing: swaps the one-time code for a session, then sends the user on.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const loginPath = searchParams.get("login") ?? "/admin/login";
  // Only same-site paths, so the link can't bounce users to another domain.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const safeLogin = loginPath.startsWith("/") && !loginPath.startsWith("//") ? loginPath : "/admin/login";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  }
  return NextResponse.redirect(`${origin}${safeLogin}?error=link`);
}
