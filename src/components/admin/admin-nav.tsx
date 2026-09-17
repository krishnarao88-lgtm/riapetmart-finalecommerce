import Link from "next/link";
import { signOut } from "@/app/admin/actions";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products & stock" },
  { href: "/admin/import", label: "Import & export" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav({ current }: { current: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b-2 border-ink pb-4">
      <nav aria-label="Admin" className="flex flex-wrap gap-2">
        {links.map((link) => (
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
