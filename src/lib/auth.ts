import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Server-side gate for every admin page and action. The proxy check is only a first pass. */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/admin");

  return { supabase, user };
}
