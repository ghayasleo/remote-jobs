import type { Metadata } from "next";
import Link from "next/link";
import { getLandingTopics } from "@/lib/data/explore-data";
import { techLabels } from "@/lib/data/labels";
import { REGION_FILTERS } from "@/lib/explore";
import { topicCopy } from "@/lib/landing";

export const metadata: Metadata = {
  title: "Browse remote tech companies by stack and region",
  description:
    "Remote-friendly tech companies grouped by where they hire and what they build with, from Python in Europe to React worldwide.",
  alternates: { canonical: "/remote" },
};

type Page = Awaited<ReturnType<typeof getLandingTopics>>[number];

function Links({ title, hint, pages, name }: { title: string; hint?: string; pages: Page[]; name: (page: Page) => string }) {
  return (
    <section>
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
      <ul className="mt-3 flex flex-wrap gap-2">
        {pages.map((page) => (
          <li key={page.path}>
            <Link
              href={page.path}
              className="inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors hover:bg-muted"
            >
              {name(page)}
              <span className="text-muted-foreground tabular-nums">{page.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function BrowsePage() {
  const pages = await getLandingTopics();
  const regions = pages.filter((page) => page.topic.region && !page.topic.stack);
  const stacks = pages.filter((page) => page.topic.stack && !page.topic.region).sort((a, b) => b.count - a.count);
  const combos = pages.filter((page) => page.topic.region && page.topic.stack).sort((a, b) => b.count - a.count).slice(0, 24);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-12 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Browse remote tech companies</h1>
      <p className="mt-2 max-w-[36rem] leading-relaxed text-foreground/85">
        Pick where you’re based or what you build with. Every page lists the companies and who’s hiring right now.
      </p>
      <div className="mt-8 space-y-9">
        <Links
          title="By where you’re based"
          hint="Each includes companies that hire worldwide."
          pages={regions}
          name={(page) => REGION_FILTERS[page.topic.region!].label}
        />
        <Links title="By tech stack" pages={stacks} name={(page) => techLabels[page.topic.stack!]} />
        <Links
          title="Popular combinations"
          pages={combos}
          name={(page) => `${techLabels[page.topic.stack!]} · ${topicCopy(page.topic).place === "anywhere" ? "Worldwide" : topicCopy(page.topic).place}`}
        />
      </div>
    </div>
  );
}
