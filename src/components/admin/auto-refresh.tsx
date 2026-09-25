"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Re-reads the page's live data every `seconds` while the tab is open, and says when it last did. */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  const [at, setAt] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
      setAt(new Date());
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);

  return (
    <p className="text-xs text-ink-2" suppressHydrationWarning>
      Live: refreshes every {seconds} seconds · last updated{" "}
      {at.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </p>
  );
}
