import { UserMinus } from "lucide-react";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { inviteStaff, removeStaff } from "../actions";

export const metadata: Metadata = { title: "Staff", robots: { index: false } };

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ invited?: string; error?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { invited, error } = await searchParams;
  const { data: staff } = await supabase.rpc("list_staff");
  const emails = (staff ?? []) as { email: string }[];

  return (
    <div className="mx-auto grid max-w-2xl gap-6 px-4 py-8">
      <div className="grid gap-1">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Staff</h1>
        <p className="text-ink-2">
          Staff can view orders and print packing lists. They can&apos;t see cost prices, edit products, book
          shipments or change settings.
        </p>
      </div>

      {invited && <p className="rounded-xl border-2 border-ok-fg bg-ok-bg px-3 py-2 text-sm text-ok-fg">Staff added.</p>}
      {error && (
        <p className="rounded-xl border-2 border-bad-fg bg-bad-bg px-3 py-2 text-sm text-bad-fg">
          Couldn&apos;t add that email — check it&apos;s valid.
        </p>
      )}

      <form action={inviteStaff} className="flex flex-wrap gap-2 rounded-2xl border-2 border-line bg-surface p-4">
        <input
          type="email"
          name="email"
          required
          placeholder="staff@example.com"
          className="min-w-0 flex-1 rounded-full border-2 border-line px-4 py-2 text-sm"
        />
        <button type="submit" className="btn-chunk bg-grape text-surface">
          Add staff
        </button>
      </form>
      <p className="text-sm text-ink-2">
        They sign in the same way at{" "}
        <a href="/admin/login" className="underline">
          /admin/login
        </a>{" "}
        with a magic link sent to this email.
      </p>

      {emails.length === 0 ? (
        <p className="rounded-2xl border-2 border-line bg-surface p-6 text-ink-2">No staff added yet.</p>
      ) : (
        <ul className="grid gap-2">
          {emails.map((s) => (
            <li
              key={s.email}
              className="flex items-center justify-between gap-2 rounded-2xl border-2 border-line bg-surface p-3"
            >
              <span className="text-sm">{s.email}</span>
              <form action={removeStaff}>
                <input type="hidden" name="email" value={s.email} />
                <button type="submit" className="flex items-center gap-1 text-sm font-semibold text-bad-fg">
                  <UserMinus className="size-4" aria-hidden /> Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
