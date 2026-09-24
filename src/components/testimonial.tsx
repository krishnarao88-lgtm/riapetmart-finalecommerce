import { Star } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/** Shows the latest real approved review, or nothing — never a placeholder/fabricated quote. */
export async function Testimonial() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("customer_name, rating, body")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pt-10">
      <div className="rounded-3xl border-2 border-choc bg-peach/50 p-6 sm:p-8">
        <div className="flex items-center gap-1 text-terracotta">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="size-4" fill={i < data.rating ? "currentColor" : "none"} aria-hidden />
          ))}
        </div>
        <p className="mt-2 max-w-xl font-editorial text-xl italic text-choc">&ldquo;{data.body}&rdquo;</p>
        <p className="mt-2 text-sm font-bold text-choc-2">
          {data.customer_name} ·{" "}
          <Link href="/reviews" className="underline">
            See all reviews
          </Link>
        </p>
      </div>
    </section>
  );
}
