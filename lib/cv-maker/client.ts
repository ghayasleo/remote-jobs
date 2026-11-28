"use client";

import { toast } from "sonner";

/**
 * Makes (or opens) the CV tailored to a job and returns where it lives, or
 * null after telling the person why it couldn't (with a way forward).
 */
export async function tailorCvFor(jobKey: string, go: (href: string) => void): Promise<void> {
  const response = await fetch("/api/cv/tailor", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jobKey }),
  }).catch(() => null);
  const body = (await response?.json().catch(() => null)) as { id?: string; error?: string } | null;
  if (response?.ok && body?.id) {
    go(`/dashboard/cv?id=${body.id}`);
    return;
  }
  if (response?.status === 409) {
    toast("Make your main CV first", {
      description: "Tailored CVs start from it.",
      action: { label: "Open the CV maker", onClick: () => go("/dashboard/cv") },
    });
    return;
  }
  toast.error(body?.error ?? "Couldn't tailor your CV just now. Please try again.");
}
