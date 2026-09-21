"use client";

import { useState } from "react";

export function EnquiryForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    const form = new FormData(e.currentTarget);
    const body = {
      name: form.get("name"),
      email: form.get("email"),
      message: form.get("message"),
    };
    const res = await fetch("/api/enquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setStatus("error");
      return;
    }
    setStatus("sent");
    e.currentTarget.reset();
  }

  if (status === "sent") {
    return (
      <p className="rounded-2xl border-2 border-choc bg-surface p-4 font-semibold text-choc">
        Thanks! We&apos;ll reply to your email soon.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl border-2 border-choc bg-surface p-4">
      <input
        name="name"
        required
        placeholder="Your name"
        className="rounded-xl border-2 border-choc/30 px-3 py-2 text-choc"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="Your email"
        className="rounded-xl border-2 border-choc/30 px-3 py-2 text-choc"
      />
      <textarea
        name="message"
        required
        rows={4}
        placeholder="How can we help?"
        className="rounded-xl border-2 border-choc/30 px-3 py-2 text-choc"
      />
      {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
      <button type="submit" disabled={status === "sending"} className="btn-bubble bg-terracotta px-6 py-3 text-cream">
        {status === "sending" ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}
