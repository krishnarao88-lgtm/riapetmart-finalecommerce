"use client";

import { useState, useTransition, type ReactNode } from "react";
import { shrinkFormImages } from "@/lib/shrink-image";

/**
 * A form that shrinks attached photos in the browser before calling its server action.
 * Submits from onSubmit rather than `action` so a photo error doesn't reset what was typed.
 */
export function ShrinkImagesForm({
  action,
  className,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  className?: string;
  children: ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError(null);
        startTransition(async () => {
          try {
            await shrinkFormImages(formData);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't prepare your photos. Try again.");
            return;
          }
          await action(formData);
        });
      }}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {error && (
        <p role="alert" className="rounded-xl border-2 border-bad-fg bg-bad-bg px-3 py-2 text-sm text-bad-fg">
          {error}
        </p>
      )}
    </form>
  );
}
