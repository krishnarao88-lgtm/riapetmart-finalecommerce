import { Check, Eye, MailPlus, ShoppingBasket, ShoppingCart, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { Panel } from "@/components/admin/dashboard-parts";
import { CountTile, PageHeader, Pill } from "@/components/admin/list-parts";
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

/** Text colour for a follow-up status string from followUp(). */
const followTone = (v: string) =>
  v.startsWith("Sent") ? "text-ok-fg" : v.startsWith("Due,") || v.startsWith("Not sent") ? "text-bad-fg" : "text-ink-2";

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
  const now = new Date().getTime(); // per-request server render: one clock reading for the whole page
  const weekAgo = new Date(now - 7 * DAY).toISOString();
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
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6">
      <PageHeader title="Customers & follow-ups" sub="Who signed up, who left a cart, and whether our automatic emails have followed them up." />

      {!followUpsOn && (
        <p role="alert" className="flex gap-2 rounded-2xl bg-bad-bg px-4 py-3 text-sm font-semibold text-bad-fg">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Automatic follow-ups are OFF: CRON_SECRET isn&apos;t set in Vercel, so cart reminders, welcome emails 2 &amp; 3, and the
            9pm Telegram summary don&apos;t run. Add CRON_SECRET in Vercel → Settings → Environment Variables, then redeploy.
          </span>
        </p>
      )}

      <section aria-label="Last 7 days">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CountTile label="Product views" value={viewRows.length} note="Last 7 days" Icon={Eye} chip="bg-sunk text-terracotta-deep" />
          <CountTile label="Added to cart" value={addRows.length} note="Last 7 days" Icon={ShoppingCart} chip="bg-peach/60 text-rust" />
          <CountTile
            label="Newsletter sign-ups"
            value={signupRows.filter((s) => s.created_at >= weekAgo).length}
            note={`${signupRows.length} in total`}
            Icon={MailPlus}
            chip="bg-ok-bg text-ok-fg"
          />
          <CountTile
            label="Carts left with an email"
            value={cartRows.filter((c) => c.created_at >= weekAgo).length}
            note={`${cartRows.filter((c) => c.recovered).length} of ${cartRows.length} came back and ordered`}
            Icon={ShoppingBasket}
            chip="bg-warn-bg text-warn-fg"
          />
        </ul>
      </section>

      <Panel id="carts" title="Carts left with an email" Icon={ShoppingBasket}>
        <p className="-mt-2 text-sm text-ink-2">
          The reminder email goes out between 1 and 48 hours after they leave (daily at 11am). Reply personally to big carts.
        </p>
        {cartRows.length === 0 ? (
          <p className="text-sm text-ink-2">No carts yet.</p>
        ) : (
          <ul className="grid divide-y divide-line">
            {cartRows.map((c) => (
              <li key={`${c.email}-${c.created_at}`} className="grid gap-2 py-3 first:pt-0 last:pb-0 md:grid-cols-[9rem_1fr_auto] md:items-start md:gap-4">
                <span className="text-xs font-semibold text-ink-3 md:pt-0.5">{dateTime(c.created_at)}</span>
                <div className="grid min-w-0 gap-1">
                  <a href={`mailto:${c.email}`} className="break-all font-semibold text-terracotta-deep underline underline-offset-2">
                    {c.email}
                  </a>
                  <p className="text-sm text-ink-2">{c.items.map((i) => `${i.name} (${i.title}) × ${i.qty}`).join(", ")}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <span className="font-bubble text-lg font-extrabold tabular-nums text-choc">{formatMyr(Number(c.subtotal))}</span>
                  {c.recovered ? (
                    <Pill tone="ok"><Check className="size-3.5" aria-hidden />Ordered</Pill>
                  ) : c.reminded_at ? (
                    <Pill tone="muted">Reminder sent {date(c.reminded_at)}</Pill>
                  ) : now - new Date(c.created_at).getTime() > 2 * DAY ? (
                    <Pill tone="bad">No reminder sent</Pill>
                  ) : (
                    <Pill tone="warn">Reminder due</Pill>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel id="signups" title="Newsletter sign-ups" Icon={MailPlus}>
        <p className="-mt-2 text-sm text-ink-2">
          Email 1 (their discount code) goes instantly. Email 2 (food tips) on day 3 and email 3 (best sellers) on day 7, skipped
          once they&apos;ve ordered.
        </p>
        {signupRows.length === 0 ? (
          <p className="text-sm text-ink-2">No sign-ups yet.</p>
        ) : (
          <ul className="grid divide-y divide-line">
            {signupRows.map((s) => {
              const isCustomer = customers.has(s.email.toLowerCase());
              const e2 = followUp(s.welcome2_sent_at, s.created_at, 3, isCustomer);
              const e3 = followUp(s.welcome3_sent_at, s.created_at, 7, isCustomer);
              return (
                <li key={s.id} className="grid gap-2 py-3 first:pt-0 last:pb-0 md:grid-cols-[9rem_1fr_auto] md:items-center md:gap-4">
                  <span className="text-xs font-semibold text-ink-3">Signed up {date(s.created_at)}</span>
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <a href={`mailto:${s.email}`} className="break-all font-semibold text-terracotta-deep underline underline-offset-2">
                      {s.email}
                    </a>
                    {isCustomer ? <Pill tone="ok"><Check className="size-3.5" aria-hidden />Ordered</Pill> : <Pill tone="muted">Not ordered yet</Pill>}
                  </div>
                  <dl className="flex flex-wrap gap-2 text-xs md:justify-end">
                    {([["Email 2 (day 3)", e2], ["Email 3 (day 7)", e3]] as const).map(([k, v]) => (
                      <div key={k} className="grid gap-0.5 rounded-xl bg-cream px-3 py-1.5">
                        <dt className="font-semibold text-ink-3">{k}</dt>
                        <dd className={`font-bold ${followTone(v)}`}>{v}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <div className="grid gap-5 md:grid-cols-2">
        {([["Most viewed (7 days)", top(viewRows), Eye], ["Most added to cart (7 days)", top(addRows), ShoppingCart]] as const).map(([title, rows, Icon]) => (
          <Panel key={title} title={title} Icon={Icon}>
            {rows.length === 0 ? (
              <p className="text-sm text-ink-2">Nothing yet.</p>
            ) : (
              <ol className="grid gap-2 text-sm">
                {rows.map(([name, n], i) => (
                  <li key={name} className="flex items-center gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sunk text-xs font-bold tabular-nums text-ink-2">{i + 1}</span>
                    <span className="min-w-0 flex-1 text-choc">{name}</span>
                    <span className="font-bold tabular-nums text-ink-2">{n}×</span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        ))}
      </div>
    </div>
  );
}
