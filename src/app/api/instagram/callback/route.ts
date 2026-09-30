import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { exchangeCodeForToken } from "@/lib/instagram";
import { stateCookieName, stateMatches } from "@/lib/oauth-state";

export async function GET(req: NextRequest) {
  await requireAdmin();
  const code = req.nextUrl.searchParams.get("code");
  const cookie = stateCookieName("instagram");
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const redirectUri = `${origin}/api/instagram/callback`;

  let result = "error";
  if (code && stateMatches(req.cookies.get(cookie)?.value, req.nextUrl.searchParams.get("state"))) {
    try {
      // Instagram appends "#_" to the code in some flows; it isn't part of the code.
      await exchangeCodeForToken(code.replace(/#_$/, ""), redirectUri);
      result = "connected";
    } catch (err) {
      console.error("Instagram OAuth callback failed:", err);
    }
  }

  const res = NextResponse.redirect(`${origin}/admin/settings?instagram=${result}`);
  res.cookies.delete(cookie);
  return res;
}
