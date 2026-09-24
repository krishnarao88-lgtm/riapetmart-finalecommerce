import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { newOAuthState, stateCookieName, type OAuthProvider } from "@/lib/oauth-state";

const authorizeUrl: Record<OAuthProvider, (origin: string, state: string) => string> = {
  easyparcel: (origin, state) =>
    `https://api.easyparcel.com/oauth/login?client_id=${process.env.EASYPARCEL_CLIENT_ID ?? ""}&redirect_uri=${encodeURIComponent(`${origin}/api/easyparcel/callback`)}&state=${state}`,
  tiktok: (origin, state) =>
    `https://www.tiktok.com/v2/auth/authorize/?client_key=${process.env.TIKTOK_Client_key ?? ""}&scope=${encodeURIComponent("user.info.profile,user.info.stats,video.list")}&response_type=code&redirect_uri=${encodeURIComponent(`${origin}/api/tiktok/callback`)}&state=${state}`,
};

export async function GET(req: NextRequest) {
  await requireAdmin();
  const provider = req.nextUrl.searchParams.get("provider");
  if (provider !== "easyparcel" && provider !== "tiktok") {
    return new NextResponse("Unknown provider", { status: 400 });
  }

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const state = newOAuthState();
  const res = NextResponse.redirect(authorizeUrl[provider](origin, state));
  res.cookies.set(stateCookieName(provider), state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
  });
  return res;
}
