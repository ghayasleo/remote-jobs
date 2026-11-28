"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openSignIn, useProfile } from "@/lib/auth/client";
import { tailorCvFor } from "@/lib/cv-maker/client";

/** "Tailor my CV" on a job's page. Development only for now (see lib/features.ts). */
export function TailorCvButton({ jobKey }: { jobKey: string }) {
  const router = useRouter();
  const profile = useProfile();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      size="lg"
      className="h-11 rounded-full px-4"
      disabled={busy}
      onClick={async () => {
        if (!profile) {
          openSignIn("Sign in to make a CV tailored to this role.");
          return;
        }
        setBusy(true);
        await tailorCvFor(jobKey, (href) => router.push(href));
        setBusy(false);
      }}
    >
      <FileTextIcon aria-hidden />
      {busy ? "Tailoring…" : "Tailor my CV"}
    </Button>
  );
}
