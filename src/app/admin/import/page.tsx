import { Download, FileDown, FileSpreadsheet, FileText } from "lucide-react";
import type { Metadata } from "next";
import { Panel } from "@/components/admin/dashboard-parts";
import { PageHeader, pageWrap } from "@/components/admin/form-parts";
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
    <div className={pageWrap}>
      <PageHeader
        title="Import & export"
        description="Nothing is saved until you press Import, and imported products stay hidden until you publish them."
      />

      <ImportForm />

      <Panel id="export" title="Export" Icon={Download}>
        <ul className="grid gap-3 sm:grid-cols-3">
          {exports.map(({ href, label, Icon, note }) => (
            <li key={href}>
              <a
                href={href}
                className="grid h-full gap-2 rounded-xl border border-line bg-cream/50 p-4 transition-transform hover:-translate-y-0.5 hover:bg-cream"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-peach/60 text-rust">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="font-semibold text-choc">{label}</span>
                <span className="text-sm text-ink-2">{note}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="text-sm text-ink-2">
          <a href="/admin/export?format=xlsx&amp;template=1" className="font-semibold text-terracotta-deep underline">
            Download the blank template
          </a>{" "}
          if you&apos;d rather start from scratch. Columns:{" "}
          <code className="break-words rounded bg-sunk px-1 text-xs">{TEMPLATE_COLUMNS.join(", ")}</code>
        </p>
      </Panel>
    </div>
  );
}
