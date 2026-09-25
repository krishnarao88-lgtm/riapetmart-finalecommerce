import { Lock } from "lucide-react";

/** Accepted payment marks under the add-to-cart box. Text-drawn, so no third-party images or scripts. */
export function PaymentBadges() {
  const chip = "grid h-7 min-w-11 place-items-center rounded-md border border-choc/15 bg-white px-2";
  return (
    <div className="grid gap-2 rounded-2xl border-2 border-choc/15 bg-surface px-4 py-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-choc">
        <Lock className="size-4 text-ok-fg" aria-hidden />
        Secure checkout powered by <span className="font-extrabold tracking-tight text-[#635bff]">stripe</span>
      </p>
      <ul className="flex flex-wrap items-center gap-1.5" aria-label="Accepted payment methods">
        <li className={chip} aria-label="Visa">
          <span className="text-sm font-black italic tracking-tighter text-[#1a1f71]">VISA</span>
        </li>
        <li className={chip} aria-label="Mastercard">
          <svg viewBox="0 0 32 20" className="h-4" aria-hidden>
            <circle cx="12" cy="10" r="8" fill="#eb001b" />
            <circle cx="20" cy="10" r="8" fill="#f79e1b" fillOpacity="0.9" />
          </svg>
        </li>
        <li className={chip} aria-label="Apple Pay">
          <span className="text-xs font-semibold text-black">Apple Pay</span>
        </li>
        <li className={chip} aria-label="Google Pay">
          <span className="text-xs font-semibold">
            <span className="text-[#4285f4]">G</span>
            <span className="text-black"> Pay</span>
          </span>
        </li>
        <li className={chip} aria-label="FPX online banking">
          <span className="text-xs font-extrabold text-[#1e3a8a]">FPX</span>
        </li>
      </ul>
    </div>
  );
}
