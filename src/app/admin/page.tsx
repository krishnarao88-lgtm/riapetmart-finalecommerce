import { Boxes, FileSpreadsheet, LogOut, Percent, Settings } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

const upcoming = [
  { Icon: Boxes, title: "Products & stock", body: "Variants, batches and expiry dates." },
  { Icon: Percent, title: "Pricing", body: "Cost price and margin slider." },
  { Icon: FileSpreadsheet, title: "Import & export", body: "Excel, CSV and PDF." },
  { Icon: Settings, title: "Settings", body: "Short-dated discounts and delivery." },
];

export default async function AdminHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = profile?.role === "admin";

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

      {isAdmin ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {upcoming.map(({ Icon, title, body }) => (
            <li key={title} className="grid gap-3 rounded-[var(--radius-chunk)] border-2 border-ink bg-surface p-5">
              <Icon className="size-7 text-grape" aria-hidden />
              <span className="font-display text-xl font-extrabold">{title}</span>
              <span className="text-sm text-ink-2">{body}</span>
              <span className="w-fit rounded-full bg-warn-bg px-2.5 py-1 text-xs font-bold text-warn-fg">
                Coming in Stage 2
              </span>
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
