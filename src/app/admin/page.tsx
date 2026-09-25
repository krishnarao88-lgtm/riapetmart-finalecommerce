import {
  AlertTriangle,
  BarChart3,
  Banknote,
  CalendarDays,
  Coins,
  Eye,
  PackageCheck,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { PERIODS, STRIPE_FEE, periodRange, summarise, type DashOrder, type Period } from "@/lib/dashboard";
import { getExpiryBadge, type ExpirySettings } from "@/lib/expiry";
import { formatMyr } from "@/lib/pricing";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

const FULFILMENT = ["new", "packed", "shipped", "delivered", "cancelled", "refunded"] as const;
const FULFILMENT_TONE: Record<string, string> = {
  new: "bg-sunk text-ink-2",
  packed: "bg-warn-bg text-warn-fg",
  shipped: "bg-peach/60 text-rust",
  delivered: "bg-ok-bg text-ok-fg",
  cancelled: "bg-bad-bg text-bad-fg",
  refunded: "bg-bad-bg text-bad-fg",
};

type RecentOrder = DashOrder & { id: string; order_number: string | null; customer_name: string | null };

function Kpi({ label, value, note, Icon, tone }: { label: string; value: string; note: string; Icon: LucideIcon; tone: string }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-chunk)]">
      <div className="grid min-w-0 gap-1">
        <span className="text-xs font-semibold text-ink-2">{label}</span>
        <span className="font-display text-2xl font-extrabold tabular-nums">{value}</span>
        <span className="truncate text-xs text-ink-3">{note}</span>
      </div>
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}>
        <Icon className="size-5" aria-hidden />
      </span>
    </li>
  );
}

function Card({
  title,
  Icon,
  children,
  action,
}: {
  title: string;
  Icon: LucideIcon;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="grid content-start gap-4 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-chunk)]">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold">
          <Icon className="size-[18px] text-terracotta-deep" aria-hidden /> {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const pill = (active: boolean) =>
  `rounded-full px-3 py-1.5 text-sm font-semibold ${active ? "bg-terracotta text-white" : "bg-sunk text-ink-2 hover:bg-peach/50"}`;

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; from?: string; to?: string }>;
}) {
  const { supabase, role } = await getAdminSession();
  if (role === "staff") redirect("/admin/orders");
  if (role !== "admin") {
    return (
      <p role="alert" className="m-6 rounded-2xl border border-line bg-bad-bg p-5 font-medium text-bad-fg">
        This account doesn&apos;t have admin access. Sign out and use the staff email, or ask the owner to add you.
      </p>
    );
  }

  const params = await searchParams;
  const period: Period = PERIODS.some((p) => p.key === params.p) ? (params.p as Period) : "month";
  const range = periodRange(period, params.from, params.to);
  const inRange = { from: range.start.toISOString(), to: range.end.toISOString() };

  const [{ data: orderRows }, { data: products }, { data: settingsRow }, { data: views }, pendingReviews, pendingStays] =
    await Promise.all([
      supabase
        .from("orders")
        .select("id, order_number, customer_name, created_at, total, shipping_cost, fulfilment_status, items")
        .eq("status", "paid")
        .gte("created_at", inRange.from)
        .lt("created_at", inRange.to)
        .order("created_at", { ascending: false }),
      supabase.from("products").select("id, name, variants(price, stock_batches(quantity, expiry_date))").eq("status", "published"),
      supabase.from("settings").select("value").eq("key", "expiry_badges").single(),
      supabase.from("product_views").select("product_id").gte("viewed_at", inRange.from).lt("viewed_at", inRange.to).limit(20000),
      supabase.from("reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("cat_hotel_bookings").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);

  const orders = (orderRows ?? []) as RecentOrder[];
  const variantIds = [...new Set(orders.flatMap((o) => (o.items ?? []).map((i) => i.variant_id)))];
  const { data: costRows } = variantIds.length
    ? await supabase.from("variant_costs").select("variant_id, cost_price").in("variant_id", variantIds)
    : { data: [] };
  const costs = new Map(
    (costRows ?? []).filter((c) => c.cost_price != null).map((c) => [c.variant_id as string, Number(c.cost_price)]),
  );
  const s = summarise(orders, costs, range.days);

  // Stock alerts across the live catalogue.
  const expirySettings = (settingsRow?.value ?? {}) as Partial<ExpirySettings>;
  let lowStock = 0;
  let expiringSoon = 0;
  for (const product of products ?? []) {
    for (const variant of product.variants ?? []) {
      const batches = variant.stock_batches ?? [];
      const stock = batches.reduce((sum, b) => sum + b.quantity, 0);
      if (stock > 0 && stock <= 5) lowStock += 1;
      const nearest = batches
        .filter((b) => b.quantity > 0 && b.expiry_date)
        .map((b) => b.expiry_date as string)
        .sort()[0];
      if (nearest && getExpiryBadge(nearest, expirySettings)?.kind === "short-dated") expiringSoon += 1;
    }
  }

  const productName = new Map((products ?? []).map((p) => [p.id as string, p.name as string]));
  const viewCounts = new Map<string, number>();
  for (const v of views ?? []) viewCounts.set(v.product_id, (viewCounts.get(v.product_id) ?? 0) + 1);
  const topViewed = [...viewCounts].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const totalViews = (views ?? []).length;

  const maxDay = Math.max(1, ...s.byDay.map((d) => d.total));
  const statusCounts = FULFILMENT.map((f) => ({ f, n: orders.filter((o) => o.fulfilment_status === f).length })).filter(
    (x) => x.n,
  );
  const periodLabel =
    period === "custom" ? `${range.days[0]} to ${range.days.at(-1)}` : PERIODS.find((p) => p.key === period)!.label;
  const waiting = (pendingReviews.count ?? 0) + (pendingStays.count ?? 0);

  return (
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6">
      <div className="grid gap-0.5">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Dashboard</h1>
        <p className="text-sm text-ink-2">Paid orders · {periodLabel} · Malaysia time</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-3 shadow-[var(--shadow-chunk)]">
        <CalendarDays className="size-[18px] text-terracotta-deep" aria-hidden />
        <span className="mr-1 text-xs font-bold uppercase tracking-widest text-ink-3">Period</span>
        {PERIODS.filter((p) => p.key !== "custom").map((p) => (
          <Link key={p.key} href={`/admin?p=${p.key}`} className={pill(period === p.key)}>
            {p.label}
          </Link>
        ))}
        <form className="flex flex-wrap items-center gap-2" action="/admin">
          <input type="hidden" name="p" value="custom" />
          <input
            type="date"
            name="from"
            defaultValue={period === "custom" ? range.days[0] : ""}
            aria-label="From"
            className="min-h-9 rounded-lg border border-line bg-ground px-2 text-sm"
          />
          <span className="text-sm text-ink-3">to</span>
          <input
            type="date"
            name="to"
            defaultValue={period === "custom" ? range.days.at(-1) : ""}
            aria-label="To"
            className="min-h-9 rounded-lg border border-line bg-ground px-2 text-sm"
          />
          <button type="submit" className={pill(period === "custom")}>
            Custom
          </button>
        </form>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Gross revenue" value={formatMyr(s.gross)} note={`${s.orders} paid orders`} Icon={Banknote} tone="bg-ok-bg text-ok-fg" />
        <Kpi label="After Stripe fees (est.)" value={formatMyr(s.net)} note={`≈ ${formatMyr(s.fees)} in fees`} Icon={TrendingUp} tone="bg-peach/60 text-rust" />
        <Kpi label="Paid orders" value={String(s.orders)} note={`${s.itemsSold} items sold`} Icon={ShoppingBag} tone="bg-sunk text-terracotta-deep" />
        <Kpi label="To pack & ship" value={String(s.toShip)} note={s.toShip ? "New or packed" : "All clear"} Icon={Truck} tone="bg-warn-bg text-warn-fg" />
        <Kpi label="Delivery fees collected" value={formatMyr(s.shipping)} note="Paid by customers" Icon={Receipt} tone="bg-sunk text-ink-2" />
        <Kpi label="Average order" value={formatMyr(s.avgOrder)} note="Paid orders only" Icon={Wallet} tone="bg-peach/60 text-rust" />
        <Kpi
          label="Profit (est.)"
          value={formatMyr(s.profit)}
          note={s.gross ? `${Math.round((s.profit / s.gross) * 100)}% of revenue` : "No sales yet"}
          Icon={Coins}
          tone="bg-ok-bg text-ok-fg"
        />
        <Kpi label="Product views" value={String(totalViews)} note="Real visitor page views" Icon={Eye} tone="bg-sunk text-terracotta-deep" />
      </ul>

      <p className="rounded-xl border border-sunshine bg-warn-bg px-3 py-2 text-xs text-warn-fg">
        Fees are estimated at Stripe&apos;s card rate ({STRIPE_FEE.rate * 100}% + RM{STRIPE_FEE.fixed} per order). Profit is item
        price minus your cost price, minus fees.
        {s.costMissing > 0 && ` ${s.costMissing} item(s) sold have no cost price yet, so they aren't counted in profit.`}
      </p>

      <Card
        title={`Revenue: ${periodLabel}`}
        Icon={BarChart3}
        action={<span className="text-sm font-semibold tabular-nums text-ink-2">{formatMyr(s.gross)}</span>}
      >
        {s.gross === 0 ? (
          <p className="py-8 text-center text-sm text-ink-3">No paid orders in this period yet.</p>
        ) : (
          <div className="flex h-44 items-end gap-1" role="img" aria-label="Revenue per day">
            {s.byDay.map((d) => (
              <div key={d.day} className="group flex h-full flex-1 flex-col justify-end" title={`${d.day}: ${formatMyr(d.total)}`}>
                <div
                  className={`w-full rounded-t-md ${d.total ? "bg-terracotta group-hover:bg-rust" : "bg-sunk"}`}
                  style={{ height: `${Math.max(d.total ? 4 : 2, (d.total / maxDay) * 100)}%` }}
                />
                {s.byDay.length <= 31 && (
                  <span className="mt-1 text-center text-[10px] tabular-nums text-ink-3">{d.day.slice(8)}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Order status" Icon={PackageCheck}>
          {statusCounts.length === 0 ? (
            <p className="text-sm text-ink-3">No orders in this period.</p>
          ) : (
            <ul className="grid gap-2.5">
              {statusCounts.map(({ f, n }) => (
                <li key={f} className="grid grid-cols-[6rem_1fr_2rem] items-center gap-3 text-sm">
                  <span className={`rounded-full px-2 py-0.5 text-center text-xs font-bold capitalize ${FULFILMENT_TONE[f]}`}>{f}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-sunk">
                    <span className="block h-full rounded-full bg-terracotta" style={{ width: `${(n / orders.length) * 100}%` }} />
                  </span>
                  <span className="text-right font-semibold tabular-nums">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Top sellers" Icon={TrendingUp}>
          {s.topProducts.length === 0 ? (
            <p className="text-sm text-ink-3">Nothing sold in this period.</p>
          ) : (
            <ol className="grid gap-3">
              {s.topProducts.slice(0, 5).map((p, i) => (
                <li key={p.name} className="flex items-center gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-peach/60 text-xs font-bold text-rust">
                    {i + 1}
                  </span>
                  <div className="grid min-w-0 flex-1">
                    <span className="truncate text-sm font-semibold">{p.name}</span>
                    <span className="text-xs text-ink-3">
                      {p.units} units · <span className="font-semibold text-ok-fg">{formatMyr(p.revenue)}</span>
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {s.topProducts.length > 0 && (
        <Card title="Product sales breakdown" Icon={BarChart3}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-3">
                  <th className="py-2 pr-2">Product</th>
                  <th className="py-2 pr-2 text-right">Units</th>
                  <th className="py-2 pr-2 text-right">Revenue</th>
                  <th className="w-40 py-2">Share</th>
                </tr>
              </thead>
              <tbody>
                {s.topProducts.map((p) => (
                  <tr key={p.name} className="border-b border-line/60 last:border-0">
                    <td className="py-2 pr-2">{p.name}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{p.units}</td>
                    <td className="py-2 pr-2 text-right font-semibold tabular-nums">{formatMyr(p.revenue)}</td>
                    <td className="py-2">
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunk">
                          <span className="block h-full rounded-full bg-terracotta" style={{ width: `${p.share * 100}%` }} />
                        </span>
                        <span className="w-9 text-right text-xs tabular-nums text-ink-3">{Math.round(p.share * 100)}%</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card
        title="Recent orders"
        Icon={Receipt}
        action={
          <Link href="/admin/orders" className="text-sm font-semibold text-terracotta-deep hover:underline">
            View all →
          </Link>
        }
      >
        {orders.length === 0 ? (
          <p className="text-sm text-ink-3">No paid orders in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-3">
                  <th className="py-2 pr-2">Order</th>
                  <th className="py-2 pr-2">Customer</th>
                  <th className="py-2 pr-2 text-right">Amount</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 6).map((o) => (
                  <tr key={o.id} className="border-b border-line/60 last:border-0">
                    <td className="py-2 pr-2 font-semibold">{o.order_number ?? `#${o.id.slice(0, 8).toUpperCase()}`}</td>
                    <td className="py-2 pr-2 text-ink-2">{o.customer_name ?? "—"}</td>
                    <td className="py-2 pr-2 text-right font-semibold tabular-nums">{formatMyr(Number(o.total))}</td>
                    <td className="py-2 pr-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold capitalize ${FULFILMENT_TONE[o.fulfilment_status]}`}>
                        {o.fulfilment_status}
                      </span>
                    </td>
                    <td className="py-2 tabular-nums text-ink-2">
                      {new Date(o.created_at).toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Link
          href="/admin/products"
          className="grid gap-1 rounded-2xl bg-linear-to-br from-terracotta to-rust p-5 text-white shadow-[var(--shadow-chunk)] transition-transform hover:-translate-y-0.5"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-white/85">
            <AlertTriangle className="size-4" aria-hidden /> Stock alerts
          </span>
          <span className="font-display text-3xl font-extrabold tabular-nums">
            {lowStock} low · {expiringSoon} expiring
          </span>
          <span className="text-sm text-white/85 underline">Manage products →</span>
        </Link>
        <div className="grid gap-1 rounded-2xl bg-choc p-5 text-cream shadow-[var(--shadow-chunk)]">
          <span className="text-sm font-semibold text-cream/75">Waiting on you</span>
          <span className="font-display text-3xl font-extrabold tabular-nums">{waiting}</span>
          <span className="flex flex-wrap gap-3 text-sm">
            <Link href="/admin/reviews" className="text-peach underline">
              {pendingReviews.count ?? 0} reviews to approve
            </Link>
            <Link href="/admin/cat-hotel" className="text-peach underline">
              {pendingStays.count ?? 0} Cat Hotel requests
            </Link>
          </span>
        </div>
      </div>

      <Card
        title="Most viewed products"
        Icon={Eye}
        action={<span className="text-xs font-semibold text-ink-3">{totalViews} views</span>}
      >
        {topViewed.length === 0 ? (
          <p className="text-sm text-ink-3">No product views recorded in this period.</p>
        ) : (
          <ol className="grid gap-3">
            {topViewed.map(([id, n], i) => (
              <li key={id} className="grid gap-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">
                    <span className="mr-2 text-xs font-bold text-ink-3">#{i + 1}</span>
                    {productName.get(id) ?? "Unpublished product"}
                  </span>
                  <span className="shrink-0 tabular-nums text-ink-2">
                    {n} <span className="text-xs text-ink-3">views</span>
                  </span>
                </div>
                <span className="h-1.5 overflow-hidden rounded-full bg-sunk">
                  <span className="block h-full rounded-full bg-terracotta" style={{ width: `${(n / topViewed[0][1]) * 100}%` }} />
                </span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
