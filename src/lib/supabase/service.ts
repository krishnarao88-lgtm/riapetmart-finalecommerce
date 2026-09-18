import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/site";

// Bypasses RLS — only for trusted server code that needs the
// integration_tokens table (carrier OAuth tokens), which anon must never
// read. Never import this from a client component or a route that
// returns its result directly to the browser.
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createSupabaseClient(supabaseUrl, key, { auth: { persistSession: false } });
}
