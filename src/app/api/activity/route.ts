import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { titleCase } from "@/lib/seo";
import { supabasePublishableKey, supabaseUrl } from "@/lib/site";

export type Activity =
  | { kind: "views"; name: string; slug: string; count: number }
  | { kind: "purchase"; name: string; slug: string; firstName: string | null; town: string | null; at: string };

type Raw = {
  views: { name: string; slug: string; count: number }[];
  purchases: { name: string; slug: string; first_name: string | null; town: string | null; at: string }[];
};

/** Real recent activity (views and purchases) for the storefront pop-up. Same for every visitor, so cached. */
export async function GET() {
  const supabase = createClient(supabaseUrl, supabasePublishableKey, { auth: { persistSession: false } });
  const { data } = await supabase.rpc("recent_shop_activity");
  const raw = (data ?? { views: [], purchases: [] }) as Raw;
  const views: Activity[] = raw.views.map((v) => ({ kind: "views", name: titleCase(v.name), slug: v.slug, count: v.count }));
  const purchases: Activity[] = raw.purchases.map((p) => ({
    kind: "purchase",
    name: titleCase(p.name),
    slug: p.slug,
    firstName: p.first_name,
    town: p.town,
    at: p.at,
  }));
  // Interleave so the pop-up alternates between the two kinds.
  const items: Activity[] = [];
  for (let i = 0; i < Math.max(views.length, purchases.length); i++) {
    if (purchases[i]) items.push(purchases[i]);
    if (views[i]) items.push(views[i]);
  }
  return NextResponse.json({ items }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
