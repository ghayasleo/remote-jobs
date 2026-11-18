import Link from "next/link";
import { CookieChoicesButton } from "@/components/analytics/cookie-choices-button";
import { Wordmark } from "@/components/brand/logo";
import { UPSTREAM_REPO_URL } from "@/lib/data/companies";
import { topicCopy, topicPath, type Topic } from "@/lib/landing";
import { MAKER } from "@/lib/maker";
import { MAIN_ITEMS, MORE_ITEMS } from "./nav-items";

type Group = { title: string; links: { href: string; label: string }[] };

const linkClass = "text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground hover:underline";

// Big, stable region and stack pages, linked from every page. A fixed list:
// the footer is in every page's render, so it must not wait on live data.
const POPULAR: Topic[] = [
  { region: "worldwide" },
  { region: "europe" },
  { region: "americas" },
  { stack: "javascript" },
  { stack: "python" },
  { stack: "go" },
];

export function SiteFooter() {
  const groups: Group[] = [
    {
      title: "Find work",
      links: [
        ...MAIN_ITEMS.map(({ href, label }) => ({ href, label: href === "/jobs" ? "Remote jobs" : label })),
        { href: "/new", label: "New this week" },
      ],
    },
    {
      title: "Explore",
      links: MORE_ITEMS.filter(({ href }) => href !== "/new").map(({ href, label }) => ({ href, label })),
    },
    { title: "Popular", links: POPULAR.map((topic) => ({ href: topicPath(topic), label: topicCopy(topic).searchTitle })) },
  ];

  return (
    // Phones get the app-style tab bar and More sheet instead.
    <footer className="hidden border-t md:block">
      <div className="mx-auto grid max-w-6xl grid-cols-[1.3fr_repeat(3,1fr)] gap-x-6 px-6 pt-10 pb-8">
        <div className="max-w-xs">
          <Link href="/" className="-mx-1 inline-block rounded-lg px-1 py-1">
            <Wordmark />
          </Link>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Remote-friendly tech companies and the roles they’re hiring for. Companies from the community-run{" "}
            <a href={UPSTREAM_REPO_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:underline">
              remoteintech/remote-jobs
              <span className="sr-only"> (opens in a new tab)</span>
            </a>{" "}
            list, updated daily; open roles every hour.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Built by{" "}
            <a href={MAKER.portfolio} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:underline">
              {MAKER.name}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
          <CookieChoicesButton className={`mt-2 ${linkClass}`} />
        </div>
        <div className="col-span-3 grid grid-cols-3 gap-x-6">
          {groups.map(({ title, links }) => (
            <nav key={title} aria-label={title}>
              <h2 className="text-sm font-semibold">{title}</h2>
              <ul className="mt-3 space-y-2.5">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className={linkClass}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
    </footer>
  );
}
