import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { PromotionForm, type PromotionRow } from "@/components/admin/promotion-form";
import { requireAdmin } from "@/lib/auth";
import { todayInKL } from "@/lib/kl-time";
import { isRunning } from "@/lib/promotions";
import { deletePromotion } from "./actions";

export const metadata: Metadata = { title: "Promotions", robots: { index: false } };

function fmt(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

export default async function PromotionsPage() {
  const { supabase } = await requireAdmin();
  const [{ data }, { data: brands }, { data: categories }] = await Promise.all([
    supabase.from("promotions").select("*").order("starts_on"),
    supabase.from("brands").select("id, name").order("name"),
    supabase.from("categories").select("id, name").order("sort"),
  ]);
  const today = todayInKL();
  const promos = ((data ?? []) as PromotionRow[]).map((p) => ({ ...p, discount: Number(p.discount) }));
  const upcoming = promos.filter((p) => p.ends_on >= today);
  const past = promos.filter((p) => p.ends_on < today);

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8">
      <AdminNav current="/admin/promotions" />
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Promotions</h1>
        <p className="text-sm text-ink-2">
          Sales switch on and off by themselves on these dates (Malaysia time). Customers always get the single best
          discount: sale, short-dated or bundle, never more than one. Raya dates follow the moon sighting, so check them
          each year.
        </p>
      </div>

      <section className="grid gap-3 rounded-[var(--radius-chunk)] border-2 border-ink bg-surface p-5">
        <h2 className="font-display text-xl font-extrabold">Add a sale</h2>
        <PromotionForm brands={brands ?? []} categories={categories ?? []} />
      </section>

      <section className="grid gap-3">
        <h2 className="font-display text-xl font-extrabold">Running and upcoming</h2>
        {upcoming.length === 0 && <p className="text-sm text-ink-2">Nothing scheduled.</p>}
        {upcoming.map((p) => (
          <details key={p.id} className="rounded-[var(--radius-chunk)] border-2 border-line bg-surface p-4">
            <summary className="flex cursor-pointer flex-wrap items-center gap-3">
              <strong>{p.name}</strong>
              <span className="text-sm text-ink-2">
                {fmt(p.starts_on)} – {fmt(p.ends_on)} · {Math.round(p.discount * 100)}% off
              </span>
              {!p.is_active ? (
                <span className="rounded-full bg-sunk px-2 py-0.5 text-xs font-bold">Off</span>
              ) : isRunning(p, today) ? (
                <span className="rounded-full bg-ok-bg px-2 py-0.5 text-xs font-bold text-ok-fg">Running now</span>
              ) : null}
            </summary>
            <div className="mt-4 grid gap-3">
              <PromotionForm promo={p} brands={brands ?? []} categories={categories ?? []} />
              <form action={deletePromotion}>
                <input type="hidden" name="id" value={p.id} />
                <button type="submit" className="text-sm font-semibold text-bad-fg underline">
                  Delete this sale
                </button>
              </form>
            </div>
          </details>
        ))}
      </section>

      {past.length > 0 && (
        <section className="grid gap-2">
          <h2 className="font-display text-xl font-extrabold">Past</h2>
          <ul className="grid gap-1 text-sm text-ink-2">
            {past.map((p) => (
              <li key={p.id}>
                {p.name}: {fmt(p.starts_on)} – {fmt(p.ends_on)}, {Math.round(p.discount * 100)}% off
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
