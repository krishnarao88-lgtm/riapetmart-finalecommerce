"use client";

import { useEffect } from "react";

const STORAGE_KEY = "riapetmart:ref";

export function ReferralCapture() {
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref) localStorage.setItem(STORAGE_KEY, ref);
    } catch {
      // storage blocked — referral just won't be tracked this visit
    }
  }, []);

  return null;
}
