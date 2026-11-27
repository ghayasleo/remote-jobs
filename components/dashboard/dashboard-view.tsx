"use client";

import { BellIcon, BookmarkCheckIcon, Building2Icon, CloudIcon, CloudOffIcon, DownloadIcon, KanbanSquareIcon } from "lucide-react";
import { AlertsView } from "@/components/alerts/alerts-view";
import { SavedCompanies } from "@/components/saved/saved-companies";
import { ImportButton, TrackerView, exportTracker } from "@/components/saved/tracker-view";
import { Button } from "@/components/ui/button";
import { openSignIn, useProfile } from "@/lib/auth/client";
import { useSyncState } from "@/lib/sync";
import { useTrackedJobs } from "@/lib/tracker";
import { TRACK_STATUSES, TRACK_STATUS_KEYS } from "@/lib/tracker-model";
import { useHydrated } from "@/lib/use-hydrated";

const PERKS = [
  { icon: KanbanSquareIcon, title: "Track every application", text: "Move roles from Saved to Applied, Interviewing and Offer, with notes." },
  { icon: BookmarkCheckIcon, title: "Save jobs and companies", text: "Keep a shortlist that follows you to every device." },
  { icon: BellIcon, title: "Get alerts", text: "Hear about new roles that match your searches." },
];

function SignedOut() {
  return (
    <div className="mx-auto max-w-2xl py-6">
      <h1 className="text-[clamp(1.875rem,4vw,2.5rem)] leading-tight font-extrabold tracking-[-0.03em] text-balance">
        Your job search, in one place
      </h1>
      <p className="mt-3 max-w-[34rem] text-lg leading-relaxed text-pretty text-muted-foreground">
        Every job and company stays free to browse. Sign in to save them, track your applications and get alerts.
      </p>
      <ul className="mt-8 grid gap-5">
        {PERKS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
              <Icon className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block font-semibold">{title}</span>
              <span className="block text-muted-foreground">{text}</span>
            </span>
          </li>
        ))}
      </ul>
      <Button className="mt-8 h-12 rounded-full px-6 text-base" onClick={() => openSignIn()}>
        Sign in with Google
      </Button>
    </div>
  );
}

function SyncStatus() {
  const sync = useSyncState();
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
      {sync.status === "error" ? (
        <>
          <CloudOffIcon className="size-4" aria-hidden />
          Couldn&apos;t sync just now. Your changes are safe and will sync when you&apos;re back online.
        </>
      ) : (
        <>
          <CloudIcon className="size-4" aria-hidden />
          {sync.status === "syncing" ? "Syncing…" : "Synced to your account"}
        </>
      )}
    </p>
  );
}

function SectionHeading({ icon: Icon, title, detail, actions }: { icon: typeof BellIcon; title: string; detail?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <Icon className="size-5 text-muted-foreground" aria-hidden />
          {title}
        </h2>
        {detail && <p className="mt-1 text-sm text-muted-foreground">{detail}</p>}
      </div>
      {actions && <div className="flex gap-1">{actions}</div>}
    </div>
  );
}

/** The signed-in person's dashboard: applications, saved companies and alerts. */
export function DashboardView() {
  const hydrated = useHydrated();
  const profile = useProfile();
  const jobs = useTrackedJobs();

  if (!hydrated) return <div className="h-96" />;
  if (!profile) return <SignedOut />;

  const firstName = profile.name?.split(/\s+/)[0];
  const summary = TRACK_STATUS_KEYS.map((status) => [status, jobs.filter((job) => job.status === status).length] as const)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => `${count} ${TRACK_STATUSES[status].toLowerCase()}`)
    .join(" · ");

  return (
    <div className="grid gap-12 py-6">
      <header className="grid gap-2">
        <h1 className="text-[clamp(1.875rem,4vw,2.5rem)] leading-tight font-extrabold tracking-[-0.03em]">
          {firstName ? `Hi, ${firstName}` : "Your dashboard"}
        </h1>
        <SyncStatus />
      </header>

      <section aria-label="Your applications" className="min-w-0">
        <SectionHeading
          icon={KanbanSquareIcon}
          title="Your applications"
          detail={summary || "Save roles to start tracking them."}
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
      </section>

      <div className="grid gap-12 xl:grid-cols-2">
        <section aria-label="Saved companies" className="min-w-0 max-w-3xl xl:max-w-none">
          <SectionHeading icon={Building2Icon} title="Saved companies" />
          <div className="-mx-4 sm:-mx-6">
            <SavedCompanies embedded />
          </div>
        </section>

        <section aria-label="Job alerts" className="min-w-0 max-w-3xl xl:max-w-none">
          <SectionHeading icon={BellIcon} title="Job alerts" detail="Notifications on this device when new roles match a search." />
          <AlertsView />
        </section>
      </div>
    </div>
  );
}
