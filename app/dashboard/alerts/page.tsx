import type { Metadata } from "next";
import { AlertsView } from "@/components/alerts/alerts-view";
import { ScreenHeading } from "@/components/dashboard/screen-heading";

export const metadata: Metadata = { title: "Job alerts" };

export default function JobAlertsPage() {
  return (
    <>
      <ScreenHeading
        title="Job alerts"
        detail="Notifications on this device when new roles match a search. Set one up from any search on Jobs."
      />
      <div className="max-w-3xl">
        <AlertsView />
      </div>
    </>
  );
}
