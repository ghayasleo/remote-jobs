import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { BrandMark } from "@/components/brand/logo";
import { InstallApp } from "@/components/install-app";
import { Button } from "@/components/ui/button";
import { UPSTREAM_REPO_URL } from "@/lib/data/companies";
import { getExploreData } from "@/lib/data/explore-data";
import { BOARD_COUNT } from "@/lib/data/job-boards";

export const metadata: Metadata = {
  title: "About",
  description: "Where Remote Jobs gets its data, how live roles work, and how to add a company.",
  alternates: { canonical: "/about" },
};

function External({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-4">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t pt-6">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      <div className="mt-2 max-w-[36rem] space-y-3 leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

export default async function AboutPage() {
  const { companies, hiring } = await getExploreData();
  const hiringNow = Object.keys(hiring).length;

  return (
    <div className="mx-auto max-w-2xl px-4 pt-8 pb-12 sm:px-6">
      <BrandMark className="size-14" />
      <h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">About Remote Jobs</h1>
      <p className="mt-3 max-w-[34rem] text-lg leading-relaxed text-foreground/90">
        Remote Jobs helps you find tech companies that hire remotely: where they hire, what they build with, and who’s
        hiring right now. No sign-up, no ads, no noise.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button asChild className="h-11 rounded-full px-5">
          <Link href="/?hiring=true">See who’s hiring</Link>
        </Button>
        <Button asChild variant="outline" className="h-11 rounded-full px-5">
          <Link href="/">Explore all {companies.length}</Link>
        </Button>
        <Button asChild variant="ghost" className="h-11 rounded-full px-5">
          <Link href="/remote">Browse by stack and region</Link>
        </Button>
      </div>

      <div className="mt-10 space-y-8">
        <Section title="Where the data comes from">
          <p>
            Company profiles come from <External href={UPSTREAM_REPO_URL}>remoteintech/remote-jobs</External>, a
            community-maintained list of {companies.length} remote-friendly tech companies. We pick up changes every
            day.
          </p>
          <p>
            Open roles come straight from the job boards companies use (Greenhouse, Lever, Ashby, Workable and
            Recruitee) and refresh every hour. We only connect a board to a company when it’s linked from the
            company’s own careers pages, or the board carries the company’s exact name, so roles are never guessed.
            Right now that covers {BOARD_COUNT} companies, {hiringNow} of them hiring.
          </p>
          <p>
            Logos come from Google’s favicon service, fetched by our server, so your browser never talks to Google.
          </p>
        </Section>

        <Section title="Add or fix a company">
          <p>
            The list lives on GitHub and anyone can improve it. If a company is missing or a profile is out of date,{" "}
            <External href={`${UPSTREAM_REPO_URL}/blob/main/CONTRIBUTING.md`}>add or edit it there</External>, and it
            shows up here within a day of being merged.
          </p>
        </Section>

        <Section title="The numbers">
          <p>
            <Link href="/insights" className="font-medium text-primary underline underline-offset-4">
              State of remote hiring
            </Link>{" "}
            shows who’s hiring the most, what kind of work is remote, where companies hire and how many listings show pay,
            updated every hour.
          </p>
        </Section>

        <Section title="Follow new roles">
          <p>
            <Link href="/new" className="font-medium text-primary underline underline-offset-4">New this week</Link> lists
            the freshest remote roles. Feed readers can follow{" "}
            <a href="/feeds/jobs.xml" className="font-medium text-primary underline underline-offset-4">new roles</a> and{" "}
            <a href="/feeds/companies.xml" className="font-medium text-primary underline underline-offset-4">new companies</a>.
          </p>
        </Section>

        <Section title="Use it like an app">
          <InstallApp />
        </Section>

        <Section title="Your privacy">
          <p>
            There are no accounts. Saved companies stay in this browser and are never sent anywhere. We count visits
            with Vercel’s cookie-free analytics, and that’s it.
          </p>
        </Section>

        <Section title="Credits">
          <p>
            Built by <External href="https://github.com/ghayasleo">Ghayas</External>, on top of the work of everyone
            who contributes to <External href="https://github.com/remoteintech">remoteintech</External>.
          </p>
          <a
            href="https://github.com/ghayasleo/remote-jobs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Source code on GitHub <ArrowUpRightIcon className="size-4" aria-hidden />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </Section>
      </div>
    </div>
  );
}
