"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { upcEToUpcA } from "@/lib/gtin";
import { btnSecondary } from "./form-parts";

// Chrome/Android ship the native BarcodeDetector; iPhone Safari doesn't, so it falls back to ZXing,
// loaded only when the scanner opens (never in storefront bundles).

type Detector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string; format: string }[]> };
type DetectorClass = {
  new (opts: { formats: string[] }): Detector;
  getSupportedFormats(): Promise<string[]>;
};

const NATIVE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];

/** UPC-E is stored as its full UPC-A so Google gets a 12-digit GTIN. */
function normalise(code: string, isUpcE: boolean) {
  return (isUpcE && upcEToUpcA(code)) || code;
}

export function BarcodeScanner({ label, onResult, onClose }: { label: string; onResult: (code: string) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  // Latest callbacks without restarting the camera.
  const done = useRef(onResult);
  useEffect(() => {
    done.current = onResult;
  });

  useEffect(() => {
    dialog.current?.showModal();
    let stop = () => {};
    let cancelled = false;
    const finish = (code: string) => {
      if (cancelled) return;
      cancelled = true;
      stop();
      done.current(code);
    };

    (async () => {
      const el = video.current!;
      const Native = (window as unknown as { BarcodeDetector?: DetectorClass }).BarcodeDetector;
      const formats = Native ? (await Native.getSupportedFormats()).filter((f) => NATIVE_FORMATS.includes(f)) : [];
      if (Native && formats.length) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        let timer = 0;
        stop = () => {
          window.clearInterval(timer);
          stream.getTracks().forEach((t) => t.stop());
        };
        if (cancelled) return stop();
        el.srcObject = stream;
        await el.play();
        const detector = new Native({ formats });
        let busy = false;
        timer = window.setInterval(async () => {
          if (busy || el.readyState < 2) return;
          busy = true;
          const [hit] = await detector.detect(el).catch(() => []);
          busy = false;
          if (hit?.rawValue) finish(normalise(hit.rawValue, hit.format === "upc_e"));
        }, 200);
        return;
      }
      const { BrowserMultiFormatOneDReader, BarcodeFormat } = await import("@zxing/browser");
      if (cancelled) return;
      const allowed = [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E];
      const controls = await new BrowserMultiFormatOneDReader().decodeFromConstraints(
        { video: { facingMode: "environment" }, audio: false },
        el,
        (result) => {
          if (!result || !allowed.includes(result.getBarcodeFormat())) return;
          finish(normalise(result.getText(), result.getBarcodeFormat() === BarcodeFormat.UPC_E));
        },
      );
      stop = () => controls.stop();
      if (cancelled) stop();
    })().catch((err: unknown) => {
      const denied = err instanceof DOMException && err.name === "NotAllowedError";
      setError(denied ? "Camera access was blocked. Allow the camera for this site and try again." : "Couldn't start the camera on this device.");
    });

    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-label={`Scan barcode for ${label}`}
      onClose={onClose}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-4 text-ink backdrop:bg-ink/60"
    >
      <div className="grid gap-3">
        <div className="flex items-start justify-between gap-3">
          <p className="font-bold text-choc">Scan barcode: {label}</p>
          <button type="button" onClick={() => dialog.current?.close()} className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-sunk" aria-label="Close scanner">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <video ref={video} muted playsInline autoPlay className="aspect-[4/3] w-full rounded-xl bg-ink object-cover" aria-hidden />
        {error ? (
          <p role="alert" className="text-sm font-semibold text-bad-fg">{error}</p>
        ) : (
          <p className="text-sm text-ink-2">Hold the barcode flat, filling most of the frame. EAN-13, EAN-8, UPC-A and UPC-E are read.</p>
        )}
        <button type="button" onClick={() => dialog.current?.close()} className={btnSecondary}>Cancel</button>
      </div>
    </dialog>
  );
}
