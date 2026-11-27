"use client";

import { useRouter } from "next/navigation";
import { BookmarkIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { openSignIn, useProfile } from "@/lib/auth/client";
import { removeJob, restoreJob, saveJob, useTrackedJob, type SavableJob } from "@/lib/tracker";
import { TRACK_STATUSES, trackKey } from "@/lib/tracker-model";
import { cn } from "@/lib/utils";

/** Saves a role to the application tracker, or removes it. */
export function SaveJobButton({ job, withLabel = false, className }: { job: SavableJob; withLabel?: boolean; className?: string }) {
  const router = useRouter();
  const profile = useProfile();
  const key = trackKey(job);
  const tracked = useTrackedJob(key);
  // Saved jobs belong to an account: signed out, nothing shows as saved.
  const saved = profile !== null && tracked !== undefined;

  const onClick = () => {
    if (!profile) {
      openSignIn("Sign in to save jobs and track your applications. It's free.");
      return;
    }
    if (tracked) {
      const previous = tracked;
      removeJob(key);
      toast(`Removed “${job.title}” from your tracker`, {
        id: `job-${key}`,
        action: { label: "Undo", onClick: () => restoreJob(previous) },
      });
      return;
    }
    if (!saveJob(job)) {
      toast.error("Your browser blocked saving. Check that site storage is allowed.");
      return;
    }
    toast(`Saved “${job.title}”`, {
      id: `job-${key}`,
      description: "Track where your application stands on your dashboard.",
      action: { label: "Open dashboard", onClick: () => router.push("/dashboard") },
    });
  };

  const icon = (
    <BookmarkIcon
      className={cn("size-5 transition-transform duration-200 ease-out-quart", saved && "scale-110 fill-current")}
      aria-hidden
    />
  );

  if (withLabel) {
    return (
      <Button
        variant={saved ? "secondary" : "outline"}
        size="lg"
        aria-pressed={saved}
        onClick={onClick}
        className={cn("h-11 rounded-full px-4", className)}
      >
        {icon}
        {saved && tracked ? TRACK_STATUSES[tracked.status] : "Save"}
      </Button>
    );
  }
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${job.title} from your tracker` : `Save ${job.title}`}
      onClick={onClick}
      className={cn("size-11 rounded-full", saved ? "text-primary" : "text-muted-foreground", className)}
    >
      {icon}
    </Button>
  );
}
