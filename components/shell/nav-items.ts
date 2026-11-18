import {
  BarChart3Icon,
  BookmarkIcon,
  BriefcaseIcon,
  Building2Icon,
  CompassIcon,
  GlobeIcon,
  InfoIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; description?: string };

/** The tabs: always one tap away. */
export const MAIN_ITEMS: NavItem[] = [
  { href: "/", label: "Companies", icon: Building2Icon },
  { href: "/jobs", label: "Jobs", icon: BriefcaseIcon },
  { href: "/saved", label: "Saved", icon: BookmarkIcon },
];

/** Everything else, behind "More" (and in the footer). */
export const MORE_ITEMS: NavItem[] = [
  { href: "/new", label: "New this week", icon: SparklesIcon, description: "The freshest remote roles" },
  { href: "/remote/in", label: "Jobs by country", icon: GlobeIcon, description: "Roles open to people where you live" },
  { href: "/remote", label: "Browse by stack & region", icon: CompassIcon, description: "Python in Europe, Go worldwide and more" },
  { href: "/insights", label: "State of remote hiring", icon: BarChart3Icon, description: "Live numbers, updated every hour" },
  { href: "/about", label: "About", icon: InfoIcon, description: "Where the data comes from" },
];

const isCountryPage = (pathname: string) => pathname === "/remote/in" || pathname.startsWith("/remote/in/");

/** Which tab a page belongs to. Topic pages list companies; country pages list jobs. */
export function isActive(href: string, pathname: string) {
  if (href === "/") {
    return (
      pathname === "/" ||
      pathname.startsWith("/company-profiles") ||
      (pathname.startsWith("/remote") && !isCountryPage(pathname))
    );
  }
  if (href === "/jobs" && isCountryPage(pathname)) return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Browse and country pages light up their tab (Companies, Jobs), not More.
export const isMoreActive = (pathname: string) =>
  MORE_ITEMS.some(({ href }) => href !== "/remote" && href !== "/remote/in" && isActive(href, pathname));
