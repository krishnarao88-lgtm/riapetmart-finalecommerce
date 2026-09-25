"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";

export function CartBadge() {
  const { count } = useCart();
  return (
    <Link
      href="/cart"
      className="btn-bubble bg-terracotta px-4 text-sm text-cream"
      aria-label={`Cart, ${count} items`}
    >
      <ShoppingBag className="size-5" aria-hidden />
      <span className="tabular-nums">{count}</span>
    </Link>
  );
}
