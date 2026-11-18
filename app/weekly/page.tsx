import type { Metadata } from "next";
import Link from "next/link";
import { getWeeklyReports } from "@/lib/data/weekly";
import { DEFAULT_OG_IMAGE, OG_BASE } from "@/lib/site";
import { weekLabel, weeklyPath } from "@/lib/weekly";

const number = new Intl.NumberFormat("en");
const title = "Weekly reports on remote tech hiring";
const description = "Every week: how many remote roles opened and closed, who hired most, what kind of work and the best-paid new roles.";

export async function generateMetadata(): Promise<Metadata> {
  const reports = await getWeeklyReports();
  return {
    title,
    description,
    alternates: { canonical: "/weekly" },
    openGraph: { ...OG_BASE, title, description, url: "/weekly", images: [DEFAULT_OG_IMAGE] },
    // Nothing to index until the first week is done.
    ...(reports.length === 0 && { robots: { index: false } }),
  };
}

export default async function WeeklyReportsPage() {
  const reports = await getWeeklyReports();
  return (
    <div className="mx-auto max-w-3xl pb-12">
      <header className="px-4 pt-6 pb-5 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">Weekly reports</h1>
        <p className="mt-2 max-w-[36rem] leading-relaxed text-foreground/85">{description}</p>
      </header>
      {reports.length === 0 ? (
        <p className="mx-4 rounded-2xl border border-dashed px-5 py-8 text-center text-muted-foreground sm:mx-6">
          The first report comes out on Monday, Nov 24, once a full week has been recorded.
        </p>
      ) : (
        <ul className="divide-y border-y sm:mx-6 sm:rounded-2xl sm:border">
          {reports.map((report) => (
            <li
              key={report.key}
              className="relative px-4 py-3.5 transition-colors duration-150 hover:bg-muted/60 has-[a:focus-visible]:bg-muted/60 sm:px-5"
            >
              <h2 className="font-semibold">
                <Link
                  href={weeklyPath(report.key)}
                  className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline"
                >
                  Week of {weekLabel(report)}
                </Link>
              </h2>
              <p className="text-sm text-muted-foreground">
                {number.format(report.opened)} roles opened · {number.format(report.closed)} closed
                {report.openAtEnd !== null && <> · {number.format(report.openAtEnd)} open at the end</>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
