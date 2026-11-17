"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDownIcon, ChevronRightIcon, EllipsisIcon } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSavedSlugs } from "@/lib/saved";
import { cn } from "@/lib/utils";
import { MAIN_ITEMS, MORE_ITEMS, isActive, isMoreActive, type NavItem } from "./nav-items";

// Detail screens (a company, a role) show their own action bar instead.
const hasActionBar = (pathname: string) =>
  /^\/(company-profiles\/[^/]+|jobs\/[^/]+\/[^/]+(\/[^/]+)?)\/?$/.test(pathname);

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

/** Links in the top bar, from tablet width up. */
export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
      {MAIN_ITEMS.map(({ href, label }) => {
        const active = isActive(href, pathname);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={desktopLink(active)}>
            {label}
            {href === "/saved" && <SavedCount />}
          </Link>
        );
      })}
      <DropdownMenu>
        <DropdownMenuTrigger className={cn(desktopLink(isMoreActive(pathname)), "pr-3")}>
          More
          <ChevronDownIcon className="size-4" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-76 rounded-2xl p-1.5">
          {MORE_ITEMS.map(({ href, label, icon, description }) => (
            <DropdownMenuItem key={href} asChild className="gap-3 rounded-xl px-2 py-2">
              <Link href={href} aria-current={isActive(href, pathname) ? "page" : undefined}>
                <ItemIcon icon={icon} />
                <span className="min-w-0">
                  <span className="block font-semibold">{label}</span>
                  <span className="block text-xs text-muted-foreground">{description}</span>
                </span>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
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
                  badge={href === "/saved" && <SavedCount className="absolute -top-1 right-1" />}
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
              </ul>
            </DrawerContent>
          </Drawer>
        </li>
      </ul>
    </nav>
  );
}
