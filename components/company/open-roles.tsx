import { ArrowUpRightIcon, BriefcaseIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OpenRoles as OpenRolesData } from "@/lib/data/job-boards";
import { RolesList } from "./roles-list";

function CareersLink({ href }: { href: string }) {
  return (
    <Button asChild className="h-11 rounded-full px-5">
      <a href={href} target="_blank" rel="noopener noreferrer">
        Visit careers page
        <ArrowUpRightIcon aria-hidden />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </Button>
  );
}

function Notice({ title, children, href }: { title: string; children: React.ReactNode; href: string | null }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-dashed p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-hiring text-hiring-foreground">
          <BriefcaseIcon className="size-5" aria-hidden />
        </span>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{children}</p>
        </div>
      </div>
      {href && <CareersLink href={href} />}
    </div>
  );
}

/**
 * Live openings when we know the company's job board; otherwise (or when the
 * board can't be reached) a clear way to their careers page.
 */
export function OpenRoles({
  roles,
  hasBoard,
  careersUrl,
  name,
}: {
  roles: OpenRolesData | null;
  hasBoard: boolean;
  careersUrl: string | null;
  name: string;
}) {
  if (roles && roles.total > 0) return <RolesList data={roles} />;

  if (roles) {
    return (
      <Notice title={`No open roles on ${roles.providerLabel} right now`} href={careersUrl ?? roles.boardUrl}>
        Save {name} and check back later. New roles show up here within the hour.
      </Notice>
    );
  }
  if (hasBoard) {
    return (
      <Notice title="Couldn’t load open roles just now" href={careersUrl}>
        Their job board didn’t answer. Their careers page has the latest openings.
      </Notice>
    );
  }
  return (
    <Notice title="Apply on their careers page" href={careersUrl}>
      We can’t list {name}’s openings here yet, because they don’t use a job board we can read.
    </Notice>
  );
}
