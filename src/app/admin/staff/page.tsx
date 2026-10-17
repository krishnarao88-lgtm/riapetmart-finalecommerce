import { UserMinus, UserPlus, Users } from "lucide-react";
import type { Metadata } from "next";
import { Panel } from "@/components/admin/dashboard-parts";
import { btnPrimary, inputCls, labelCls, Notice, PageHeader, pageWrap } from "@/components/admin/form-parts";
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
    <div className={pageWrap}>
      <PageHeader
        title="Staff"
        description="Staff can view orders and print packing lists. They can't see cost prices, edit products, book shipments or change settings."
      />

      {invited && <Notice tone="ok">Staff added.</Notice>}
      {error && <Notice tone="bad">Couldn&apos;t add that email — check it&apos;s valid.</Notice>}

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Panel title="Add staff" Icon={UserPlus}>
          <form action={inviteStaff} className="flex flex-wrap items-end gap-2">
            <label htmlFor="staff-email" className={`${labelCls} min-w-0 flex-1`}>
              Staff email
              <input
                id="staff-email"
                type="email"
                name="email"
                required
                placeholder="staff@example.com"
                className={inputCls}
              />
            </label>
            <button type="submit" className={btnPrimary}>
              Add staff
            </button>
          </form>
          <p className="text-sm text-ink-2">
            They sign in the same way at{" "}
            <a href="/admin/login" className="font-semibold text-terracotta-deep underline">
              /admin/login
            </a>{" "}
            with a magic link sent to this email.
          </p>
        </Panel>

        <Panel title={`Team (${emails.length})`} Icon={Users}>
          {emails.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line p-6 text-center text-ink-2">
              No staff added yet.
            </p>
          ) : (
            <ul className="grid gap-2">
              {emails.map((s) => (
                <li
                  key={s.email}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-cream/60 p-3"
                >
                  <span className="min-w-0 break-all text-sm font-semibold text-choc">{s.email}</span>
                  <form action={removeStaff}>
                    <input type="hidden" name="email" value={s.email} />
                    <button
                      type="submit"
                      className="inline-flex min-h-10 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-bad-fg hover:bg-bad-bg"
                    >
                      <UserMinus className="size-4" aria-hidden /> Remove
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
