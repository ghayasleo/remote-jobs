"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellIcon,
  BookmarkCheckIcon,
  BriefcaseIcon,
  Building2Icon,
  KanbanSquareIcon,
  LayoutDashboardIcon,
  UserRoundIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { openSignIn, useProfile } from "@/lib/auth/client";
import { useSavedSlugs } from "@/lib/saved";
import { useTrackedJobs } from "@/lib/tracker";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";

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

const TABS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboardIcon },
  { href: "/dashboard/jobs", label: "Saved jobs", icon: BriefcaseIcon },
  { href: "/dashboard/companies", label: "Saved companies", icon: Building2Icon },
  { href: "/dashboard/alerts", label: "Job alerts", icon: BellIcon },
  { href: "/dashboard/account", label: "Account", icon: UserRoundIcon },
] as const;

function DashboardTabs() {
  const pathname = usePathname();
  const list = useRef<HTMLUListElement>(null);
  const counts: Partial<Record<(typeof TABS)[number]["href"], number>> = {
    "/dashboard/jobs": useTrackedJobs().length,
    "/dashboard/companies": useSavedSlugs().length,
  };

  // On a phone the tabs scroll sideways; keep the current one in view.
  useEffect(() => {
    list.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);

  return (
    <nav aria-label="Dashboard" className="-mx-4 border-b px-1 sm:mx-0 sm:px-0">
      <ul
        ref={list}
        className="flex scroll-px-3 overflow-x-auto [scrollbar-width:none] sm:-mx-3 [&::-webkit-scrollbar]:hidden"
      >
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          const count = counts[href];
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-12 items-center gap-2 rounded-lg px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
                  active &&
                    "text-foreground after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-foreground after:content-['']",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
                {count !== undefined && count > 0 && (
                  <span className="rounded-full bg-muted px-1.5 py-px text-xs font-semibold text-muted-foreground tabular-nums">
                    {count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * What every dashboard screen shares: a sign-in prompt when signed out, and
 * the tabs between screens when signed in. It sits inside the site's own
 * header and footer.
 */
export function DashboardFrame({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const profile = useProfile();

  if (!hydrated) return <div className="h-96" />;
  if (!profile) return <SignedOut />;

  return (
    <>
      <DashboardTabs />
      <div className="pt-8">{children}</div>
    </>
  );
}
