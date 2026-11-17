import {
  BarChart3Icon,
  BookmarkIcon,
  BriefcaseIcon,
  Building2Icon,
  CompassIcon,
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
  { href: "/remote", label: "Browse by stack & region", icon: CompassIcon, description: "Python in Europe, Go worldwide and more" },
  { href: "/insights", label: "State of remote hiring", icon: BarChart3Icon, description: "Live numbers, updated every hour" },
  { href: "/about", label: "About", icon: InfoIcon, description: "Where the data comes from" },
];

/** Which tab a page belongs to. Landing pages are lists of companies. */
export function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/company-profiles") || pathname.startsWith("/remote");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const isMoreActive = (pathname: string) =>
  MORE_ITEMS.some(({ href }) => href !== "/remote" && isActive(href, pathname));
