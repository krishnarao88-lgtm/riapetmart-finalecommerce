import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Role = "admin" | "staff";

/** Signed-in user and their role (null for customers). Sends signed-out visitors to the admin login. */
export async function getAdminSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = profile?.role === "admin" || profile?.role === "staff" ? (profile.role as Role) : null;
  return { supabase, user, role };
}

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
