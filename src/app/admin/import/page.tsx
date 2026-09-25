import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import type { Metadata } from "next";
import { ImportForm } from "@/components/admin/import-form";
import { requireAdmin } from "@/lib/auth";
import { TEMPLATE_COLUMNS } from "@/lib/catalogue-import";

export const metadata: Metadata = { title: "Import & export", robots: { index: false } };

const exports = [
  {
    href: "/admin/export?format=xlsx",
    label: "Export Excel (.xlsx)",
    Icon: FileSpreadsheet,
    note: "Opens in Excel or Google Sheets",
  },
  { href: "/admin/export?format=csv", label: "Export CSV", Icon: FileDown, note: "Import back after editing" },
  { href: "/admin/export?format=pdf", label: "Export price list (PDF)", Icon: FileText, note: "For printing or sending" },
];

export default async function ImportPage() {
  await requireAdmin();

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8">

      <div className="grid gap-1">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Import &amp; export</h1>
        <p className="text-ink-2">
          Nothing is saved until you press Import, and imported products stay hidden until you publish them.
        </p>
      </div>

      <ImportForm />

      <section aria-labelledby="export-heading" className="grid gap-4">
        <h2 id="export-heading" className="font-display text-2xl font-extrabold tracking-tight">
          Export
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {exports.map(({ href, label, Icon, note }) => (
            <li key={href}>
              <a
                href={href}
                className="grid h-full gap-2 rounded-[var(--radius-chunk)] border-2 border-ink bg-surface p-4 hover:-translate-y-0.5"
              >
                <Icon className="size-6 text-grape" aria-hidden />
                <span className="font-semibold">{label}</span>
                <span className="text-sm text-ink-2">{note}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="text-sm text-ink-2">
          <a href="/admin/export?format=xlsx&amp;template=1" className="underline">
            Download the blank template
          </a>{" "}
          if you&apos;d rather start from scratch. Columns:{" "}
          <code className="text-xs">{TEMPLATE_COLUMNS.join(", ")}</code>
        </p>
      </section>
    </div>
  );
}
