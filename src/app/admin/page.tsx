import { AlertTriangle, Boxes, FileSpreadsheet, LogOut, PackageX, Percent, Receipt, Settings, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getExpiryBadge, type ExpirySettings } from "@/lib/expiry";
import { formatMyr } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

const sections = [
  { Icon: Boxes, title: "Products & stock", body: "Variants, batches and expiry dates.", href: "/admin/products" },
  { Icon: Percent, title: "Pricing", body: "Cost price and margin slider.", href: "/admin/products" },
  { Icon: Receipt, title: "Orders", body: "Paid and pending Stripe orders.", href: "/admin/orders" },
  { Icon: FileSpreadsheet, title: "Import & export", body: "Excel, CSV and PDF.", href: "/admin/import" },
  { Icon: Settings, title: "Settings", body: "Short-dated discounts and delivery.", href: "/admin/settings" },
];

export default async function AdminHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role === "staff") redirect("/admin/orders");
  const isAdmin = profile?.role === "admin";

  let stats: { totalSales: string; ordersToday: number; lowStock: number; expiringSoon: number } | null = null;
  if (isAdmin) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [{ data: orders }, { data: products }, { data: settingsRow }] = await Promise.all([
      supabase.from("orders").select("status, subtotal, shipping_cost, created_at"),
      supabase
        .from("products")
        .select("variants(price, stock_batches(quantity, expiry_date))")
        .eq("status", "published"),
      supabase.from("settings").select("value").eq("key", "expiry_badges").single(),
    ]);

    const totalSales = (orders ?? [])
      .filter((o) => o.status === "paid")
      .reduce((sum, o) => sum + Number(o.subtotal) + Number(o.shipping_cost ?? 0), 0);
    const ordersToday = (orders ?? []).filter(
      (o) => o.status === "paid" && new Date(o.created_at) >= startOfToday,
    ).length;

    const expirySettings = (settingsRow?.value ?? {}) as Partial<ExpirySettings>;
    let lowStock = 0;
    let expiringSoon = 0;
    for (const product of products ?? []) {
      for (const variant of product.variants ?? []) {
        const batches = variant.stock_batches ?? [];
        const stock = batches.reduce((sum, b) => sum + b.quantity, 0);
        if (stock > 0 && stock <= 5) lowStock += 1;
        const nearestExpiry = batches
          .filter((b) => b.quantity > 0 && b.expiry_date)
          .map((b) => b.expiry_date as string)
          .sort()[0];
        if (nearestExpiry && getExpiryBadge(nearestExpiry, expirySettings)?.kind === "short-dated") {
          expiringSoon += 1;
        }
      }
    }

    stats = { totalSales: formatMyr(totalSales), ordersToday, lowStock, expiringSoon };
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <p className="text-sm text-ink-2">Signed in as {user.email}</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">Admin</h1>
        </div>
        <form action={signOut}>
          <button type="submit" className="btn-chunk bg-surface">
            <LogOut className="size-5" aria-hidden /> Sign out
          </button>
        </form>
      </div>

      {isAdmin && stats ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <li className="grid gap-2 rounded-[var(--radius-chunk)] border-2 border-ink bg-surface p-5">
            <TrendingUp className="size-6 text-grape" aria-hidden />
            <span className="font-display text-2xl font-extrabold">{stats.totalSales}</span>
            <span className="text-sm text-ink-2">Total sales (paid orders)</span>
          </li>
          <li className="grid gap-2 rounded-[var(--radius-chunk)] border-2 border-ink bg-surface p-5">
            <Receipt className="size-6 text-grape" aria-hidden />
            <span className="font-display text-2xl font-extrabold">{stats.ordersToday}</span>
            <span className="text-sm text-ink-2">Orders paid today</span>
          </li>
          <li className="grid gap-2 rounded-[var(--radius-chunk)] border-2 border-ink bg-surface p-5">
            <PackageX className="size-6 text-rust" aria-hidden />
            <span className="font-display text-2xl font-extrabold">{stats.lowStock}</span>
            <span className="text-sm text-ink-2">Variants low on stock (≤5)</span>
          </li>
          <li className="grid gap-2 rounded-[var(--radius-chunk)] border-2 border-ink bg-surface p-5">
            <AlertTriangle className="size-6 text-rust" aria-hidden />
            <span className="font-display text-2xl font-extrabold">{stats.expiringSoon}</span>
            <span className="text-sm text-ink-2">Variants expiring soon</span>
          </li>
        </ul>
      ) : null}

      {isAdmin ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sections.map(({ Icon, title, body, href }) => (
            <li key={title}>
              <Link
                href={href}
                className="grid gap-3 rounded-[var(--radius-chunk)] border-2 border-ink bg-surface p-5 transition-transform hover:-translate-y-0.5"
              >
                <Icon className="size-7 text-grape" aria-hidden />
                <span className="font-display text-xl font-extrabold">{title}</span>
                <span className="text-sm text-ink-2">{body}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p role="alert" className="rounded-[var(--radius-chunk)] border-2 border-ink bg-bad-bg p-5 font-medium text-bad-fg">
          This account doesn&apos;t have admin access. Sign out and use the staff email, or ask the owner to add you.
        </p>
      )}
    </div>
  );
}
