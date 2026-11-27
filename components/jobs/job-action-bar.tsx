"use client";

import { ArrowUpRightIcon } from "lucide-react";
import { SaveJobButton } from "@/components/jobs/save-job-button";
import { ShareButton } from "@/components/company/share-button";
import { Button } from "@/components/ui/button";
import type { SavableJob } from "@/lib/tracker";

/** Phone-only bar on a role's page (it replaces the tab bar). */
export function JobActionBar({ job, applyUrl }: { job: SavableJob; applyUrl: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-(--z-nav) border-t bg-background pb-safe md:hidden">
      <div className="mx-auto flex h-16 max-w-md items-center gap-1 px-3">
        <SaveJobButton job={job} />
        <ShareButton name={`${job.title} at ${job.companyName}`} />
        <Button asChild className="ml-auto h-11 rounded-full px-6 text-[0.9375rem]">
          <a href={applyUrl} target="_blank" rel="noopener noreferrer">
            Apply
            <ArrowUpRightIcon aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </Button>
      </div>
    </div>
  );
}
