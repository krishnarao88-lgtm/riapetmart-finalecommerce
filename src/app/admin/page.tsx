import {
  Activity,
  BarChart3,
  Banknote,
  Coins,
  Eye,
  ListTodo,
  Mail,
  MessageSquareQuote,
  PackagePlus,
  QrCode,
  Receipt,
  ShoppingBag,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { HeroTile, MiniTile, Panel, PendingCard, RevenueBars, StatCard } from "@/components/admin/dashboard-parts";
import { getAdminSession } from "@/lib/auth";
import { STRIPE_FEE, byMonth, dashMarks, lastMonths, monthStart, pctChange, summarise, timeAgo, type DashOrder } from "@/lib/dashboard";
import { getExpiryBadge, type ExpirySettings } from "@/lib/expiry";
import { formatMyr } from "@/lib/pricing";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

const DAY = 86_400_000;
type Order = DashOrder & { id: string; order_number: string | null; customer_name: string | null };
type Event = { at: string; Icon: LucideIcon; text: string; sub: string; href: string };

const QUICK = [
  { href: "/admin/products/new", label: "Add product", Icon: PackagePlus, tone: "bg-rust text-white" },
  { href: "/admin/orders", label: "Orders", Icon: Receipt, tone: "bg-choc text-cream" },
  { href: "/admin/counter-card", label: "Counter card", Icon: QrCode, tone: "bg-peach text-choc" },
  { href: "/admin/goal", label: "Road to RM100k", Icon: Target, tone: "bg-sunk text-choc" },
];

const maskEmail = (e: string) => e.replace(/^(.{1,2}).*(@.*)$/, "$1•••$2");
const orderLabel = (o: Order) => o.order_number ?? `#${o.id.slice(0, 8).toUpperCase()}`;

export default async function AdminDashboard({ searchParams }: PageProps<"/admin">) {
  const { supabase, role } = await getAdminSession();
  if (role === "staff") redirect("/admin/orders");
  if (role !== "admin") {
    return (
      <p role="alert" className="m-6 rounded-2xl border border-line bg-bad-bg p-5 font-medium text-bad-fg">
        This account doesn&apos;t have admin access. Sign out and use the staff email, or ask the owner to add you.
      </p>
    );
  }

  const { r } = await searchParams;
  const year = r === "year";
  const now = new Date();
  const mk = dashMarks(now);
  const months = lastMonths(year ? Number(mk.ym.slice(5)) : 6, now);
  const prevMonth = lastMonths(months.length + 1, now)[0]; // so the oldest bar has a growth figure too
  const fetchFrom = monthStart(prevMonth).toISOString();
  const yesterdayNow = new Date(now.getTime() - DAY); // compare against the same time yesterday, not a full day
  const far = new Date(now.getTime() + DAY);
  // Exact counts (head requests) so busy months aren't cut off by the API's row cap.
  const count = (table: "product_views" | "newsletter_signups", col: string, from: Date, to: Date) =>
    supabase.from(table).select("id", { count: "exact", head: true }).gte(col, from.toISOString()).lt(col, to.toISOString());
  const [viewsThis, viewsLastToDate, viewsLast, viewsToday, viewsYday, signupsToday, signupsYday] = (
    await Promise.all([
      count("product_views", "viewed_at", mk.thisMonth, far),
      count("product_views", "viewed_at", mk.lastMonth, mk.lastToDate),
      count("product_views", "viewed_at", mk.lastMonth, mk.thisMonth),
      count("product_views", "viewed_at", mk.todayStart, far),
      count("product_views", "viewed_at", mk.yesterdayStart, yesterdayNow),
      count("newsletter_signups", "created_at", mk.todayStart, far),
      count("newsletter_signups", "created_at", mk.yesterdayStart, yesterdayNow),
    ])
  ).map((res) => res.count ?? 0);

  const [orderRes, productRes, settingsRes, signupLatest, reviewLatest, pendingReviews, pendingStays, unpacked] =
    await Promise.all([
      supabase
        .from("orders")
        .select("id, order_number, customer_name, created_at, total, shipping_cost, fulfilment_status, items")
        .eq("status", "paid")
        .eq("is_test", false)
        .gte("created_at", fetchFrom)
        .order("created_at", { ascending: false })
        .limit(20000),
      supabase.from("products").select("id, name, variants(price, stock_batches(quantity, expiry_date))").eq("status", "published"),
      supabase.from("settings").select("value").eq("key", "expiry_badges").single(),
      supabase.from("newsletter_signups").select("email, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("reviews").select("id, customer_name, rating, status, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("cat_hotel_bookings").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "paid")
        .eq("is_test", false)
        .eq("fulfilment_status", "new"),
    ]);

  const orders = (orderRes.data ?? []) as Order[];
  const t = (iso: string) => new Date(iso).getTime();
  const inSpan = (from: Date, to: Date) => orders.filter((o) => t(o.created_at) >= +from && t(o.created_at) < +to);

  // Money maths for this month, last month to the same day, and all of last month.
  const monthOrders = orders.filter((o) => t(o.created_at) >= +mk.lastMonth);
  const variantIds = [...new Set(monthOrders.flatMap((o) => (o.items ?? []).map((i) => i.variant_id)))];
  const { data: costRows } = variantIds.length
    ? await supabase.from("variant_costs").select("variant_id, cost_price").in("variant_id", variantIds)
    : { data: [] };
  const costs = new Map((costRows ?? []).filter((c) => c.cost_price != null).map((c) => [c.variant_id as string, Number(c.cost_price)]));
  const sThis = summarise(inSpan(mk.thisMonth, far), costs, []);
  const sLastToDate = summarise(inSpan(mk.lastMonth, mk.lastToDate), costs, []);
  const sLast = summarise(inSpan(mk.lastMonth, mk.thisMonth), costs, []);

  // Today against this time yesterday.
  const today = inSpan(mk.todayStart, far);
  const yday = inSpan(mk.yesterdayStart, yesterdayNow);
  const sum = (rows: Order[]) => Math.round(rows.reduce((s, o) => s + Number(o.total), 0) * 100) / 100;
  const rateToday = viewsToday ? (today.length / viewsToday) * 100 : 0;
  const rateYday = viewsYday ? (yday.length / viewsYday) * 100 : null;

  // Revenue analytics.
  const full = byMonth(orders, [prevMonth, ...months]);
  const rows = months.map((_, i) => ({ ...full[i + 1], growth: pctChange(full[i + 1].revenue, full[i].revenue) }));
  const totalRevenue = rows.reduce((s, x) => s + x.revenue, 0);
  const totalOrders = rows.reduce((s, x) => s + x.orders, 0);
  const lastFullGrowth = pctChange(full.at(-2)!.revenue, full.at(-3)?.revenue ?? 0);

  // Stock alerts across the live catalogue.
  const expirySettings = (settingsRes.data?.value ?? {}) as Partial<ExpirySettings>;
  let lowStock = 0;
  let expiringSoon = 0;
  for (const product of productRes.data ?? []) {
    for (const variant of product.variants ?? []) {
      const batches = variant.stock_batches ?? [];
      const stock = batches.reduce((s, b) => s + b.quantity, 0);
      if (stock > 0 && stock <= 5) lowStock += 1;
      const nearest = batches.filter((b) => b.quantity > 0 && b.expiry_date).map((b) => b.expiry_date as string).sort()[0];
      if (nearest && getExpiryBadge(nearest, expirySettings)?.kind === "short-dated") expiringSoon += 1;
    }
  }

  const topSellers = [...sThis.topProducts].sort((a, b) => b.units - a.units).slice(0, 5);
  const events: Event[] = [
    ...orders.slice(0, 5).map((o) => ({
      at: o.created_at,
      Icon: ShoppingBag,
      text: `New order ${orderLabel(o)}`,
      sub: `${o.customer_name ?? "Customer"} · ${formatMyr(Number(o.total))}`,
      href: `/admin/orders?q=${encodeURIComponent(o.order_number ?? "")}`,
    })),
    ...(signupLatest.data ?? []).map((s) => ({
      at: s.created_at,
      Icon: Mail,
      text: "New newsletter sign-up",
      sub: maskEmail(s.email),
      href: "/admin/customers",
    })),
    ...(reviewLatest.data ?? []).map((v) => ({
      at: v.created_at,
      Icon: MessageSquareQuote,
      text: v.rating ? `New ${v.rating}-star review` : "New review",
      sub: `${v.customer_name} · ${v.status}`,
      href: "/admin/reviews",
    })),
  ]
    .sort((a, b) => t(b.at) - t(a.at))
    .slice(0, 8);

  const dateLabel = now.toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kuala_Lumpur" });
  const toggle = (on: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-bold ${on ? "bg-choc text-cream" : "bg-sunk text-ink-2 hover:bg-peach/50"}`;

  return (
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6">
      <div className="grid gap-0.5">
        <h1 className="font-bubble text-3xl font-extrabold text-choc">Dashboard</h1>
        <p className="text-sm text-ink-2">Paid website orders · Malaysia time · test orders hidden</p>
      </div>

      <section aria-labelledby="hero-h" className="relative overflow-hidden rounded-3xl bg-linear-to-br from-choc via-choc-2 to-rust p-5 text-cream shadow-[var(--shadow-chunk)] sm:p-7">
        <span aria-hidden className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-peach/20 blur-2xl" />
        <span aria-hidden className="pointer-events-none absolute -bottom-20 left-1/3 size-56 rounded-full bg-terracotta/25 blur-3xl" />
        <div className="relative grid gap-1">
          <h2 id="hero-h" className="font-bubble text-2xl font-extrabold text-white sm:text-3xl">Welcome back</h2>
          <p className="text-sm text-cream/85">{dateLabel} · here&apos;s how the shop is doing today.</p>
        </div>
        <ul className="relative mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <HeroTile label="Today's orders" value={String(today.length)} delta={pctChange(today.length, yday.length)} compare="vs this time yesterday" />
          <HeroTile label="Newsletter sign-ups" value={String(signupsToday)} delta={pctChange(signupsToday, signupsYday)} compare="vs this time yesterday" />
          <HeroTile label="Revenue today" value={formatMyr(sum(today))} delta={pctChange(sum(today), sum(yday))} compare="vs this time yesterday" />
          {(viewsToday > 0 || viewsYday > 0) && (
            <HeroTile
              label="Views that became orders"
              value={`${rateToday.toFixed(1)}%`}
              delta={rateYday == null ? null : Math.round((rateToday - rateYday) * 10) / 10}
              unit=" pts"
              compare={`${today.length} orders / ${viewsToday} product views`}
            />
          )}
        </ul>
      </section>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue this month" value={formatMyr(sThis.gross)} Icon={Banknote} chip="bg-ok-bg text-ok-fg" delta={pctChange(sThis.gross, sLastToDate.gross)} current={sThis.gross} last={sLast.gross} format={formatMyr} />
        <StatCard label="Paid orders this month" value={String(sThis.orders)} Icon={ShoppingBag} chip="bg-peach/60 text-rust" delta={pctChange(sThis.orders, sLastToDate.orders)} current={sThis.orders} last={sLast.orders} />
        <StatCard label="Profit this month (est.)" value={formatMyr(sThis.profit)} Icon={Coins} chip="bg-warn-bg text-warn-fg" delta={pctChange(sThis.profit, sLastToDate.profit)} current={sThis.profit} last={sLast.profit} format={formatMyr} />
        <StatCard label="Product views this month" value={String(viewsThis)} Icon={Eye} chip="bg-sunk text-terracotta-deep" delta={pctChange(viewsThis, viewsLastToDate)} current={viewsThis} last={viewsLast} />
      </ul>
      <p className="-mt-2 text-xs text-ink-3">
        Profit is an estimate: item price minus your cost price, minus Stripe fees ({STRIPE_FEE.rate * 100}% + RM{STRIPE_FEE.fixed} per order).
        {sThis.costMissing > 0 && ` ${sThis.costMissing} item(s) sold this month have no cost price yet, so they aren't counted.`}
      </p>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel
            id="revenue"
            title="Revenue analytics"
            Icon={BarChart3}
            action={
              <nav aria-label="Revenue range" className="flex gap-1">
                <Link href="/admin#revenue" aria-current={!year ? "page" : undefined} className={toggle(!year)}>
                  Last 6 months
                </Link>
                <Link href="/admin?r=year#revenue" aria-current={year ? "page" : undefined} className={toggle(year)}>
                  This year
                </Link>
              </nav>
            }
          >
            <RevenueBars rows={rows} />
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <MiniTile label="Total revenue" value={formatMyr(totalRevenue)} />
              {lastFullGrowth != null && <MiniTile label="Last month growth" value={`${lastFullGrowth > 0 ? "+" : ""}${lastFullGrowth}%`} />}
              <MiniTile label="Avg / month" value={formatMyr(Math.round((totalRevenue / rows.length) * 100) / 100)} />
              <MiniTile label="Total orders" value={String(totalOrders)} />
            </div>
          </Panel>
        </div>

        <Panel title="Live activity" Icon={Activity} action={<AutoRefresh seconds={120} />}>
          {events.length === 0 ? (
            <p className="text-sm text-ink-3">Nothing yet. New orders, sign-ups and reviews show up here.</p>
          ) : (
            <ul className="grid gap-1">
              {events.map((e) => (
                <li key={`${e.text}-${e.at}`}>
                  <Link href={e.href} className="flex items-start gap-3 rounded-xl p-2 hover:bg-cream">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-peach/50 text-rust">
                      <e.Icon className="size-4" aria-hidden />
                    </span>
                    <span className="grid min-w-0 flex-1">
                      <span className="truncate text-sm font-semibold text-choc">{e.text}</span>
                      <span className="truncate text-xs text-ink-3">{e.sub}</span>
                    </span>
                    <time dateTime={e.at} className="shrink-0 text-xs text-ink-3">
                      {timeAgo(e.at, now)}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Quick actions" Icon={Zap}>
          <ul className="grid grid-cols-2 gap-3">
            {QUICK.map(({ href, label, Icon, tone }) => (
              <li key={href}>
                <Link href={href} className={`grid min-h-28 content-between gap-3 rounded-2xl p-4 font-bold transition-transform hover:-translate-y-0.5 ${tone}`}>
                  <Icon className="size-6" aria-hidden />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Top sellers this month" Icon={Trophy} action={<Link href="/admin/finance" className="text-sm font-semibold text-terracotta-deep hover:underline">Finance →</Link>}>
          {topSellers.length === 0 ? (
            <p className="text-sm text-ink-3">Nothing sold this month yet.</p>
          ) : (
            <ol className="grid gap-3">
              {topSellers.map((p, i) => (
                <li key={p.name} className="grid gap-1.5">
                  <div className="flex items-center gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-peach/60 text-xs font-bold text-rust">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-choc">{p.name}</span>
                    <span className="shrink-0 text-right text-xs text-ink-3">
                      <span className="font-bold text-choc">{p.units} sold</span> · {formatMyr(p.revenue)}
                    </span>
                  </div>
                  <div className="ml-10 h-1.5 overflow-hidden rounded-full bg-sunk" aria-hidden>
                    <div className="h-full rounded-full bg-terracotta" style={{ width: `${(p.units / topSellers[0].units) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <Panel title="Pending actions" Icon={ListTodo}>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <PendingCard label="To pack" count={unpacked.count ?? 0} note="Paid orders not packed yet" href="/admin/orders?tab=new" cta="Pack orders" tone="bg-warn-bg text-warn-fg" />
          <PendingCard label="Reviews to approve" count={pendingReviews.count ?? 0} note="Waiting before they show on the shop" href="/admin/reviews" cta="Review" tone="bg-peach/60 text-choc" />
          <PendingCard label="Cat Hotel requests" count={pendingStays.count ?? 0} note="Bookings waiting for a reply" href="/admin/cat-hotel" cta="Reply" tone="bg-ok-bg text-ok-fg" />
          <PendingCard label="Stock alerts" count={lowStock + expiringSoon} note={`${lowStock} low on stock · ${expiringSoon} expiring soon`} href="/admin/products" cta="Check stock" tone="bg-bad-bg text-bad-fg" />
        </ul>
      </Panel>
    </div>
  );
}
