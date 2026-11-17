import Link from "next/link";
import { Wordmark } from "@/components/brand/logo";
import { UPSTREAM_REPO_URL } from "@/lib/data/companies";
import { getLandingTopics } from "@/lib/data/explore-data";
import { topicCopy, type Topic } from "@/lib/landing";
import { MAIN_ITEMS, MORE_ITEMS } from "./nav-items";

type Group = { title: string; links: { href: string; label: string }[]; className?: string };

const linkClass = "text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground hover:underline";

/** The busiest region and stack pages, so every page links to them. */
async function popularTopics() {
  const pages = await getLandingTopics();
  const top = (keep: (topic: Topic) => boolean) =>
    pages
      .filter(({ topic }) => keep(topic))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  const regions = top((topic) => !!topic.region && !topic.stack);
  const stacks = top((topic) => !!topic.stack && !topic.region);
  return [...regions, ...stacks].map(({ topic, path }) => ({ href: path, label: topicCopy(topic).searchTitle }));
}

export async function SiteFooter() {
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
    // Longer labels: the full width on phones.
    { title: "Popular", links: await popularTopics(), className: "col-span-2 sm:col-span-1" },
  ];

  return (
    <footer className="border-t pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-x-6 gap-y-8 px-4 pt-10 pb-8 sm:px-6 md:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Link href="/" className="-mx-1 inline-block rounded-lg px-1 py-1" aria-label="Remote Jobs, home">
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
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 md:col-span-3">
          {groups.map(({ title, links, className }) => (
            <nav key={title} aria-label={title} className={className}>
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
