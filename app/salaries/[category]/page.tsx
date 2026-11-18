import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FaqSection } from "@/components/faq-section";
import { BarChart } from "@/components/insights/bar-chart";
import { SalaryList, SalaryStatTiles } from "@/components/salaries/salary-list";
import { getSalaryData } from "@/lib/data/salaries";
import { formatDate } from "@/lib/format";
import { DEFAULT_JOB_PARAMS, JOB_CATEGORIES, JOB_CATEGORY_KEYS, serializeJobParams, type JobCategory } from "@/lib/jobs";
import { MIN_SALARY_ROLES, byPay, salaryBuckets, salaryCategories, salaryFaqs, salaryPath, salaryStats, usd } from "@/lib/salaries";
import { DEFAULT_OG_IMAGE, OG_BASE } from "@/lib/site";

const SHOWN = 50;
const isCategory = (value: string): value is JobCategory => (JOB_CATEGORY_KEYS as string[]).includes(value);

async function categoryData(slug: string) {
  if (!isCategory(slug)) return null;
  const data = await getSalaryData();
  const roles = data.roles.filter((role) => role.category === slug).sort(byPay);
  if (roles.length < MIN_SALARY_ROLES) return null;
  return { category: slug, label: JOB_CATEGORIES[slug], roles, all: data.roles, updatedAt: data.updatedAt };
}

export async function generateStaticParams() {
  const { roles } = await getSalaryData();
  const categories = salaryCategories(roles).map(({ key }) => ({ category: key }));
  // Cache Components needs at least one; without data it renders "not found".
  return categories.length > 0 ? categories : [{ category: "engineering" }];
}

export async function generateMetadata({ params }: PageProps<"/salaries/[category]">): Promise<Metadata> {
  const data = await categoryData((await params).category);
  if (!data) return { title: "Not found", robots: { index: false } };
  const stats = salaryStats(data.roles);
  const title = `Remote ${data.label.toLowerCase()} salaries: ${usd(stats.medianMin)}–${usd(stats.medianMax)} median range`;
  const description = `What ${stats.count} remote ${data.label.toLowerCase()} job postings with a US-dollar range pay right now, and the highest-paying ones. Updated hourly.`;
  const url = salaryPath(data.category);
  return { title, description, alternates: { canonical: url }, openGraph: { ...OG_BASE, title, description, url, images: [DEFAULT_OG_IMAGE] } };
}

export default async function CategorySalariesPage({ params }: PageProps<"/salaries/[category]">) {
  const data = await categoryData((await params).category);
  if (!data) notFound();
  const { roles, all, label, category, updatedAt } = data;
  const stats = salaryStats(roles);
  const asOf = formatDate(updatedAt);
  const faqs = salaryFaqs({ label, stats, top: roles, asOf });
  const others = salaryCategories(all).filter((other) => other.key !== category);
  const jobsHref = `/jobs${serializeJobParams({ ...DEFAULT_JOB_PARAMS, category: [category], pay: true })}`;

  return (
    <div className="mx-auto max-w-3xl pb-12">
      <nav aria-label="Breadcrumb" className="px-4 pt-4 sm:px-6">
        <Link href="/salaries" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
          All remote salaries
        </Link>
      </nav>
      <header className="px-4 pt-3 pb-2 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">Remote {label.toLowerCase()} salaries</h1>
        <p className="mt-2 max-w-[36rem] leading-relaxed text-foreground/85">{faqs[0].answer}</p>
        <SalaryStatTiles count={stats.count} low={usd(stats.medianMin)} high={usd(stats.medianMax)} />
        <p className="mt-2 text-xs text-muted-foreground">
          As of <time dateTime={updatedAt}>{asOf}</time>; open roles refresh every hour.
        </p>
      </header>

      <section aria-labelledby="spread" className="mt-10 px-4 sm:px-6">
        <h2 id="spread" className="text-lg font-bold tracking-tight">
          Where the ranges sit
        </h2>
        <p className="mt-0.5 mb-4 text-sm text-muted-foreground">Postings by the midpoint of their annual range.</p>
        <BarChart
          caption={`Remote ${label.toLowerCase()} postings by range midpoint`}
          rows={salaryBuckets(roles).map(({ label, count }) => ({ label, value: count }))}
          unit="postings"
        />
      </section>

      <section aria-labelledby="roles" className="mt-10">
        <h2 id="roles" className="px-4 pb-3 text-lg font-bold tracking-tight sm:px-6">
          Best-paid first
        </h2>
        <SalaryList roles={roles.slice(0, SHOWN)} />
        <p className="px-4 pt-4 sm:px-6">
          <Link href={jobsHref} className="font-medium text-primary underline underline-offset-4">
            See every {label.toLowerCase()} role that shows pay
          </Link>
        </p>
      </section>

      <div className="mt-10 space-y-8 px-4 sm:px-6">
        <FaqSection faqs={faqs} />
        {others.length > 0 && (
          <section aria-labelledby="other-kinds">
            <h2 id="other-kinds" className="text-base font-bold tracking-tight">
              Other kinds of work
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {others.map((other) => (
                <li key={other.key}>
                  <Link
                    href={salaryPath(other.key)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    {other.label}
                    <span className="text-muted-foreground tabular-nums">{usd(other.medianMid)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
