import type { Metadata } from "next";
import Link from "next/link";
import { FaqSection } from "@/components/faq-section";
import { BarChart, type BarRow } from "@/components/insights/bar-chart";
import { getLandingTopics } from "@/lib/data/explore-data";
import { getInsights } from "@/lib/data/insights";
import { getWeeklyReports } from "@/lib/data/weekly";
import { insightsFaqs } from "@/lib/insights";
import { regionLabels, remotePolicyLabels, techLabels, type Tech } from "@/lib/data/labels";
import { providerNames } from "@/lib/data/job-boards/providers";
import { formatDate } from "@/lib/format";
import { JOB_CATEGORIES } from "@/lib/jobs";
import { insightsDatasetJsonLd } from "@/lib/seo";
import { DEFAULT_OG_IMAGE, OG_BASE, absoluteUrl, jsonLd } from "@/lib/site";

const number = new Intl.NumberFormat("en");
const percent = new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: 0 });
const usd = new Intl.NumberFormat("en", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 0 });
const month = (iso: string) => new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(iso));
const share = (part: number, whole: number) => percent.format(whole ? part / whole : 0);

export async function generateMetadata(): Promise<Metadata> {
  const insights = await getInsights();
  const title = `State of remote tech hiring, ${month(insights.updatedAt)}`;
  const description = `${number.format(insights.remoteRoles)} open remote roles at ${insights.hiringCompanies} companies: who's hiring most, what kind of work is remote, where companies hire, and pay transparency. Updated hourly.`;
  return { title, description, alternates: { canonical: "/insights" }, openGraph: { ...OG_BASE, title, description, url: "/insights", images: [DEFAULT_OG_IMAGE] } };
}

function Section({ title, takeaway, children }: { title: string; takeaway: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-t pt-6">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      <p className="mt-1 mb-4 max-w-[36rem] text-foreground/85">{takeaway}</p>
      {children}
    </section>
  );
}

export default async function InsightsPage() {
  const [insights, landing, reports] = await Promise.all([getInsights(), getLandingTopics(), getWeeklyReports()]);
  const pages = new Set(landing.map((page) => page.path));
  const { topCompanies, categories, regions, policies, stacks, pay } = insights;

  const topTen = topCompanies.reduce((sum, company) => sum + company.remote, 0);
  const companyRows: BarRow[] = topCompanies.map((company) => ({
    label: company.name,
    value: company.remote,
    href: `/company-profiles/${company.slug}`,
    detail: `${company.remote} of ${company.total} open roles are remote`,
  }));
  const categoryRows: BarRow[] = categories.map(({ key, count }) => ({
    label: JOB_CATEGORIES[key],
    value: count,
    href: key === "other" ? "/jobs" : `/jobs?category=${key}`,
    detail: `${share(count, insights.remoteRoles)} of open remote roles`,
  }));
  const regionRows: BarRow[] = regions.map(({ key, count, hiring }) => ({
    label: regionLabels[key],
    value: count,
    href: pages.has(`/remote/${key}`) ? `/remote/${key}` : undefined,
    detail: `${hiring} of them hiring right now`,
  }));
  const policyRows: BarRow[] = policies.map(({ key, count }) => ({
    label: remotePolicyLabels[key],
    value: count,
    href: `/companies?policy=${key}`,
    detail: `${share(count, insights.companies)} of companies`,
  }));
  const stackRows: BarRow[] = stacks.map(({ key, count }) => ({
    label: techLabels[key as Tech],
    value: count,
    href: pages.has(`/remote/${key}`) ? `/remote/${key}` : undefined,
    detail: `${count} of ${insights.hiringCompanies} companies hiring now`,
  }));

  const worldwide = regions.find((region) => region.key === "worldwide")?.count ?? 0;
  const fullyRemote = policies.find((policy) => policy.key === "fully-remote")?.count ?? 0;
  const hybrid = policies.find((policy) => policy.key === "hybrid")?.count ?? 0;
  const [first, second, third] = categories;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-12 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(insightsDatasetJsonLd(insights, insights.updatedAt))} />
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">State of remote hiring</h1>
      <p className="mt-2 max-w-[36rem] leading-relaxed text-foreground/85">
        Live numbers from {number.format(insights.companies)} remote-friendly tech companies and the job boards they hire
        through. Updated every hour; last updated <time dateTime={insights.updatedAt}>{formatDate(insights.updatedAt)}</time>.
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-4">
        {[
          ["Companies tracked", number.format(insights.companies)],
          ["Hiring right now", number.format(insights.hiringCompanies)],
          ["Open remote roles", number.format(insights.remoteRoles)],
          ["Of all open roles, remote", share(insights.remoteRoles, insights.allRoles)],
        ].map(([term, value]) => (
          <div key={term} className="bg-card px-4 py-3">
            <dt className="text-xs text-muted-foreground">{term}</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-10 space-y-10">
        <Section
          title="Who’s hiring the most remote roles"
          takeaway={
            topCompanies[0] && (
              <>
                {topCompanies[0].name} leads with {topCompanies[0].remote} remote roles. These ten companies account for{" "}
                {share(topTen, insights.remoteRoles)} of all open remote roles.
              </>
            )
          }
        >
          <BarChart caption="Companies with the most open remote roles" rows={companyRows} unit="remote roles" />
        </Section>

        {first && (
          <Section
            title="What kind of work is remote"
            takeaway={
              <>
                {JOB_CATEGORIES[first.key]} is the biggest group ({share(first.count, insights.remoteRoles)} of remote roles)
                {second && <>, followed by {JOB_CATEGORIES[second.key]}</>}
                {third && <> and {JOB_CATEGORIES[third.key]}</>}.
              </>
            }
          >
            <BarChart caption="Open remote roles by kind of work" rows={categoryRows} unit="remote roles" />
          </Section>
        )}

        <Section
          title="Where companies hire"
          takeaway={<>{share(worldwide, insights.companies)} of companies on the list hire worldwide.</>}
        >
          <BarChart caption="Companies by where they hire" rows={regionRows} unit="companies" />
        </Section>

        <Section
          title="How remote they are"
          takeaway={
            <>
              {share(fullyRemote, insights.companies)} are fully remote; {share(hybrid, insights.companies)} are hybrid.
            </>
          }
        >
          <BarChart caption="Companies by remote policy" rows={policyRows} unit="companies" />
        </Section>

        <Section
          title="Stacks at companies hiring now"
          takeaway={
            stacks[0] && (
              <>
                {techLabels[stacks[0].key as Tech]} is the most common stack among the {insights.hiringCompanies} companies
                hiring right now.
              </>
            )
          }
        >
          <BarChart caption="Tech stacks at companies hiring now" rows={stackRows} unit="companies" />
        </Section>

        <Section
          title="Pay transparency"
          takeaway={
            <>
              {number.format(pay.published)} of {number.format(insights.remoteRoles)} remote roles (
              {percent.format(pay.share)}) show pay on the listing.
              {pay.annualUsd.count >= 20 && pay.annualUsd.medianMin && pay.annualUsd.medianMax && (
                <>
                  {" "}
                  Among the {pay.annualUsd.count} with an annual US-dollar range, the median range is{" "}
                  {usd.format(pay.annualUsd.medianMin)}–{usd.format(pay.annualUsd.medianMax)}.
                </>
              )}
            </>
          }
        >
          <p className="text-sm text-muted-foreground">
            Many companies only publish pay where the law asks them to, so these numbers lean towards US-based roles.{" "}
            <Link href="/salaries" className="font-medium text-primary underline underline-offset-4">
              See salaries by kind of work
            </Link>
            .
          </p>
        </Section>

        <FaqSection faqs={insightsFaqs(insights, insights.updatedAt)} />

        <section className="rounded-2xl border p-5 text-sm leading-relaxed">
          <h2 className="text-base font-bold">How we count</h2>
          <p className="mt-2 max-w-[36rem] text-foreground/85">
            Companies come from the community-run remoteintech/remote-jobs list. Open roles are read hourly from the public
            job boards of the companies that use {providerNames("or")}; a role counts as remote when the board says so or
            its location does. Talent pools, general applications and test postings are left out, and a role posted more
            than once, or once per country, counts once.
          </p>
          <p className="mt-3 max-w-[36rem] text-foreground/85">
            You’re welcome to quote these numbers. Please link to{" "}
            <Link href="/insights" className="font-medium text-primary underline underline-offset-4">
              {absoluteUrl("/insights")}
            </Link>
            . The{" "}
            <a
              href="https://github.com/ghayasleo/remote-jobs/tree/data/history"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-4"
            >
              daily history
            </a>{" "}
            behind them is free to download
            {reports.length > 0 && (
              <>
                , and{" "}
                <Link href="/weekly" className="font-medium text-primary underline underline-offset-4">
                  weekly reports
                </Link>{" "}
                sum up each week
              </>
            )}
            .
          </p>
        </section>
      </div>
    </div>
  );
}
