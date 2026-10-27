"use server";

import { redirect } from "next/navigation";
import { FROM, getResend, sendTemplate } from "@/lib/resend";
import { site, whatsappLink } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { catHotelRequest } from "@/lib/emails";
import { notifyTelegram, tg } from "@/lib/telegram";

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
  // Separate attempts: a bad customer address must not stop the shop's own alert. Resend reports failures in
  // its result instead of throwing, so the shop email checks `error` too.
  try {
    await sendTemplate(customerEmail, catHotelRequest({ customerName, petLabel, checkIn, checkOut, notes: notes || undefined }));
  } catch (err) {
    console.error("Cat Hotel customer email failed:", err);
  }
  try {
    const { error: shopError } = await getResend().emails.send({
      from: FROM,
      to: site.email,
      replyTo: customerEmail,
      subject: "New Cat Hotel booking request",
      text: `${summary}\nEmail: ${customerEmail}\nNotes: ${notes || "—"}\n\nReview it in /admin/cat-hotel.`,
    });
    if (shopError) throw new Error(shopError.message);
  } catch (err) {
    console.error("Cat Hotel shop email failed:", err);
  }

  await notifyTelegram(
    `🐱 <b>Cat Hotel request</b>: ${tg(customerName)} · ${tg(customerPhone)}\n${tg(petLabel)}, ${tg(checkIn)} → ${tg(checkOut)}${notes ? `\nNotes: ${tg(notes)}` : ""}`,
  );

  // Saved and emailed above; now hand the customer to WhatsApp with the summary typed out for our number.
  redirect(
    whatsappLink(
      [
        `Hi ${site.name}, I'd like to book the Cat Hotel:`,
        `Name: ${customerName}`,
        `Phone: ${customerPhone}`,
        `Cats: ${petLabel}`,
        `Check-in: ${checkIn}`,
        `Check-out: ${checkOut}`,
        notes && `Notes: ${notes}`,
      ]
        .filter(Boolean)
        .join("\n"),
    ),
  );
}
