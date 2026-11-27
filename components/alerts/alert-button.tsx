"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellIcon, BellRingIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { openSignIn, useProfile } from "@/lib/auth/client";
import { createAlert, pushSupport, type DeviceAlert, type PushSupport } from "@/lib/alerts-client";
import { cn } from "@/lib/utils";

const FREQUENCY_OPTIONS: { value: DeviceAlert["frequency"]; title: string; detail: string }[] = [
  { value: "daily", title: "Once a day", detail: "One notification with the day's new roles" },
  { value: "hourly", title: "As they come", detail: "Within the hour of a new role being posted" },
];

const SUPPORT_NOTES: Record<Exclude<PushSupport, "supported">, string> = {
  "ios-install":
    "On iPhone and iPad, notifications only work from the app. Tap Share, then “Add to Home Screen”, open RemoteJobs from your Home Screen, and turn alerts on there.",
  unsupported: "This browser can't show notifications from websites. Try Chrome, Edge, Firefox or Safari, or follow this search by RSS.",
  denied: "Notifications are blocked for this site. Allow them in your browser's site settings, then try again.",
};

/** "Get alerts" for the current Jobs search. */
export function AlertButton({ query, label, className }: { query: string; label: string; className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [frequency, setFrequency] = useState<DeviceAlert["frequency"]>("daily");
  const [busy, setBusy] = useState(false);
  const [support, setSupport] = useState<PushSupport>("supported");
  const profile = useProfile();

  const turnOn = async () => {
    setBusy(true);
    try {
      await createAlert(query, label, frequency);
      setOpen(false);
      toast.success("Alerts are on", {
        description: frequency === "daily" ? "You'll get one notification a day when there are new roles." : "You'll hear about new roles within the hour.",
        action: { label: "Manage", onClick: () => router.push("/dashboard/alerts") },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That didn't work. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next && !profile) {
          openSignIn("Sign in to get alerts when new roles match your search. It's free.");
          return;
        }
        if (next) setSupport(pushSupport());
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className={cn("h-9 rounded-full px-3.5 text-sm", className)}>
          <BellIcon aria-hidden />
          Get alerts
        </Button>
      </DialogTrigger>
      <DialogContent>
        <div className="grid gap-1.5 pr-8">
          <DialogTitle>Alerts for this search</DialogTitle>
          <DialogDescription>{label ? `New remote roles matching: ${label}.` : "Every new remote role."}</DialogDescription>
        </div>
        {support === "supported" ? (
          <>
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-semibold">How often?</legend>
              {FREQUENCY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                    frequency === option.value && "border-primary bg-secondary",
                  )}
                >
                  <input
                    type="radio"
                    name="frequency"
                    value={option.value}
                    checked={frequency === option.value}
                    onChange={() => setFrequency(option.value)}
                    className="mt-1 size-4 accent-primary"
                  />
                  <span>
                    <span className="block font-semibold">{option.title}</span>
                    <span className="block text-sm text-muted-foreground">{option.detail}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <Button className="h-11 rounded-full px-5" disabled={busy} onClick={turnOn}>
              <BellRingIcon aria-hidden />
              {busy ? "Turning on…" : "Turn on alerts"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Alerts arrive on this device. Your browser will ask to allow notifications.{" "}
              <Link href="/dashboard/alerts" className="underline underline-offset-2" onClick={() => setOpen(false)}>
                Manage alerts
              </Link>
            </p>
          </>
        ) : (
          <p className="rounded-2xl bg-muted p-4 text-sm">{SUPPORT_NOTES[support]}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
