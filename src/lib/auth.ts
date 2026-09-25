import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { mfaStepRequired, safeAdminPath } from "@/lib/mfa";
import { createClient } from "@/lib/supabase/server";

type Role = "admin" | "staff";

/**
 * Like getAdminSession() but lets through sessions still waiting on their 2-step code. Only for /admin/mfa.
 * cache(): the admin layout and the page both ask for the session, so it is looked up once per request.
 */
export const getSessionPendingMfa = cache(async function getSessionPendingMfa() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = profile?.role === "admin" || profile?.role === "staff" ? (profile.role as Role) : null;
  return { supabase, user, role };
});

/**
 * Signed-in user and their role (null for customers). Sends signed-out visitors to the admin login,
 * and accounts with 2-step verification on to /admin/mfa until this session has passed it.
 */
export const getAdminSession = cache(async function getAdminSession() {
  const session = await getSessionPendingMfa();
  const { data } = await session.supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (mfaStepRequired(data?.currentLevel, session.user.factors)) {
    const next = safeAdminPath((await headers()).get("x-admin-path"));
    redirect(`/admin/mfa?next=${encodeURIComponent(next)}`);
  }
  return session;
});

async function requireRole(...roles: Role[]) {
  const session = await getAdminSession();
  if (!session.role || !roles.includes(session.role)) redirect("/admin");
  return { ...session, role: session.role };
}

/** Server-side gate for every admin page and action. The proxy check is only a first pass. */
export async function requireAdmin() {
  return requireRole("admin");
}

/** Gate for pages staff may also use (orders, packing). Admins pass too. */
export async function requireStaff() {
  return requireRole("admin", "staff");
}
