import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { formatMyr } from "@/lib/pricing";
import { createServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = { title: "Customers & follow-ups", robots: { index: false } };

const DAY = 86_400_000;
const date = (iso: string) => new Date(iso).toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "short" });
const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

type Signup = { id: string; email: string; created_at: string; welcome2_sent_at: string | null; welcome3_sent_at: string | null };
type Cart = { email: string; items: { name: string; title: string; qty: number }[]; subtotal: number; created_at: string; reminded_at: string | null; recovered: boolean };
type Event = { product_id: string; products: { name: string } | null };

function Tile({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="grid gap-0.5 rounded-2xl border-2 border-line bg-surface p-4">
      <span className="text-xs font-bold uppercase tracking-wide text-ink-2">{label}</span>
      <span className="text-2xl font-extrabold tabular-nums">{value}</span>
      {note && <span className="text-xs text-ink-2">{note}</span>}
    </div>
  );
}

/** Follow-up status for a welcome email due `days` after sign-up: sent, skipped (already a customer), due, or waiting. */
function followUp(sentAt: string | null, signedUp: string, days: number, isCustomer: boolean) {
  if (sentAt) return isCustomer ? "Skipped (ordered)" : `Sent ${date(sentAt)}`;
  const due = new Date(signedUp).getTime() + days * DAY;
  if (Date.now() - new Date(signedUp).getTime() > 30 * DAY) return "Not sent (over 30 days)";
  return due <= Date.now() ? "Due, not sent yet" : `Due ${date(new Date(due).toISOString())}`;
}

function top(rows: Event[], n = 5) {
  const counts = new Map<string, number>();
  for (const r of rows) if (r.products?.name) counts.set(r.products.name, (counts.get(r.products.name) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, n);
}

export default async function CustomersPage() {
  await requireAdmin();
  // Customer emails are admin-only; read with the service client after the admin check.
  const db = createServiceClient();
  const weekAgo = new Date(Date.now() - 7 * DAY).toISOString();
  const [{ data: signups }, { data: carts }, { data: views }, { data: adds }, { data: buyers }] = await Promise.all([
    db.from("newsletter_signups").select("id, email, created_at, welcome2_sent_at, welcome3_sent_at").order("created_at", { ascending: false }).limit(200),
    db.from("abandoned_carts").select("email, items, subtotal, created_at, reminded_at, recovered").order("created_at", { ascending: false }).limit(200),
    db.from("product_views").select("product_id, products(name)").gte("viewed_at", weekAgo).limit(5000),
    db.from("cart_adds").select("product_id, products(name)").gte("created_at", weekAgo).limit(5000),
    db.from("orders").select("customer_email").eq("status", "paid").eq("is_test", false),
  ]);
  const customers = new Set((buyers ?? []).map((o) => String(o.customer_email ?? "").toLowerCase()));
  const signupRows = (signups ?? []) as Signup[];
  const cartRows = (carts ?? []) as Cart[];
  const viewRows = (views ?? []) as unknown as Event[];
  const addRows = (adds ?? []) as unknown as Event[];
  const followUpsOn = Boolean(process.env.CRON_SECRET);

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8">
      <div className="grid gap-1">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Customers &amp; follow-ups</h1>
        <p className="text-ink-2">Who signed up, who left a cart, and whether our automatic emails have followed them up.</p>
      </div>

      {!followUpsOn && (
        <p className="rounded-2xl bg-bad-bg px-4 py-3 text-sm font-semibold text-bad-fg">
          Automatic follow-ups are OFF: CRON_SECRET isn&apos;t set in Vercel, so cart reminders, welcome emails 2 &amp; 3, and the
          9pm Telegram summary don&apos;t run. Add CRON_SECRET in Vercel → Settings → Environment Variables, then redeploy.
        </p>
      )}

      <section aria-label="Last 7 days" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Product views" value={viewRows.length} note="Last 7 days" />
        <Tile label="Added to cart" value={addRows.length} note="Last 7 days" />
        <Tile label="Newsletter sign-ups" value={signupRows.filter((s) => s.created_at >= weekAgo).length} note={`${signupRows.length} in total`} />
        <Tile
          label="Carts left with an email"
          value={cartRows.filter((c) => c.created_at >= weekAgo).length}
          note={`${cartRows.filter((c) => c.recovered).length} of ${cartRows.length} came back and ordered`}
        />
      </section>

      <section aria-labelledby="carts-heading" className="grid gap-3">
        <h2 id="carts-heading" className="font-display text-xl font-extrabold">Carts left with an email</h2>
        <p className="text-sm text-ink-2">
          The reminder email goes out between 1 and 48 hours after they leave (daily at 11am). Reply personally to big carts.
        </p>
        <div className="overflow-x-auto rounded-2xl border-2 border-line">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-ground text-left text-xs uppercase tracking-wide text-ink-2">
              <tr><th className="p-3">When</th><th className="p-3">Email</th><th className="p-3">Items</th><th className="p-3 text-right">Value</th><th className="p-3">Follow-up</th></tr>
            </thead>
            <tbody>
              {cartRows.length === 0 && <tr><td colSpan={5} className="p-3 text-ink-2">No carts yet.</td></tr>}
              {cartRows.map((c) => (
                <tr key={`${c.email}-${c.created_at}`} className="border-t border-line align-top">
                  <td className="p-3 whitespace-nowrap">{dateTime(c.created_at)}</td>
                  <td className="p-3"><a href={`mailto:${c.email}`} className="text-grape underline">{c.email}</a></td>
                  <td className="p-3">{c.items.map((i) => `${i.name} (${i.title}) × ${i.qty}`).join(", ")}</td>
                  <td className="p-3 text-right tabular-nums">{formatMyr(Number(c.subtotal))}</td>
                  <td className="p-3 whitespace-nowrap">
                    {c.recovered ? (
                      <span className="font-semibold text-ok-fg">Ordered ✓</span>
                    ) : c.reminded_at ? (
                      `Reminder sent ${date(c.reminded_at)}`
                    ) : Date.now() - new Date(c.created_at).getTime() > 2 * DAY ? (
                      <span className="text-bad-fg">No reminder sent</span>
                    ) : (
                      "Reminder due"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="signups-heading" className="grid gap-3">
        <h2 id="signups-heading" className="font-display text-xl font-extrabold">Newsletter sign-ups</h2>
        <p className="text-sm text-ink-2">
          Email 1 (their discount code) goes instantly. Email 2 (food tips) on day 3 and email 3 (best sellers) on day 7, skipped
          once they&apos;ve ordered.
        </p>
        <div className="overflow-x-auto rounded-2xl border-2 border-line">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-ground text-left text-xs uppercase tracking-wide text-ink-2">
              <tr><th className="p-3">Signed up</th><th className="p-3">Email</th><th className="p-3">Ordered?</th><th className="p-3">Email 2 (day 3)</th><th className="p-3">Email 3 (day 7)</th></tr>
            </thead>
            <tbody>
              {signupRows.length === 0 && <tr><td colSpan={5} className="p-3 text-ink-2">No sign-ups yet.</td></tr>}
              {signupRows.map((s) => {
                const isCustomer = customers.has(s.email.toLowerCase());
                return (
                  <tr key={s.id} className="border-t border-line">
                    <td className="p-3 whitespace-nowrap">{date(s.created_at)}</td>
                    <td className="p-3"><a href={`mailto:${s.email}`} className="text-grape underline">{s.email}</a></td>
                    <td className="p-3">{isCustomer ? <span className="font-semibold text-ok-fg">Yes ✓</span> : "Not yet"}</td>
                    <td className="p-3 whitespace-nowrap">{followUp(s.welcome2_sent_at, s.created_at, 3, isCustomer)}</td>
                    <td className="p-3 whitespace-nowrap">{followUp(s.welcome3_sent_at, s.created_at, 7, isCustomer)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-label="Popular products" className="grid gap-4 sm:grid-cols-2">
        {([["Most viewed (7 days)", top(viewRows)], ["Most added to cart (7 days)", top(addRows)]] as const).map(([title, rows]) => (
          <div key={title} className="grid gap-2 rounded-2xl border-2 border-line bg-surface p-4">
            <h2 className="font-display text-lg font-extrabold">{title}</h2>
            {rows.length === 0 ? (
              <p className="text-sm text-ink-2">Nothing yet.</p>
            ) : (
              <ol className="grid gap-1 text-sm">
                {rows.map(([name, n]) => (
                  <li key={name} className="flex justify-between gap-2"><span>{name}</span><span className="tabular-nums text-ink-2">{n}×</span></li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
