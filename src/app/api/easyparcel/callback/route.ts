import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { exchangeCodeForToken } from "@/lib/shipping/easyparcel";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const redirectUri = `${origin}/api/easyparcel/callback`;

  if (!code) {
    return NextResponse.redirect(`${origin}/admin/settings?easyparcel=error`);
  }

  try {
    await exchangeCodeForToken(code, redirectUri);
    return NextResponse.redirect(`${origin}/admin/settings?easyparcel=connected`);
  } catch {
    return NextResponse.redirect(`${origin}/admin/settings?easyparcel=error`);
  }
}
