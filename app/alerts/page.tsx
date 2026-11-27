import type { Metadata } from "next";
import { AlertsView } from "@/components/alerts/alerts-view";

export const metadata: Metadata = {
  title: "Job alerts",
  description: "Your job alerts on this device: notifications when new remote roles match your searches.",
  robots: { index: false },
};

export default function AlertsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-8 pb-12 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Job alerts</h1>
      <p className="mt-2 max-w-[34rem] text-muted-foreground">
        Notifications on this device when new remote roles match a search. Alerts belong to this browser, so they work
        without an account.
      </p>
      <div className="mt-6">
        <AlertsView />
      </div>
    </div>
  );
}
