"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookmarkIcon, CompassIcon, InfoIcon, type LucideIcon } from "lucide-react";
import { useSavedSlugs } from "@/lib/saved";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Explore", icon: CompassIcon },
  { href: "/saved", label: "Saved", icon: BookmarkIcon },
  { href: "/about", label: "About", icon: InfoIcon },
];

function useActive() {
  const pathname = usePathname();
  // Company pages belong to Explore.
  return (href: string) =>
    href === "/" ? pathname === "/" || pathname.startsWith("/company-profiles") : pathname.startsWith(href);
}

function SavedCount({ className }: { className?: string }) {
  const count = useSavedSlugs().length;
  if (count === 0) return null;
  return (
    <span
      className={cn(
        "grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[0.6875rem] leading-5 font-semibold text-primary-foreground tabular-nums",
        className,
      )}
    >
      {count}
      <span className="sr-only"> saved</span>
    </span>
  );
}

/** Links in the top bar, from tablet width up. */
export function DesktopNav() {
  const isActive = useActive();
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
      {NAV_ITEMS.map(({ href, label }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors duration-150",
              active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {label}
            {href === "/saved" && <SavedCount />}
          </Link>
        );
      })}
    </nav>
  );
}

/** App-style tab bar pinned to the bottom of the screen on phones. */
export function BottomNav() {
  const isActive = useActive();
  // Company pages show their own action bar here instead.
  if (usePathname().startsWith("/company-profiles/")) return null;
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-(--z-nav) border-t bg-background pb-safe md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="group flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium"
              >
                <span
                  className={cn(
                    "relative flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200 ease-out-quart",
                    active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground group-active:bg-muted",
                  )}
                >
                  <Icon className="size-[1.375rem]" strokeWidth={active ? 2.4 : 2} aria-hidden />
                  {href === "/saved" && <SavedCount className="absolute -top-1 right-1" />}
                </span>
                <span className={active ? "text-foreground" : "text-muted-foreground"}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
