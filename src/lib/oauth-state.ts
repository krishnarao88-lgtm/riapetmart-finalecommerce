import { randomBytes, timingSafeEqual } from "node:crypto";

export type OAuthProvider = "easyparcel" | "tiktok";

export const stateCookieName = (provider: OAuthProvider) => `oauth_state_${provider}`;

export const newOAuthState = () => randomBytes(32).toString("hex");

/** Constant-time check that the `state` echoed by the provider is the one we set in the cookie. */
export function stateMatches(cookieValue: string | undefined, param: string | null): boolean {
  if (!cookieValue || !param) return false;
  const a = Buffer.from(cookieValue);
  const b = Buffer.from(param);
  return a.length === b.length && timingSafeEqual(a, b);
}
