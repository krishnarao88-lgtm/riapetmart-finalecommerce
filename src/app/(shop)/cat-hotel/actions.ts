"use server";

import { redirect } from "next/navigation";
import { CAT_HOTEL_RATE, catHotelQuote, LATE_CHECKOUT_NOTE } from "@/lib/cat-hotel-price";
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
  const petCount = Math.min(10, Math.max(1, Number(formData.get("pet_count")) || 1));
  const checkIn = String(formData.get("check_in") ?? "");
  const checkOut = String(formData.get("check_out") ?? "");
  const lateCheckout = formData.get("checkout_time") === "after";
  const customerNotes = String(formData.get("notes") ?? "").trim();

  if (!customerName || !customerEmail || !customerPhone || !checkIn || !checkOut) {
    redirect("/cat-hotel?error=1");
  }
  // Same rules as the form's estimate: no Sunday check-in/out, check-out not before check-in.
  const quote = catHotelQuote(checkIn, checkOut, petCount, lateCheckout);
  if (!quote.ok) redirect(quote.error.includes("Sunday") ? "/cat-hotel?error=sunday" : "/cat-hotel?error=1");

  // The late pick-up choice is kept in the notes so Admin's estimate matches what the customer saw.
  const notes = [lateCheckout && LATE_CHECKOUT_NOTE, customerNotes].filter(Boolean).join(". ");
  const estimate = `Estimate RM${quote.total} (${quote.days} day${quote.days > 1 ? "s" : ""} × ${petCount} cat${petCount > 1 ? "s" : ""} × RM${CAT_HOTEL_RATE}${quote.lateDay ? ", incl. 1 day for pick-up after 12pm" : ""})`;

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
  const summary = `${customerName} (${customerPhone}) — ${checkIn} to ${checkOut} — ${petLabel} — ${estimate}`;
  // Separate attempts: a bad customer address must not stop the shop's own alert. Resend reports failures in
  // its result instead of throwing, so the shop email checks `error` too.
  try {
    await sendTemplate(
      customerEmail,
      catHotelRequest({ customerName, petLabel, checkIn, checkOut, notes: `${estimate}. Please bring your cat's own food and litter.${notes ? ` ${notes}` : ""}` }),
    );
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
    `🐱 <b>Cat Hotel request</b>: ${tg(customerName)} · ${tg(customerPhone)}\n${tg(petLabel)}, ${tg(checkIn)} → ${tg(checkOut)}\n${tg(estimate)}${notes ? `\nNotes: ${tg(notes)}` : ""}`,
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
        `Check-out: ${checkOut} (${lateCheckout ? "after" : "before"} 12pm)`,
        estimate,
        customerNotes && `Notes: ${customerNotes}`,
      ]
        .filter(Boolean)
        .join("\n"),
    ),
  );
}
