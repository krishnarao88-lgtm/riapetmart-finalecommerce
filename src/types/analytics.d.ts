// Globals injected by src/components/analytics.tsx (GA4 gtag.js and the Meta Pixel).
// Both are undefined when their env IDs aren't set, so always call them optionally.
export {};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}
