import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

export type Provider = "easyparcel" | "tiktok";
export type OAuthTokens = { access_token: string; refresh_token: string; expires_in: number };

export async function saveTokens(provider: Provider, tokens: OAuthTokens) {
  const { error } = await createServiceClient()
    .from("integration_tokens")
    .upsert({
      provider,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    });
  if (error) throw new Error(`Saving ${provider} tokens failed: ${error.message}`);
}

/** Returns a usable access token, refreshing it when it expires within a minute. */
export async function getValidAccessToken(
  provider: Provider,
  refresh: (refreshToken: string) => Promise<OAuthTokens | null>,
): Promise<string | null> {
  const { data } = await createServiceClient()
    .from("integration_tokens")
    .select("*")
    .eq("provider", provider)
    .single();
  if (!data) return null;

  const expiresInMs = data.expires_at ? new Date(data.expires_at).getTime() - Date.now() : 0;
  if (expiresInMs > 60_000) return data.access_token;
  if (!data.refresh_token) return null;

  const refreshed = await refresh(data.refresh_token);
  if (!refreshed) return null;
  // The fresh access token still works for this request even if persisting it fails.
  await saveTokens(provider, refreshed).catch(console.error);
  return refreshed.access_token;
}

export async function isConnected(provider: Provider): Promise<boolean> {
  const { data } = await createServiceClient()
    .from("integration_tokens")
    .select("provider")
    .eq("provider", provider)
    .single();
  return !!data;
}
