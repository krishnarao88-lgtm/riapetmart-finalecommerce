"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function submitReview(formData: FormData) {
  const orderId = formData.get("order_id");
  const productId = formData.get("product_id");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const rating = Number(formData.get("rating"));
  const body = String(formData.get("body") ?? "").trim();
  const images = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);

  if (!name || !email || !body || rating < 1 || rating > 5) {
    redirect("/reviews/new?error=1");
  }
  if (images.some((f) => f.size > MAX_IMAGE_BYTES || !f.type.startsWith("image/"))) {
    redirect("/reviews/new?error=image");
  }

  const supabase = await createClient();

  const imagePaths: string[] = [];
  for (const file of images.slice(0, 4)) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("review-images").upload(path, file, {
      contentType: file.type,
    });
    if (!uploadError) imagePaths.push(path);
  }

  const { error } = await supabase.rpc("submit_review", {
    p_order_id: orderId ? String(orderId) : null,
    p_customer_name: name,
    p_customer_email: email,
    p_rating: rating,
    p_body: body,
    p_product_id: productId ? String(productId) : null,
    p_image_paths: imagePaths.length ? imagePaths : null,
  });
  if (error) redirect("/reviews/new?error=1");

  redirect("/reviews?submitted=1");
}
