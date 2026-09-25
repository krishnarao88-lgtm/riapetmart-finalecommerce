import Link from "next/link";
import { signOut } from "@/app/admin/actions";

const links = [
  { href: "/admin", label: "Dashboard", adminOnly: true },
  { href: "/admin/products", label: "Products & stock", adminOnly: true },
  { href: "/admin/orders", label: "Orders", adminOnly: false },
  { href: "/admin/cat-hotel", label: "Cat Hotel", adminOnly: false },
  { href: "/admin/reviews", label: "Reviews", adminOnly: false },
  { href: "/admin/promotions", label: "Offers & sales", adminOnly: true },
  { href: "/admin/import", label: "Import & export", adminOnly: true },
  { href: "/admin/staff", label: "Staff", adminOnly: true },
  { href: "/admin/settings", label: "Settings", adminOnly: true },
  { href: "/admin/security", label: "Sign-in security", adminOnly: false },
];

export function AdminNav({ current, role = "admin" }: { current: string; role?: "admin" | "staff" }) {
  const visible = links.filter((link) => role === "admin" || !link.adminOnly);
  return (
    <div className="flex flex-wrap items-center gap-2 border-b-2 border-ink pb-4">
      <nav aria-label="Admin" className="flex flex-wrap gap-2">
        {visible.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={link.href === current ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full border-2 px-4 text-sm font-semibold ${
              link.href === current ? "border-ink bg-grape text-surface" : "border-line bg-surface"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <form action={signOut} className="ml-auto">
        <button type="submit" className="min-h-11 rounded-full px-3 text-sm font-semibold text-ink-2 underline">
          Sign out
        </button>
      </form>
    </div>
  );
}
