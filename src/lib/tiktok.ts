import "server-only";
import { getValidAccessToken, isConnected, saveTokens, type OAuthTokens } from "@/lib/integration-tokens";

const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const VIDEO_LIST_URL = "https://open.tiktokapis.com/v2/video/list/";

async function refreshToken(refreshToken: string): Promise<OAuthTokens | null> {
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
  return res.json() as Promise<OAuthTokens>;
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
  await saveTokens("tiktok", (await res.json()) as OAuthTokens);
}

export async function isTikTokConnected(): Promise<boolean> {
  return isConnected("tiktok");
}

export type TikTokVideo = { id: string; cover_image_url: string; share_url: string; title: string };

/** Latest public videos for the connected account, newest first. Returns [] if not connected or on API error. */
export async function getLatestTikTokVideos(maxCount = 6): Promise<TikTokVideo[]> {
  const token = await getValidAccessToken("tiktok", refreshToken);
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
