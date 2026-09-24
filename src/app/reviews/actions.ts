"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function submitReview(formData: FormData) {
  const orderId = formData.get("order_id");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const rating = Number(formData.get("rating"));
  const body = String(formData.get("body") ?? "").trim();

  if (!name || !email || !body || rating < 1 || rating > 5) {
    redirect("/reviews/new?error=1");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_review", {
    p_order_id: orderId ? String(orderId) : null,
    p_customer_name: name,
    p_customer_email: email,
    p_rating: rating,
    p_body: body,
  });
  if (error) redirect("/reviews/new?error=1");

  redirect("/reviews?submitted=1");
}
