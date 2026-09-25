"use server";

import { redirect } from "next/navigation";
import { FROM, getResend, sendEmail } from "@/lib/resend";
import { site, whatsappLink } from "@/lib/site";
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
    await sendEmail(customerEmail, `Cat Hotel request received — ${site.name}`, {
      preheader: `Your stay request for ${checkIn} to ${checkOut} is with us.`,
      heading: `Thanks, ${customerName}. We've got your request`,
      paragraphs: [
        "Here's what you asked for. This is a request, not a confirmed reservation yet: we'll contact you on WhatsApp shortly to confirm availability and the rate.",
      ],
      lines: [
        { name: "Guests", detail: petLabel },
        { name: "Check-in", detail: checkIn },
        { name: "Check-out", detail: checkOut },
        ...(notes ? [{ name: "Notes", detail: notes }] : []),
      ],
      cta: { label: "Chat with us on WhatsApp", url: whatsappLink(`Hi ${site.name}, about my Cat Hotel request for ${checkIn} to ${checkOut}.`) },
      note: "Need to change the dates? Just reply to this email.",
    });
    await getResend().emails.send({
      from: FROM,
      to: site.email,
      subject: "New Cat Hotel booking request",
      text: `${summary}\nEmail: ${customerEmail}\nNotes: ${notes || "—"}\n\nReview it in /admin/cat-hotel.`,
    });
  } catch (err) {
    console.error("Cat Hotel booking email failed:", err);
  }

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
