"use client";

import {
  BadgePercent,
  BedDouble,
  BadgeCheck,
  Boxes,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareQuote,
  Receipt,
  Settings,
  ShieldCheck,
  UserCog,
  X,
  type LucideIcon,
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
    <nav aria-label="Admin" className="grid gap-6">
      {groups.map((g) => (
        <div key={g.title} className="grid gap-1">
          <p className="px-3 text-[11px] font-bold uppercase tracking-widest text-cream/45">{g.title}</p>
          {g.links.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${
                  active ? "bg-terracotta text-white shadow-sm" : "text-cream/80 hover:bg-white/10 hover:text-cream"
                }`}
              >
                <Icon className="size-[18px] shrink-0" aria-hidden />
                {label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const brand = (
    <Link href="/admin" className="grid leading-none">
      <span className="font-bubble text-xl font-extrabold text-cream">Ria Pet Mart</span>
      <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-peach">Staff portal</span>
    </Link>
  );

  return (
    <div className="admin-theme flex min-h-dvh flex-1 bg-ground text-ink">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 overflow-y-auto bg-choc px-4 py-6 lg:flex">
        {brand}
        {nav}
      </aside>

      {/* Phone / tablet drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-choc/50" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col gap-8 overflow-y-auto bg-choc px-4 py-6">
            <div className="flex items-start justify-between">
              {brand}
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="p-1 text-cream">
                <X className="size-6" aria-hidden />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex min-h-16 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-6">
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="-ml-1 p-1 lg:hidden">
            <Menu className="size-6" aria-hidden />
          </button>
          <div className="grid min-w-0 leading-tight">
            <span className="text-[11px] font-bold uppercase tracking-widest text-ink-3">Admin</span>
            <span className="truncate font-bold">{current?.label ?? "Admin"}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:grid">
              <span className="max-w-56 truncate text-sm font-semibold">{email}</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-terracotta-deep">{role}</span>
            </div>
            <span className="grid size-9 place-items-center rounded-full bg-terracotta font-bold uppercase text-white" aria-hidden>
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
