"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";

export function CartBadge() {
  const { count } = useCart();
  return (
    <Link
      href="/cart"
      className="btn-bubble ml-auto bg-terracotta px-4 text-sm text-cream md:ml-2"
      aria-label={`Cart, ${count} items`}
    >
      <ShoppingBag className="size-5" aria-hidden />
      <span className="tabular-nums">{count}</span>
    </Link>
  );
}
