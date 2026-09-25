"use client";

import { UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

/** "Log in" for visitors, "Account" once signed in. Reads the Supabase session cookie so the header stays static. */
export function AccountLink() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setSignedIn(/(^|;\s*)sb-[a-z0-9]+-auth-token/.test(document.cookie)), 0);
    return () => clearTimeout(id);
  }, []);
  return (
    <Link
      href="/account"
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-choc bg-cream px-3.5 text-sm font-bold text-choc hover:bg-peach/50 max-md:ml-auto"
    >
      <UserRound className="size-4" aria-hidden />
      {signedIn ? "Account" : "Log in"}
    </Link>
  );
}
