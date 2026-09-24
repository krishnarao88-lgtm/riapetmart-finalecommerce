type FactorLike = { id: string; factor_type: string; status: string };

export const verifiedTotp = (factors: FactorLike[] = []) =>
  factors.find((f) => f.factor_type === "totp" && f.status === "verified");

/**
 * True when the account has a verified factor but this session hasn't passed it yet.
 * Takes factors from the server-verified user, not getAuthenticatorAssuranceLevel().nextLevel,
 * because that reads factors from the session cookie, which the browser controls.
 */
export function mfaStepRequired(currentLevel: string | null | undefined, factors: FactorLike[] = []) {
  return currentLevel !== "aal2" && factors.some((f) => f.status === "verified");
}

export const isTotpCode = (code: string) => /^\d{6}$/.test(code);

/** Same-origin /admin path to return to after the 2-step check; anything else falls back to /admin. */
export function safeAdminPath(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/")) return "/admin";
  try {
    const base = "https://admin.invalid";
    const url = new URL(next, base);
    if (url.origin === base && (url.pathname === "/admin" || url.pathname.startsWith("/admin/"))) {
      return url.pathname + url.search;
    }
  } catch {}
  return "/admin";
}
