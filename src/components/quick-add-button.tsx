"use client";

import { Plus } from "lucide-react";
import { useCart } from "@/lib/cart-context";

export function QuickAddButton({
  variantId,
  productSlug,
  productName,
  variantTitle,
  price,
  image,
}: {
  variantId: string;
  productSlug: string;
  productName: string;
  variantTitle: string;
  price: number;
  image: string | null;
}) {
  const { add, openCart } = useCart();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        add({ variantId, productSlug, productName, variantTitle, price, image });
        openCart();
      }}
      aria-label={`Add ${productName} to cart`}
      className="absolute bottom-2 right-2 grid size-9 place-items-center rounded-full bg-terracotta text-cream shadow-[2px_2px_0_0_var(--color-choc)]"
    >
      <Plus className="size-5" aria-hidden />
    </button>
  );
}
