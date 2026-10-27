"use client";

import { useState } from "react";
import { CAT_HOTEL_RATE, catHotelQuote } from "@/lib/cat-hotel-price";

const input = "w-full min-w-0 rounded-xl border border-choc/30 bg-cream px-3 py-2 text-base font-normal text-choc";

/** Cats, dates and pick-up time, with the price worked out as the customer types. */
export function StayFields({ today }: { today: string }) {
  const [cats, setCats] = useState(1);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [late, setLate] = useState(false);
  const quote = checkIn && checkOut ? catHotelQuote(checkIn, checkOut, cats, late) : null;

  return (
    <>
      <label className="grid gap-1 text-sm font-semibold text-choc">
        Number of cats
        <input
          type="number"
          name="pet_count"
          min={1}
          max={10}
          value={cats}
          onChange={(e) => setCats(Number(e.target.value) || 1)}
          required
          className="w-24 rounded-xl border border-choc/30 bg-cream px-3 py-2 text-base font-normal text-choc"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid min-w-0 gap-1 text-sm font-semibold text-choc">
          Check-in (Mon–Sat)
          <input type="date" name="check_in" required min={today} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={input} />
        </label>
        <label className="grid min-w-0 gap-1 text-sm font-semibold text-choc">
          Check-out (Mon–Sat)
          <input
            type="date"
            name="check_out"
            required
            min={checkIn || today}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className={input}
          />
        </label>
      </div>

      <fieldset className="grid gap-2 text-sm text-choc">
        <legend className="mb-1 font-semibold">Pick-up time on your check-out day</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="checkout_time" value="before" checked={!late} onChange={() => setLate(false)} />
          Before 12pm: no extra charge
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="checkout_time" value="after" checked={late} onChange={() => setLate(true)} />
          After 12pm: charged as 1 extra day
        </label>
      </fieldset>

      <div aria-live="polite" className="rounded-2xl border-2 border-terracotta bg-peach/30 p-4 text-sm text-choc">
        <p className="text-xs font-bold uppercase tracking-wide text-rust">Price estimate</p>
        {!quote ? (
          <p className="mt-1">Pick your check-in and check-out dates above to see your price (RM{CAT_HOTEL_RATE} per cat per day).</p>
        ) : quote.ok ? (
          <p>
            <span className="font-bubble text-xl font-extrabold">Estimated RM{quote.total}</span>
            <br />
            {quote.days} day{quote.days > 1 ? "s" : ""} × {cats} cat{cats > 1 ? "s" : ""} × RM{CAT_HOTEL_RATE}
            {quote.lateDay && " (includes 1 day for pick-up after 12pm)"}. Paid at the shop; final price confirmed on WhatsApp.
          </p>
        ) : (
          <p className="font-semibold text-bad-fg">{quote.error}</p>
        )}
      </div>
    </>
  );
}
