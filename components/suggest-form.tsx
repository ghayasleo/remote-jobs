"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-2xl border bg-background px-4 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="-mt-1 text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Suggest a remote-friendly company that isn't listed yet. */
export function SuggestForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);

  if (state === "sent") {
    return (
      <div className="rounded-3xl border p-6" role="status">
        <CheckCircle2Icon className="size-8 text-primary" aria-hidden />
        <h2 className="mt-3 text-lg font-bold">Thank you, we&apos;ve got it</h2>
        <p className="mt-1 max-w-[30rem] text-muted-foreground">
          We check each suggestion: whether the company hires remotely, and whether its job board can be read. If it fits,
          it&apos;ll show up in the list, with its open roles.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button className="h-11 rounded-full px-5" onClick={() => setState("idle")}>
            Suggest another
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-full px-5">
            <Link href="/companies">Back to companies</Link>
          </Button>
        </div>
      </div>
    );
  }

  const invalid = (field: string) => (error?.field === field ? true : undefined);
  const describedBy = (field: string, hint = false) =>
    [hint && `${field}-hint`, error?.field === field && `${field}-error`].filter(Boolean).join(" ") || undefined;

  return (
    <form
      className="grid gap-5"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        setState("sending");
        setError(null);
        const data = Object.fromEntries(new FormData(event.currentTarget));
        const response = await fetch("/api/suggest", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(data),
        }).catch(() => null);
        if (response?.ok) {
          setState("sent");
          return;
        }
        const body = (await response?.json().catch(() => null)) as { error?: string; field?: string } | null;
        setError({ field: body?.field, message: body?.error ?? "You seem to be offline. Please try again." });
        setState("idle");
      }}
    >
      <Field id="name" label="Company name" error={error?.field === "name" ? error.message : undefined}>
        <input id="name" name="name" required maxLength={120} autoComplete="organization" aria-invalid={invalid("name")} aria-describedby={describedBy("name")} className={cn(fieldClass, "h-12")} />
      </Field>
      <Field id="website" label="Website" error={error?.field === "website" ? error.message : undefined}>
        <input id="website" name="website" required inputMode="url" placeholder="acme.com" aria-invalid={invalid("website")} aria-describedby={describedBy("website")} className={cn(fieldClass, "h-12")} />
      </Field>
      <Field
        id="careersUrl"
        label="Careers or jobs page (optional)"
        hint="Where they list open roles. It helps us find their job board."
        error={error?.field === "careersUrl" ? error.message : undefined}
      >
        <input id="careersUrl" name="careersUrl" inputMode="url" placeholder="acme.com/careers" aria-invalid={invalid("careersUrl")} aria-describedby={describedBy("careersUrl", true)} className={cn(fieldClass, "h-12")} />
      </Field>
      <Field id="note" label="Anything we should know? (optional)" hint="Where they hire, how they work remotely, or why you recommend them.">
        <textarea id="note" name="note" rows={4} maxLength={1000} aria-describedby="note-hint" className={cn(fieldClass, "py-3")} />
      </Field>
      <Field
        id="contactEmail"
        label="Your email (optional)"
        hint="Only if you'd like to hear when it's added. We won't use it for anything else."
        error={error?.field === "contactEmail" ? error.message : undefined}
      >
        <input id="contactEmail" name="contactEmail" type="email" autoComplete="email" aria-invalid={invalid("contactEmail")} aria-describedby={describedBy("contactEmail", true)} className={cn(fieldClass, "h-12")} />
      </Field>
      {/* Left empty by people; bots tend to fill it. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="company_fax">Fax</label>
        <input id="company_fax" name="company_fax" tabIndex={-1} autoComplete="off" />
      </div>
      {error && !error.field && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error.message}
        </p>
      )}
      <div>
        <Button type="submit" disabled={state === "sending"} className="h-12 rounded-full px-6 text-base">
          {state === "sending" ? "Sending…" : "Suggest this company"}
        </Button>
      </div>
    </form>
  );
}
