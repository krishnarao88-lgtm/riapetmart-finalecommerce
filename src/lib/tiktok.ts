import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const VIDEO_LIST_URL = "https://open.tiktokapis.com/v2/video/list/";

type TikTokTokens = { access_token: string; refresh_token: string; expires_in: number };

async function refreshToken(refreshToken: string): Promise<TikTokTokens | null> {
  const clientKey = process.env.TIKTOK_Client_key;
  const clientSecret = process.env.TIKTOK_Client_secret;
  if (!clientKey || !clientSecret) throw new Error("TikTok credentials are not set");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) return null;
  return res.json() as Promise<TikTokTokens>;
}

/** Exchanges a one-time OAuth authorization code for tokens (used only by the callback route). */
export async function exchangeCodeForToken(code: string, redirectUri: string) {
  const clientKey = process.env.TIKTOK_Client_key;
  const clientSecret = process.env.TIKTOK_Client_secret;
  if (!clientKey || !clientSecret) throw new Error("TikTok credentials are not set");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`TikTok token exchange failed: ${res.status} ${await res.text()}`);
  const tokens = (await res.json()) as TikTokTokens;

  const supabase = createServiceClient();
  await supabase.from("integration_tokens").upsert({
    provider: "tiktok",
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  });
}

async function getValidAccessToken(): Promise<string | null> {
  const supabase = createServiceClient();
  const { data } = await supabase.from("integration_tokens").select("*").eq("provider", "tiktok").single();
  if (!data) return null;

  const expiresInMs = data.expires_at ? new Date(data.expires_at).getTime() - Date.now() : 0;
  if (expiresInMs > 60_000) return data.access_token;
  if (!data.refresh_token) return null;

  const refreshed = await refreshToken(data.refresh_token);
  if (!refreshed) return null;
  await supabase
    .from("integration_tokens")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("provider", "tiktok");
  return refreshed.access_token;
}

export async function isTikTokConnected(): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase.from("integration_tokens").select("provider").eq("provider", "tiktok").single();
  return !!data;
}

export type TikTokVideo = { id: string; cover_image_url: string; share_url: string; title: string };

/** Latest public videos for the connected account, newest first. Returns [] if not connected or on API error. */
export async function getLatestTikTokVideos(maxCount = 6): Promise<TikTokVideo[]> {
  const token = await getValidAccessToken();
  if (!token) return [];

  const res = await fetch(`${VIDEO_LIST_URL}?fields=id,cover_image_url,share_url,title`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ max_count: maxCount }),
  });
  if (!res.ok) {
    console.error(`TikTok video.list failed: ${res.status} ${await res.text()}`);
    return [];
  }

  const body = (await res.json()) as { data?: { videos?: TikTokVideo[] } };
  return body.data?.videos ?? [];
}
