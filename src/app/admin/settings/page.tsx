import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { SettingsForm, type SettingsValues } from "@/components/admin/settings-form";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

type Tier = { max_days: number; discount: number };

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("settings").select("key, value");
  const byKey = new Map((data ?? []).map((row) => [row.key, row.value as Record<string, unknown>]));

  const expiry = byKey.get("expiry_badges") ?? {};
  const pricing = byKey.get("pricing") ?? {};
  const delivery = byKey.get("delivery") ?? {};
  const tiers = (expiry.short_dated as Tier[] | undefined) ?? [{ max_days: 90, discount: 0.15 }];
  const sorted = [...tiers].sort((a, b) => b.max_days - a.max_days);
  const first = sorted[0] ?? { max_days: 90, discount: 0.15 };
  const second = sorted[1];

  const values: SettingsValues = {
    freshMinDays: Number(expiry.fresh_min_days ?? 181),
    shortDays: first.max_days,
    shortDiscount: Math.round(first.discount * 100),
    deepDays: second?.max_days ?? 0,
    deepDiscount: second ? Math.round(second.discount * 100) : 0,
    defaultMargin: Math.round(Number(pricing.default_margin ?? 0.25) * 100),
    roundUpSen: Math.round(Number(pricing.round_up_to ?? 0.1) * 100),
    lalamove: delivery.lalamove_enabled !== false,
    easyparcel: delivery.easyparcel_enabled !== false,
    pickup: delivery.pickup_enabled !== false,
    freeDeliveryMin:
      delivery.free_delivery_min === null || delivery.free_delivery_min === undefined
        ? null
        : Number(delivery.free_delivery_min),
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-6 px-4 py-8">
      <AdminNav current="/admin/settings" />
      <div className="grid gap-1">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-ink-2">These take effect immediately, with no new deployment needed.</p>
      </div>
      <SettingsForm values={values} />
    </div>
  );
}
