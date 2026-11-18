import Link from "next/link";
import { BarChart3Icon, ChevronRightIcon, CompassIcon, GlobeIcon, SparklesIcon, type LucideIcon } from "lucide-react";

function DiscoverLink({ href, icon: Icon, children }: { href: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <li className="shrink-0">
      <Link
        href={href}
        className="flex h-10 items-center gap-2 rounded-full bg-secondary pr-3 pl-2.5 text-[13px] font-medium text-secondary-foreground transition-colors duration-150 outline-none hover:bg-secondary/70 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Icon className="size-4" aria-hidden />
        {children}
        <ChevronRightIcon className="size-4 opacity-70" aria-hidden />
      </Link>
    </li>
  );
}

/** Ways into the rest of the site, above the company list. */
export function DiscoverLinks({ newRoles }: { newRoles: number }) {
  return (
    <nav aria-label="Discover" className="mt-4">
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:px-0">
        <DiscoverLink href="/new" icon={SparklesIcon}>
          {newRoles > 0 ? `${newRoles} new roles this week` : "New this week"}
        </DiscoverLink>
        <DiscoverLink href="/remote/in" icon={GlobeIcon}>
          Jobs by country
        </DiscoverLink>
        <DiscoverLink href="/remote" icon={CompassIcon}>
          Browse by stack & region
        </DiscoverLink>
        <DiscoverLink href="/insights" icon={BarChart3Icon}>
          State of remote hiring
        </DiscoverLink>
      </ul>
    </nav>
  );
}
