"use client";

import { Button } from "@/components/ui/button";
import { setConsent, useConsent } from "@/lib/consent";

/**
 * Asks before Google Analytics sets cookies. Not a modal: the page stays
 * usable, and both answers are equally easy.
 */
export function ConsentBanner() {
  const { open, choice } = useConsent();
  if (!open) return null;
  return (
    <section
      aria-labelledby="consent-title"
      className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-(--z-overlay) mx-auto max-w-sm rounded-2xl border bg-popover p-4 text-popover-foreground shadow-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-200 ease-out-quart motion-reduce:animate-none md:inset-x-auto md:bottom-6 md:left-6"
    >
      <h2 id="consent-title" className="font-semibold">
        Can we count your visit?
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        We use Google Analytics cookies to learn which pages help people find work. No ads, and your data is never
        sold.
        {choice && <> Right now you’ve {choice === "granted" ? "allowed" : "declined"} them.</>}
      </p>
      <div className="mt-3 flex gap-2">
        <Button variant="outline" className="h-10 flex-1 rounded-full" onClick={() => setConsent("denied")}>
          No thanks
        </Button>
        <Button className="h-10 flex-1 rounded-full" onClick={() => setConsent("granted")}>
          Allow
        </Button>
      </div>
    </section>
  );
}
