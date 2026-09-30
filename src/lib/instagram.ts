import "server-only";
import { getValidAccessToken, isConnected, saveTokens, type OAuthTokens } from "@/lib/integration-tokens";

// Instagram API with Instagram Login: works with a Business or Creator account directly (no Facebook Page needed).
const GRAPH = "https://graph.instagram.com";
const WEEK_MS = 7 * 86_400_000;

function credentials() {
  const id = process.env.INSTAGRAM_APP_ID;
  const secret = process.env.INSTAGRAM_APP_SECRET;
  if (!id || !secret) throw new Error("Instagram app credentials are not set");
  return { id, secret };
}

/** Long-lived tokens have no separate refresh token: the token itself is renewed (60 more days) while valid. */
function asTokens(body: { access_token: string; expires_in: number }): OAuthTokens {
  return { access_token: body.access_token, refresh_token: body.access_token, expires_in: body.expires_in };
}

async function renew(token: string): Promise<OAuthTokens | null> {
  const res = await fetch(`${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`);
  if (!res.ok) {
    console.error(`Instagram token refresh failed: ${res.status} ${await res.text()}`);
    return null;
  }
  return asTokens(await res.json());
}

/** Callback route: code → short-lived token (1 hour) → long-lived token (60 days), then saved. */
export async function exchangeCodeForToken(code: string, redirectUri: string) {
  const { id, secret } = credentials();
  const short = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: secret, grant_type: "authorization_code", redirect_uri: redirectUri, code }),
  });
  if (!short.ok) throw new Error(`Instagram code exchange failed: ${short.status} ${await short.text()}`);
  const { access_token } = (await short.json()) as { access_token: string };

  const long = await fetch(
    `${GRAPH}/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(secret)}&access_token=${encodeURIComponent(access_token)}`,
  );
  if (!long.ok) throw new Error(`Instagram long-lived token failed: ${long.status} ${await long.text()}`);
  await saveTokens("instagram", asTokens(await long.json()));
}

export function isInstagramConnected() {
  return isConnected("instagram");
}

export type InstagramPost = {
  id: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  caption?: string;
};

/** Latest posts and Reels from the connected account, newest first. [] when not connected or on API error. */
export async function getLatestInstagramPosts(limit = 6): Promise<InstagramPost[]> {
  // Renew a week before expiry: an expired Instagram token can't be refreshed, only reconnected.
  const token = await getValidAccessToken("instagram", renew, WEEK_MS);
  if (!token) return [];
  const fields = "id,media_type,media_url,thumbnail_url,permalink,caption";
  const res = await fetch(`${GRAPH}/me/media?fields=${fields}&limit=${limit}&access_token=${encodeURIComponent(token)}`);
  if (!res.ok) {
    console.error(`Instagram media list failed: ${res.status} ${await res.text()}`);
    return [];
  }
  const body = (await res.json()) as { data?: InstagramPost[] };
  return body.data ?? [];
}
