"use client";

import {
  BadgePercent,
  BedDouble,
  BadgeCheck,
  ChartNoAxesCombined,
  Tags,
  Target,
  QrCode,
  Boxes,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Menu,
  PawPrint,
  MessageSquareQuote,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  UserCog,
  X,
  type LucideIcon,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "@/app/admin/actions";

type NavLink = { href: string; label: string; Icon: LucideIcon; adminOnly: boolean };

const GROUPS: { title: string; links: NavLink[] }[] = [
  {
    title: "Shop",
    links: [
      { href: "/admin", label: "Dashboard", Icon: LayoutDashboard, adminOnly: true },
      { href: "/admin/orders", label: "Orders", Icon: Receipt, adminOnly: false },
      { href: "/admin/products", label: "Products", Icon: Boxes, adminOnly: true },
      { href: "/admin/finance", label: "Finance", Icon: ChartNoAxesCombined, adminOnly: true },
      { href: "/admin/goal", label: "Road to RM100k", Icon: Target, adminOnly: true },
      { href: "/admin/counter-card", label: "Counter card", Icon: QrCode, adminOnly: true },
      { href: "/admin/customers", label: "Customers & follow-ups", Icon: Users, adminOnly: true },
      { href: "/admin/pricing", label: "Price suggestions", Icon: Tags, adminOnly: true },
      { href: "/admin/promotions", label: "Offers & sales", Icon: BadgePercent, adminOnly: true },
      { href: "/admin/info-check", label: "Info check", Icon: BadgeCheck, adminOnly: true },
      { href: "/admin/reviews", label: "Reviews", Icon: MessageSquareQuote, adminOnly: false },
      { href: "/admin/cat-hotel", label: "Cat Hotel", Icon: BedDouble, adminOnly: false },
    ],
  },
  {
    title: "Manage",
    links: [
      { href: "/admin/import", label: "Import & export", Icon: FileSpreadsheet, adminOnly: true },
      { href: "/admin/staff", label: "Staff", Icon: UserCog, adminOnly: true },
      { href: "/admin/settings", label: "Settings", Icon: Settings, adminOnly: true },
      { href: "/admin/security", label: "Sign-in security", Icon: ShieldCheck, adminOnly: false },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({
  email,
  role,
  children,
}: {
  email: string;
  role: "admin" | "staff";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const groups = GROUPS.map((g) => ({ ...g, links: g.links.filter((l) => role === "admin" || !l.adminOnly) }));
  const current = groups.flatMap((g) => g.links).find((l) => isActive(pathname, l.href));

  // Close the phone menu after navigating.
  useEffect(() => {
    const id = setTimeout(() => setOpen(false), 0);
    return () => clearTimeout(id);
  }, [pathname]);

  const nav = (
    <nav aria-label="Admin" className="relative grid gap-6">
      {groups.map((g) => (
        <div key={g.title} className="grid gap-1">
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-peach/80">{g.title}</p>
          {g.links.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group/link flex min-h-11 items-center gap-3 rounded-xl px-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-linear-to-r from-rust to-terracotta-deep text-white shadow-[0_8px_20px_-10px_rgb(168_69_43/0.8)]"
                    : "text-cream/85 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-lg transition-colors ${
                    active ? "bg-white/20" : "bg-white/5 group-hover/link:bg-white/10"
                  }`}
                >
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                {label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const brand = (
    <Link href="/admin" className="relative flex items-center gap-3 rounded-xl">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-linear-to-br from-terracotta to-rust text-white shadow-[0_8px_20px_-10px_rgb(168_69_43/0.9)]">
        <PawPrint className="size-5" aria-hidden />
      </span>
      <span className="grid leading-none">
        <span className="font-bubble text-xl font-extrabold text-cream">Ria Pet Mart</span>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-peach">Staff portal</span>
      </span>
    </Link>
  );

  return (
    <div className="admin-theme flex min-h-dvh flex-1 bg-ground text-ink">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden print:hidden h-dvh w-64 shrink-0 flex-col gap-8 overflow-x-hidden overflow-y-auto bg-choc px-4 py-6 lg:flex">
        <span aria-hidden className="pointer-events-none absolute -top-20 -left-16 size-56 rounded-full bg-terracotta/15 blur-3xl" />
        {brand}
        {nav}
      </aside>

      {/* Phone / tablet drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-choc/50" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col gap-8 overflow-x-hidden overflow-y-auto bg-choc px-4 py-6">
            <span aria-hidden className="pointer-events-none absolute -top-20 -left-16 size-56 rounded-full bg-terracotta/15 blur-3xl" />
            <div className="relative flex items-center justify-between">
              {brand}
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="grid size-10 place-items-center rounded-full text-cream hover:bg-white/10">
                <X className="size-6" aria-hidden />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex print:hidden min-h-16 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-6">
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="-ml-1 grid size-10 place-items-center rounded-full text-choc hover:bg-sunk lg:hidden">
            <Menu className="size-6" aria-hidden />
          </button>
          <div className="grid min-w-0 leading-tight">
            <span className="text-[11px] font-bold uppercase tracking-widest text-ink-3">Admin</span>
            <span className="truncate font-bubble text-lg font-extrabold text-choc">{current?.label ?? "Admin"}</span>
          </div>
          <form action="/admin/orders" role="search" className="ml-auto hidden w-full max-w-xs md:block">
            <label htmlFor="admin-search" className="sr-only">
              Search orders
            </label>
            <span className="relative block">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
              <input
                id="admin-search"
                name="q"
                type="search"
                placeholder="Search orders, customers, phone…"
                className="min-h-10 w-full rounded-full border border-line bg-ground pr-3 pl-9 text-sm transition-colors placeholder:text-ink-3 hover:border-peach"
              />
            </span>
          </form>
          <div className="ml-auto flex items-center gap-3 md:ml-0">
            <div className="hidden text-right leading-tight sm:grid">
              <span className="max-w-56 truncate text-sm font-semibold">{email}</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-terracotta-deep">{role}</span>
            </div>
            <span className="grid size-9 place-items-center rounded-full bg-linear-to-br from-terracotta-deep to-rust font-bold uppercase text-white" aria-hidden>
              {email[0]}
            </span>
            <form action={signOut}>
              <button type="submit" aria-label="Sign out" title="Sign out" className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-sunk">
                <LogOut className="size-[18px]" aria-hidden />
              </button>
            </form>
          </div>
        </header>
        <main id="main" className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
