import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { stateCookieName, stateMatches } from "@/lib/oauth-state";
import { exchangeCodeForToken } from "@/lib/shipping/easyparcel";

export async function GET(req: NextRequest) {
  await requireAdmin();
  const code = req.nextUrl.searchParams.get("code");
  const cookie = stateCookieName("easyparcel");
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const redirectUri = `${origin}/api/easyparcel/callback`;

  let result = "error";
  if (code && stateMatches(req.cookies.get(cookie)?.value, req.nextUrl.searchParams.get("state"))) {
    try {
      await exchangeCodeForToken(code, redirectUri);
      result = "connected";
    } catch (err) {
      console.error("EasyParcel OAuth callback failed:", err);
    }
  }

  const res = NextResponse.redirect(`${origin}/admin/settings?easyparcel=${result}`);
  res.cookies.delete(cookie);
  return res;
}
