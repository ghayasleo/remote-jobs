"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellIcon, BellOffIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { RelativeTime } from "@/components/relative-time";
import { Button } from "@/components/ui/button";
import { deleteAlert, listAlerts, pushSupport, turnOffAlerts, type DeviceAlert } from "@/lib/alerts-client";

/** This device's job alerts. */
export function AlertsView() {
  const [alerts, setAlerts] = useState<DeviceAlert[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pushSupport() === "unsupported" || pushSupport() === "ios-install") {
      // Nothing to load on a browser that can't get alerts.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAlerts([]);
      return;
    }
    listAlerts()
      .then(setAlerts)
      .catch((reason: Error) => {
        setError(reason.message);
        setAlerts([]);
      });
  }, []);

  // About as tall as what replaces it, so the screen doesn't jump when alerts load.
  if (alerts === null) {
    return (
      <div aria-busy="true" className="h-[21rem] rounded-2xl border border-dashed pt-14">
        <span className="sr-only">Loading your alerts…</span>
        <span aria-hidden className="mx-auto block size-14 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed px-6 py-14 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-secondary-foreground">
          <BellIcon className="size-6" aria-hidden />
        </span>
        <h2 className="mt-5 text-lg font-semibold">No alerts on this device</h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
          {error ??
            "Search or filter on Jobs, then press “Get alerts” to hear about new roles that match, once a day or as they come."}
        </p>
        <Button asChild className="mt-6 h-11 rounded-full px-5">
          <Link href="/jobs">Go to Jobs</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <ul className="divide-y rounded-2xl border">
        {alerts.map((alert) => (
          <li key={alert.id} className="flex items-center gap-3 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
              <BellIcon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <Link href={`/jobs${alert.query}`} className="font-semibold hover:underline">
                {alert.label || "Every new remote role"}
              </Link>
              <p className="text-sm text-muted-foreground">
                {alert.frequency === "daily" ? "Once a day" : "As they come"} · since <RelativeTime iso={alert.createdAt} />
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-full text-muted-foreground"
              aria-label={`Delete the alert for ${alert.label || "every new role"}`}
              onClick={async () => {
                try {
                  setAlerts(await deleteAlert(alert.id));
                  toast("Alert deleted");
                } catch (reason) {
                  toast.error((reason as Error).message);
                }
              }}
            >
              <Trash2Icon className="size-4" aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      <Button
        variant="ghost"
        className="h-10 justify-self-start rounded-full px-3 text-muted-foreground"
        onClick={async () => {
          await turnOffAlerts();
          setAlerts([]);
          toast("Alerts are off on this device");
        }}
      >
        <BellOffIcon aria-hidden />
        Turn off all alerts here
      </Button>
    </div>
  );
}
