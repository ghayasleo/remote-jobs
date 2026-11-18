import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart } from "@/components/insights/bar-chart";
import { SalaryList } from "@/components/salaries/salary-list";
import { getWeeklyReport, getWeeklyReports, type WeeklyPage } from "@/lib/data/weekly";
import { formatDate } from "@/lib/format";
import type { SalaryRole } from "@/lib/salaries";
import { DEFAULT_OG_IMAGE, OG_BASE, absoluteUrl, jsonLd } from "@/lib/site";
import { HISTORY_START, weekLabel, weeklyPath } from "@/lib/weekly";

const number = new Intl.NumberFormat("en");

export async function generateStaticParams() {
  const reports = await getWeeklyReports();
  // Cache Components needs at least one; before the first report this renders "not found".
  return reports.length > 0 ? reports.map((report) => ({ week: report.key })) : [{ week: "2026-w47" }];
}

function summary(report: WeeklyPage) {
  const change =
    report.openAtStart !== null && report.openAtEnd !== null
      ? `, taking open remote roles from ${number.format(report.openAtStart)} to ${number.format(report.openAtEnd)}`
      : "";
  return `${number.format(report.opened)} remote roles opened and ${number.format(report.closed)} closed in the week of ${weekLabel(report)}${change}.`;
}

export async function generateMetadata({ params }: PageProps<"/weekly/[week]">): Promise<Metadata> {
  const report = await getWeeklyReport((await params).week);
  if (!report) return { title: "Not found", robots: { index: false } };
  const title = `Remote hiring, week of ${weekLabel(report)}`;
  const description = summary(report);
  const url = weeklyPath(report.key);
  return { title, description, alternates: { canonical: url }, openGraph: { ...OG_BASE, title, description, url, images: [DEFAULT_OG_IMAGE] } };
}

export default async function WeeklyReportPage({ params }: PageProps<"/weekly/[week]">) {
  const key = (await params).week;
  const [report, reports] = await Promise.all([getWeeklyReport(key), getWeeklyReports()]);
  if (!report) notFound();
  const index = reports.findIndex((other) => other.key === key);
  const newer = index > 0 ? reports[index - 1] : null;
  const older = index >= 0 ? reports[index + 1] ?? null : null;
  const title = `Remote hiring, week of ${weekLabel(report)}`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: summary(report),
    datePublished: report.end,
    url: absoluteUrl(weeklyPath(report.key)),
    isBasedOn: "https://github.com/ghayasleo/remote-jobs/tree/data/history",
  };

  return (
    <article className="mx-auto max-w-3xl pb-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <nav aria-label="Breadcrumb" className="px-4 pt-4 sm:px-6">
        <Link href="/weekly" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
          All weekly reports
        </Link>
      </nav>
      <header className="px-4 pt-3 pb-2 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-[36rem] leading-relaxed text-foreground/85">
          {summary(report)}
          {report.partial && <> Recording started on {formatDate(HISTORY_START)}, so this week starts there.</>}
        </p>
        <dl className="mt-5 grid max-w-md grid-cols-3 gap-px overflow-hidden rounded-2xl border bg-border text-center">
          {[
            ["Opened", report.opened],
            ["Closed", report.closed],
            ["Open at the end", report.openAtEnd ?? 0],
          ].map(([term, value]) => (
            <div key={term} className="bg-card px-3 py-3">
              <dd className="text-xl font-bold tabular-nums">{number.format(Number(value))}</dd>
              <dt className="text-xs text-muted-foreground">{term}</dt>
            </div>
          ))}
        </dl>
      </header>

      <div className="mt-10 space-y-10 px-4 sm:px-6">
        {report.topCompanies.length > 0 && (
          <section aria-labelledby="hirers">
            <h2 id="hirers" className="mb-4 text-lg font-bold tracking-tight">
              Who opened the most remote roles
            </h2>
            <BarChart
              caption="Companies by remote roles opened this week"
              rows={report.topCompanies.map((company) => ({
                label: company.name,
                value: company.count,
                href: `/company-profiles/${company.slug}`,
              }))}
              unit="roles opened"
            />
          </section>
        )}
        {report.categories.length > 0 && (
          <section aria-labelledby="kinds">
            <h2 id="kinds" className="mb-4 text-lg font-bold tracking-tight">
              What kind of work
            </h2>
            <BarChart
              caption="Remote roles opened this week by kind of work"
              rows={report.categories.map((category) => ({ label: category.label, value: category.count }))}
              unit="roles opened"
            />
          </section>
        )}
      </div>

      {report.bestPaid.length > 0 && (
        <section aria-labelledby="best-paid" className="mt-10">
          <h2 id="best-paid" className="px-4 pb-3 text-lg font-bold tracking-tight sm:px-6">
            Best-paid new roles
          </h2>
          <SalaryList roles={report.bestPaid as SalaryRole[]} />
        </section>
      )}

      <div className="mt-10 space-y-8 px-4 sm:px-6">
        {report.newCompanies.length > 0 && (
          <section aria-labelledby="new-companies">
            <h2 id="new-companies" className="text-base font-bold tracking-tight">
              New on the list
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {report.newCompanies.map((company) => (
                <li key={company.slug}>
                  <Link
                    href={`/company-profiles/${company.slug}`}
                    className="inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    {company.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <nav aria-label="Other weeks" className="flex flex-wrap justify-between gap-3 border-t pt-5 text-sm">
          {older ? (
            <Link href={weeklyPath(older.key)} className="font-medium text-primary underline underline-offset-4">
              ← Week of {weekLabel(older)}
            </Link>
          ) : (
            <span />
          )}
          {newer && (
            <Link href={weeklyPath(newer.key)} className="font-medium text-primary underline underline-offset-4">
              Week of {weekLabel(newer)} →
            </Link>
          )}
        </nav>
        <p className="text-sm text-muted-foreground">
          Counted from the{" "}
          <a
            href="https://github.com/ghayasleo/remote-jobs/tree/data/history"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline underline-offset-4"
          >
            daily hiring history
          </a>
          , which anyone can download.
        </p>
      </div>
    </article>
  );
}
