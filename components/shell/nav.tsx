"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRightIcon, ChevronDownIcon, ChevronRightIcon, EllipsisIcon, FileCheckIcon, LayoutDashboardIcon } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { openConsent } from "@/lib/consent";
import { ANALYTICS_ENABLED } from "@/lib/google-tags";
import { useSavedSlugs } from "@/lib/saved";
import { useTrackedJobs } from "@/lib/tracker";
import { useProfile } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { CV_CHECK, MAIN_ITEMS, MORE_GROUPS, MORE_ITEMS, isActive, isMoreActive, type NavItem } from "./nav-items";

// Detail screens (a company, a role) show their own action bar instead.
const hasActionBar = (pathname: string) =>
  /^\/(company-profiles\/[^/]+|jobs\/[^/]+\/[^/]+(\/[^/]+)?)\/?$/.test(pathname);

function SavedCount({ className }: { className?: string }) {
  const signedIn = useProfile() !== null;
  const saved = useSavedSlugs().length + useTrackedJobs().length;
  // Saved items belong to an account; signed out there's nothing to count.
  const count = signedIn ? saved : 0;
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

const desktopLink = (active: boolean) =>
  cn(
    "flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
    active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );

function ItemIcon({ icon: Icon }: Pick<NavItem, "icon">) {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

function MegaItem({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: () => void }) {
  const { href, label, icon: Icon, description } = item;
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className="flex gap-3 rounded-xl p-2.5 transition-colors duration-150 outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:bg-muted"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
          <Icon className="size-[1.125rem]" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{label}</span>
          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{description}</span>
        </span>
      </Link>
    </li>
  );
}

/**
 * "More" as a mega menu: every other page, in groups, in a panel as wide as
 * the header's content. Opens on hover (after a moment, so passing over it
 * doesn't) or on click; Escape, a click outside or picking a page closes it.
 */
function MoreMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const later = (next: boolean, delay: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(next), delay);
  };
  const close = () => {
    clearTimeout(timer.current);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      close();
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const hover = {
    onPointerEnter: (event: React.PointerEvent) => event.pointerType === "mouse" && later(true, 90),
    onPointerLeave: (event: React.PointerEvent) => event.pointerType === "mouse" && later(false, 180),
  };

  return (
    <div
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls="more-menu"
        onClick={() => {
          clearTimeout(timer.current);
          setOpen((value) => !value);
        }}
        {...hover}
        className={cn(desktopLink(open || isMoreActive(pathname)), "pr-3")}
      >
        More
        <ChevronDownIcon className={cn("size-4 transition-transform duration-200 ease-out-quart", open && "rotate-180")} aria-hidden />
      </button>
      {/* Positioned against the header's container, so it spans exactly its width. */}
      <div
        id="more-menu"
        inert={!open}
        {...hover}
        className={cn(
          "absolute inset-x-4 top-full z-(--z-nav) pt-2 transition-[opacity,translate] duration-200 ease-out-quart sm:inset-x-6 motion-reduce:transition-none",
          open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0",
        )}
      >
        <div className="grid grid-cols-[repeat(3,minmax(0,1fr))_minmax(15rem,17rem)] gap-6 rounded-2xl border bg-popover p-5 text-popover-foreground shadow-xl">
          {MORE_GROUPS.map((group) => (
            <section key={group.title} aria-labelledby={`more-${group.title}`} className="min-w-0">
              <p id={`more-${group.title}`} className="px-2.5 pb-2 text-xs font-semibold text-muted-foreground">
                {group.title}
              </p>
              <ul className="grid gap-0.5">
                {group.items.map((item) => (
                  <MegaItem key={item.href} item={item} active={isActive(item.href, pathname)} onNavigate={close} />
                ))}
              </ul>
            </section>
          ))}
          <Link
            href={CV_CHECK.href}
            onClick={close}
            className="group flex flex-col rounded-xl bg-secondary p-5 text-secondary-foreground outline-none transition-colors duration-150 hover:bg-secondary/80 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="grid size-10 place-items-center rounded-lg bg-background/70 text-foreground">
              <FileCheckIcon className="size-5" aria-hidden />
            </span>
            <span className="mt-4 font-bold">{CV_CHECK.label}</span>
            <span className="mt-1 flex-1 text-sm text-secondary-foreground/80">
              See how hiring systems read your CV for any role here. It&apos;s checked on your device and never uploaded.
            </span>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold">
              Check your CV
              <ArrowRightIcon className="size-4 transition-transform duration-200 ease-out-quart group-hover:translate-x-0.5" aria-hidden />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Links in the top bar, from tablet width up. The dashboard sits with the account, on the right. */
export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
      {MAIN_ITEMS.filter(({ href }) => href !== "/dashboard").map(({ href, label }) => {
        const active = isActive(href, pathname);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={desktopLink(active)}>
            {label}
          </Link>
        );
      })}
      <MoreMenu />
    </nav>
  );
}

/** The signed-in person's dashboard, next to their account menu (from tablet width up; phones have it in the tab bar). */
export function DashboardLink() {
  const pathname = usePathname();
  const profile = useProfile();
  if (!profile) return null;
  const active = isActive("/dashboard", pathname);
  return (
    <Link
      href="/dashboard"
      aria-current={active ? "page" : undefined}
      className={cn(desktopLink(active), "hidden px-3.5 md:flex")}
    >
      <LayoutDashboardIcon className="size-4" aria-hidden />
      Dashboard
      <SavedCount />
    </Link>
  );
}

function Tab({ active, icon: Icon, label, badge }: { active: boolean; icon: NavItem["icon"]; label: string; badge?: React.ReactNode }) {
  return (
    <>
      <span
        className={cn(
          "relative flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200 ease-out-quart",
          active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground group-active:bg-muted",
        )}
      >
        <Icon className="size-[1.375rem]" strokeWidth={active ? 2.4 : 2} aria-hidden />
        {badge}
      </span>
      <span className={active ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </>
  );
}

const tabClass = "group flex h-16 w-full flex-col items-center justify-center gap-1 text-xs font-medium outline-none";

/** App-style tab bar pinned to the bottom of the screen on phones. */
export function BottomNav() {
  const pathname = usePathname();
  if (hasActionBar(pathname)) return null;
  const moreActive = isMoreActive(pathname);
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-(--z-nav) border-t bg-background pb-safe md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {MAIN_ITEMS.map(({ href, label, icon }) => {
          const active = isActive(href, pathname);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={tabClass}>
                <Tab
                  active={active}
                  icon={icon}
                  label={label}
                  badge={href === "/dashboard" && <SavedCount className="absolute -top-1 right-1" />}
                />
              </Link>
            </li>
          );
        })}
        <li>
          <Drawer>
            <DrawerTrigger className={tabClass}>
              <Tab active={moreActive} icon={EllipsisIcon} label="More" />
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader className="text-left">
                <DrawerTitle className="text-lg">More</DrawerTitle>
                <DrawerDescription className="sr-only">Other pages on Remote Jobs</DrawerDescription>
              </DrawerHeader>
              <ul className="px-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                {MORE_ITEMS.map(({ href, label, icon, description }) => (
                  <li key={href}>
                    <DrawerClose asChild>
                      <Link
                        href={href}
                        aria-current={isActive(href, pathname) ? "page" : undefined}
                        className="flex items-center gap-3.5 rounded-2xl px-3 py-2.5 text-base transition-colors duration-150 hover:bg-muted focus-visible:bg-muted active:bg-muted aria-[current=page]:bg-muted"
                      >
                        <ItemIcon icon={icon} />
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">{label}</span>
                          <span className="block text-sm text-muted-foreground">{description}</span>
                        </span>
                        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      </Link>
                    </DrawerClose>
                  </li>
                ))}
                {ANALYTICS_ENABLED && (
                  <li className="px-3 pt-2">
                    <DrawerClose asChild>
                      <button type="button" onClick={openConsent} className="h-10 text-sm text-muted-foreground">
                        Cookie choices
                      </button>
                    </DrawerClose>
                  </li>
                )}
              </ul>
            </DrawerContent>
          </Drawer>
        </li>
      </ul>
    </nav>
  );
}
