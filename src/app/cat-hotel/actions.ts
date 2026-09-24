"use server";

import { redirect } from "next/navigation";
import { getResend } from "@/lib/resend";
import { site } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export async function submitCatHotelBooking(formData: FormData) {
  const customerName = String(formData.get("customer_name") ?? "").trim();
  const customerEmail = String(formData.get("customer_email") ?? "").trim();
  const customerPhone = String(formData.get("customer_phone") ?? "").trim();
  const catName = String(formData.get("cat_name") ?? "").trim();
  const petCount = Math.max(1, Number(formData.get("pet_count")) || 1);
  const checkIn = String(formData.get("check_in") ?? "");
  const checkOut = String(formData.get("check_out") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!customerName || !customerEmail || !customerPhone || !checkIn || !checkOut) {
    redirect("/cat-hotel?error=1");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_cat_hotel_booking", {
    p_customer_name: customerName,
    p_customer_email: customerEmail,
    p_customer_phone: customerPhone,
    p_cat_name: catName || null,
    p_check_in: checkIn,
    p_check_out: checkOut,
    p_notes: notes || null,
    p_pet_count: petCount,
  });
  if (error) redirect("/cat-hotel?error=1");

  const petLabel = `${petCount} cat${petCount > 1 ? "s" : ""}${catName ? ` (${catName})` : ""}`;
  const summary = `${customerName} (${customerPhone}) — ${checkIn} to ${checkOut} — ${petLabel}`;
  try {
    await getResend().emails.send({
      from: `${site.name} <orders@${new URL(site.url).hostname}>`,
      to: customerEmail,
      subject: "We've received your Cat Hotel booking request",
      text: `Hi ${customerName},\n\nThanks for your Cat Hotel booking request for ${petLabel}:\n${checkIn} to ${checkOut}\n\nThis is a request, not a confirmed reservation yet — we'll contact you on WhatsApp or phone (${site.phone}) shortly to confirm availability and the current rate.\n\n${site.name}`,
    });
    await getResend().emails.send({
      from: `${site.name} <orders@${new URL(site.url).hostname}>`,
      to: site.email,
      subject: "New Cat Hotel booking request",
      text: `${summary}\nEmail: ${customerEmail}\nNotes: ${notes || "—"}\n\nReview it in /admin/cat-hotel.`,
    });
  } catch (err) {
    console.error("Cat Hotel booking email failed:", err);
  }

  redirect("/cat-hotel?submitted=1");
}
