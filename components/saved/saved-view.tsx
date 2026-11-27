"use client";

import { CloudIcon, CloudOffIcon, LaptopIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PillTabs, PillTabsContent, PillTabsList, PillTabsTrigger } from "@/components/ui/pill-tabs";
import { openSignIn, useProfile } from "@/lib/auth/client";
import { useSavedSlugs } from "@/lib/saved";
import { useSyncState } from "@/lib/sync";
import { useTrackedJobs } from "@/lib/tracker";
import { createUrlState } from "@/lib/url-state";
import { useHydrated } from "@/lib/use-hydrated";
import { SavedCompanies } from "./saved-companies";
import { TrackerView } from "./tracker-view";

const SIGN_IN_ENABLED = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

type Tab = "jobs" | "companies";
// ?tab=companies opens the companies list, and the address follows the tab.
const useTab = createUrlState<{ tab: Tab }>(
  (query) => ({ tab: new URLSearchParams(query).get("tab") === "companies" ? "companies" : "jobs" }),
  ({ tab }) => (tab === "companies" ? "?tab=companies" : ""),
  { tab: "jobs" },
);

function SyncLine() {
  const profile = useProfile();
  const sync = useSyncState();
  if (!SIGN_IN_ENABLED) return null;
  if (!profile) {
    return (
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <LaptopIcon className="size-4" aria-hidden />
        Kept on this device.
        <Button
          variant="link"
          className="h-auto p-0 text-sm"
          onClick={() => openSignIn("Sign in to keep your saved jobs and tracker on every device.")}
        >
          Sign in to sync it everywhere
        </Button>
      </p>
    );
  }
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
      {sync.status === "error" ? (
        <>
          <CloudOffIcon className="size-4" aria-hidden />
          Couldn&apos;t sync just now. Your changes are safe here and will sync when you&apos;re back online.
        </>
      ) : (
        <>
          <CloudIcon className="size-4" aria-hidden />
          {sync.status === "syncing" ? "Syncing with your account…" : "Synced with your account"}
        </>
      )}
    </p>
  );
}

/** /saved: the application tracker for jobs, and the shortlist of companies. */
export function SavedView() {
  const hydrated = useHydrated();
  const jobs = useTrackedJobs();
  const companies = useSavedSlugs();
  const [{ tab }, setState] = useTab();

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Saved</h1>
        {hydrated && <SyncLine />}
      </header>
      <PillTabs value={tab} onValueChange={(value) => setState({ tab: value as Tab })} className="mt-5">
        <PillTabsList aria-label="Saved jobs or companies">
          <PillTabsTrigger value="jobs">
            Jobs{hydrated && <span className="tabular-nums opacity-75">{jobs.length}</span>}
          </PillTabsTrigger>
          <PillTabsTrigger value="companies">
            Companies{hydrated && <span className="tabular-nums opacity-75">{companies.length}</span>}
          </PillTabsTrigger>
        </PillTabsList>
        <PillTabsContent value="jobs">{hydrated && <TrackerView />}</PillTabsContent>
        <PillTabsContent value="companies">
          <div className="-mx-4 max-w-3xl sm:-mx-6">
            <SavedCompanies embedded />
          </div>
        </PillTabsContent>
      </PillTabs>
    </div>
  );
}
