"use client";

import { LocateFixed } from "lucide-react";
import { useState } from "react";

const SEARCH = "https://www.google.com/maps/search/veterinary+clinic";

/**
 * Opens Google Maps with vet clinics around the shopper. Their location goes straight from the browser to
 * Google Maps and is never sent to or stored by us. Without permission it falls back to Google's "near me".
 */
export function VetFinderButton({ className = "" }: { className?: string }) {
  const [busy, setBusy] = useState(false);

  function find() {
    // Open the tab now (inside the click) so pop-up blockers allow it, then point it at the right place.
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null; // the new tab can't reach back into our page
    const go = (url: string) => {
      setBusy(false);
      if (tab) tab.location.href = url;
      else window.location.href = url;
    };
    if (!navigator.geolocation) return go(`${SEARCH}+near+me`);
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => go(`${SEARCH}/@${coords.latitude.toFixed(5)},${coords.longitude.toFixed(5)},14z`),
      () => go(`${SEARCH}+near+me`),
      { timeout: 8000, maximumAge: 600_000 },
    );
  }

  return (
    <button type="button" onClick={find} disabled={busy} className={`btn-bubble inline-flex items-center gap-2 bg-rust px-6 py-3 text-cream ${className}`}>
      <LocateFixed className="size-5" aria-hidden />
      {busy ? "Finding your location…" : "Find a vet near me"}
    </button>
  );
}
