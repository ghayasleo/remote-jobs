"use client";

import { DownloadIcon } from "lucide-react";
import { ImportButton, TrackerView, exportTracker } from "@/components/saved/tracker-view";
import { Button } from "@/components/ui/button";
import { useTrackedJobs } from "@/lib/tracker";
import { TRACK_STATUSES, TRACK_STATUS_KEYS } from "@/lib/tracker-model";
import { ScreenHeading } from "./screen-heading";

export function SavedJobsScreen() {
  const jobs = useTrackedJobs();
  const summary = TRACK_STATUS_KEYS.map((status) => [status, jobs.filter((job) => job.status === status).length] as const)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => `${count} ${TRACK_STATUSES[status].toLowerCase()}`)
    .join(" · ");

  return (
    <>
      <ScreenHeading
        title="Saved jobs"
        detail={summary || "Save roles from Jobs and follow each one from Saved to Offer."}
        actions={
          jobs.length > 0 && (
            <>
              <Button variant="ghost" className="h-9 rounded-full px-3 text-muted-foreground" onClick={() => exportTracker(jobs)}>
                <DownloadIcon aria-hidden />
                Export
              </Button>
              <ImportButton />
            </>
          )
        }
      />
      <TrackerView />
    </>
  );
}
