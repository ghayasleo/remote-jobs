"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, BellIcon, BriefcaseIcon, Building2Icon, CloudIcon, CloudOffIcon, UserRoundIcon } from "lucide-react";
import { Avatar } from "@/components/auth/avatar";
import { CompanyLogo } from "@/components/company/company-logo";
import { RelativeTime } from "@/components/relative-time";
import { Skeleton } from "@/components/ui/skeleton";
import { listAlerts, pushSupport, type DeviceAlert } from "@/lib/alerts-client";
import { useProfile } from "@/lib/auth/client";
import { jobPath } from "@/lib/jobs";
import { useSavedSlugs } from "@/lib/saved";
import { useSyncState } from "@/lib/sync";
import { useTrackedJobs } from "@/lib/tracker";
import { TRACK_STATUSES, TRACK_STATUS_KEYS, type TrackedJob } from "@/lib/tracker-model";
import { useExploreData } from "@/lib/use-explore-data";
import { ScreenHeading } from "./screen-heading";

function SyncStatus() {
  const sync = useSyncState();
  return (
    <p className="flex items-center gap-2 text-sm" aria-live="polite">
      {sync.status === "error" ? (
        <>
          <CloudOffIcon className="size-4 shrink-0" aria-hidden />
          Couldn&apos;t sync just now. Your changes are safe and will sync when you&apos;re back online.
        </>
      ) : (
        <>
          <CloudIcon className="size-4 shrink-0" aria-hidden />
          {sync.status === "syncing" ? "Syncing…" : "Synced to your account"}
        </>
      )}
    </p>
  );
}

/** A summary card that opens one of the dashboard's screens. */
function Tile({
  href,
  icon: Icon,
  title,
  count,
  action,
  children,
}: {
  href: string;
  icon: typeof BellIcon;
  title: string;
  count?: number;
  action: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative flex min-w-0 flex-col rounded-2xl border bg-card p-5 transition-colors duration-150 hover:border-foreground/20 has-[a:focus-visible]:border-ring">
      <h2 className="flex items-center gap-2.5 font-semibold">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
          <Icon className="size-4" aria-hidden />
        </span>
        <Link href={href} className="outline-none after:absolute after:inset-0 after:rounded-2xl after:content-['']">
          {title}
        </Link>
        {count !== undefined && <span className="ml-auto text-sm font-medium text-muted-foreground tabular-nums">{count}</span>}
      </h2>
      <div className="mt-4 flex-1 text-sm">{children}</div>
      <p aria-hidden className="mt-5 flex items-center gap-1 text-sm font-medium text-muted-foreground">
        {action}
        <ArrowRightIcon className="size-4" />
      </p>
    </section>
  );
}

function JobsTile({ jobs }: { jobs: TrackedJob[] }) {
  const most = Math.max(1, ...TRACK_STATUS_KEYS.map((status) => jobs.filter((job) => job.status === status).length));
  return (
    <Tile href="/dashboard/jobs" icon={BriefcaseIcon} title="Saved jobs" count={jobs.length} action="Open the board">
      {jobs.length === 0 ? (
        <p className="text-muted-foreground">Nothing saved yet. Tap the bookmark on any role to keep it here.</p>
      ) : (
        <dl className="grid gap-2">
          {TRACK_STATUS_KEYS.map((status) => {
            const count = jobs.filter((job) => job.status === status).length;
            return (
              <div key={status} className="flex items-center gap-3">
                <dt className="w-24 shrink-0 text-muted-foreground">{TRACK_STATUSES[status]}</dt>
                <span aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${(count / most) * 100}%` }} />
                </span>
                <dd className="w-6 text-right font-semibold tabular-nums">{count}</dd>
              </div>
            );
          })}
        </dl>
      )}
    </Tile>
  );
}

/** Logos of the saved companies, and how many are hiring. Loads the company list only when there's something saved. */
function SavedLogos({ slugs }: { slugs: string[] }) {
  const data = useExploreData();
  const bySlug = useMemo(() => new Map((data?.companies ?? []).map((company) => [company.slug, company])), [data]);
  if (!data) {
    return (
      <div className="flex gap-1.5" aria-label="Loading">
        {slugs.slice(0, 5).map((slug) => (
          <Skeleton key={slug} className="size-9 rounded-lg" />
        ))}
      </div>
    );
  }
  const saved = slugs.map((slug) => bySlug.get(slug)).filter((company) => company !== undefined);
  const hiring = saved.filter((company) => company.slug in data.hiring).length;
  return (
    <>
      <ul className="flex flex-wrap gap-1.5">
        {saved.slice(0, 6).map((company) => (
          <li key={company.slug} title={company.name}>
            <CompanyLogo name={company.name} domain={company.domain} size="md" className="size-9 rounded-lg" />
          </li>
        ))}
        {saved.length > 6 && (
          <li className="grid size-9 place-items-center rounded-lg border text-xs font-semibold text-muted-foreground">
            +{saved.length - 6}
          </li>
        )}
      </ul>
      <p className="mt-3 text-muted-foreground">
        {hiring === 0 ? "None of them are hiring right now." : `${hiring} hiring right now`}
      </p>
    </>
  );
}

function CompaniesTile({ slugs }: { slugs: string[] }) {
  return (
    <Tile href="/dashboard/companies" icon={Building2Icon} title="Saved companies" count={slugs.length} action="See all">
      {slugs.length === 0 ? (
        <p className="text-muted-foreground">Tap the bookmark on any company to follow it here.</p>
      ) : (
        <SavedLogos slugs={slugs} />
      )}
    </Tile>
  );
}

function useDeviceAlerts() {
  const [state, setState] = useState<{ alerts: DeviceAlert[] | null; note: string | null }>({ alerts: null, note: null });
  useEffect(() => {
    const support = pushSupport();
    if (support === "unsupported" || support === "ios-install") {
      // Nothing to load on a browser that can't get alerts.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({
        alerts: [],
        note: support === "ios-install" ? "Add RemoteJobs to your Home Screen to get alerts here." : "This browser can't show notifications.",
      });
      return;
    }
    let live = true;
    listAlerts()
      .then((alerts) => live && setState({ alerts, note: null }))
      .catch(() => live && setState({ alerts: [], note: "Couldn't load your alerts just now." }));
    return () => {
      live = false;
    };
  }, []);
  return state;
}

function AlertsTile() {
  const { alerts, note } = useDeviceAlerts();
  return (
    <Tile href="/dashboard/alerts" icon={BellIcon} title="Job alerts" count={alerts?.length || undefined} action="Manage alerts">
      {alerts === null ? (
        <div className="grid gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : alerts.length === 0 ? (
        <p className="text-muted-foreground">{note ?? "None on this device. Search or filter on Jobs, then press “Get alerts”."}</p>
      ) : (
        <ul className="grid gap-2">
          {alerts.slice(0, 3).map((alert) => (
            <li key={alert.id} className="flex items-center justify-between gap-3">
              <span className="truncate">{alert.label}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{alert.frequency === "daily" ? "Daily" : "Hourly"}</span>
            </li>
          ))}
          {alerts.length > 3 && <li className="text-muted-foreground">and {alerts.length - 3} more</li>}
        </ul>
      )}
    </Tile>
  );
}

function AccountTile() {
  const profile = useProfile();
  if (!profile) return null;
  return (
    <Tile href="/dashboard/account" icon={UserRoundIcon} title="Account" action="Manage account">
      <div className="flex items-center gap-3">
        <Avatar profile={profile} className="size-10 text-sm" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{profile.name ?? "Signed in"}</p>
          <p className="truncate text-muted-foreground">Signed in with Google</p>
        </div>
      </div>
    </Tile>
  );
}

function RecentlyUpdated({ jobs }: { jobs: TrackedJob[] }) {
  if (jobs.length === 0) return null;
  return (
    <section className="min-w-0">
      <div className="mb-3 flex items-end justify-between gap-4">
        <h2 className="text-xl font-bold tracking-tight">Recently updated</h2>
        <Link
          href="/dashboard/jobs"
          className="rounded-md text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          All saved jobs
        </Link>
      </div>
      <ul className="divide-y rounded-2xl border">
        {jobs.slice(0, 5).map((job) => (
          <li
            key={job.key}
            className="relative flex items-center gap-3 px-4 py-3 transition-colors duration-150 first:rounded-t-2xl last:rounded-b-2xl hover:bg-muted/40 has-[a:focus-visible]:bg-muted/40"
          >
            <CompanyLogo name={job.companyName} domain={job.domain} size="md" className="size-9 rounded-lg" />
            <div className="min-w-0 flex-1">
              <Link
                href={jobPath({ company: job.company, id: job.id, title: job.title })}
                className="block truncate font-semibold outline-none after:absolute after:inset-0 after:content-['']"
              >
                {job.title}
              </Link>
              <p className="truncate text-sm text-muted-foreground">
                {job.companyName}
                {job.location && ` · ${job.location}`}
              </p>
            </div>
            <span className="shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold">{TRACK_STATUSES[job.status]}</span>
            <RelativeTime iso={job.updatedAt} className="hidden w-24 shrink-0 text-right text-xs text-muted-foreground sm:block" />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The dashboard's first screen: a look at each of the others. */
export function DashboardOverview() {
  const profile = useProfile();
  const jobs = useTrackedJobs();
  const slugs = useSavedSlugs();
  const firstName = profile?.name?.split(/\s+/)[0];

  return (
    <div className="grid grid-cols-1 gap-10">
      <ScreenHeading title={firstName ? `Hi, ${firstName}` : "Your dashboard"} detail={<SyncStatus />} className="mb-0" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <JobsTile jobs={jobs} />
        <CompaniesTile slugs={slugs} />
        <AlertsTile />
        <AccountTile />
      </div>
      <RecentlyUpdated jobs={jobs} />
    </div>
  );
}
