import {
  BanknoteIcon,
  BarChart3Icon,
  LayoutDashboardIcon,
  BotIcon,
  BriefcaseIcon,
  Building2Icon,
  FileCheckIcon,
  CompassIcon,
  GlobeIcon,
  InfoIcon,
  SparklesIcon,
  TrendingUpIcon,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; description?: string };

/** The tabs: always one tap away. */
export const MAIN_ITEMS: NavItem[] = [
  { href: "/jobs", label: "Jobs", icon: BriefcaseIcon },
  { href: "/companies", label: "Companies", icon: Building2Icon },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
];

/** Everything else, behind "More", in groups (and in the footer). */
export const MORE_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Find work",
    items: [
      { href: "/new", label: "New this week", icon: SparklesIcon, description: "The freshest remote roles" },
      { href: "/remote/in", label: "Jobs by country", icon: GlobeIcon, description: "Roles open to people where you live" },
      { href: "/remote", label: "Browse by stack & region", icon: CompassIcon, description: "Python in Europe, Go worldwide and more" },
    ],
  },
  {
    title: "The market",
    items: [
      { href: "/market", label: "Hiring market", icon: TrendingUpIcon, description: "Who’s hiring more, who’s slowing, and the news" },
      { href: "/salaries", label: "Remote salaries", icon: BanknoteIcon, description: "What remote roles pay, by kind of work" },
      { href: "/insights", label: "State of remote hiring", icon: BarChart3Icon, description: "Live numbers, updated every hour" },
    ],
  },
  {
    title: "More",
    items: [
      { href: "/ai", label: "Use with AI", icon: BotIcon, description: "Search these roles from Claude, ChatGPT and more" },
      { href: "/about", label: "About", icon: InfoIcon, description: "Where the data comes from" },
    ],
  },
];

/** The free CV check, given its own spot in the More menu. */
export const CV_CHECK: NavItem = {
  href: "/cv-check",
  label: "Free CV check",
  icon: FileCheckIcon,
  description: "How hiring systems read your CV, role by role",
};

export const MORE_ITEMS: NavItem[] = [CV_CHECK, ...MORE_GROUPS.flatMap((group) => group.items)];

const isCountryPage = (pathname: string) => pathname === "/remote/in" || pathname.startsWith("/remote/in/");

/** Which tab a page belongs to. Topic pages list companies; country pages list jobs. */
export function isActive(href: string, pathname: string) {
  if (href === "/companies") {
    return (
      pathname === "/companies" ||
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
