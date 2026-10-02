import "server-only";
import { site } from "@/lib/site";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * The customer's personal share link (/shop?ref=code), creating their code on first use. Guests get one too, keyed
 * by email, the same code a signed-in account shows. Null if the database didn't answer.
 */
export async function referralLinkFor(email: string): Promise<string | null> {
  const owner = email.trim().toLowerCase();
  if (!owner.includes("@")) return null;
  const supabase = createServiceClient();
  const read = async () =>
    (await supabase.from("referral_codes").select("code").eq("owner_email", owner).maybeSingle()).data?.code as
      | string
      | undefined;
  let code = await read();
  if (!code) {
    // Same shape as get_or_create_referral_code(): the email's name part + 4 random characters.
    const base = owner.split("@")[0].replace(/[^a-z0-9]/g, "") || "friend";
    await supabase.from("referral_codes").insert({ code: `${base.slice(0, 20)}-${crypto.randomUUID().slice(0, 4)}`, owner_email: owner });
    code = await read(); // whichever code won if two requests raced
  }
  return code ? `${site.url}/shop?ref=${encodeURIComponent(code)}` : null;
}
