import type { Metadata } from "next";
import Link from "next/link";
import { FaqSection } from "@/components/faq-section";
import { SalaryList, SalaryStatTiles } from "@/components/salaries/salary-list";
import { getSalaryData } from "@/lib/data/salaries";
import { formatDate } from "@/lib/format";
import { byPay, salaryCategories, salaryFaqs, salaryPath, salaryStats, usd } from "@/lib/salaries";
import { DEFAULT_OG_IMAGE, OG_BASE } from "@/lib/site";

const TOP = 20;

export async function generateMetadata(): Promise<Metadata> {
  const { roles } = await getSalaryData();
  const stats = salaryStats(roles);
  const title = `Remote tech salaries: what ${roles.length} job postings pay`;
  const description = `The median remote tech job posting with a US-dollar range pays ${usd(stats.medianMin)}–${usd(stats.medianMax)} a year. Salaries by kind of work and the highest-paying remote roles right now, updated hourly.`;
  return { title, description, alternates: { canonical: "/salaries" }, openGraph: { ...OG_BASE, title, description, url: "/salaries", images: [DEFAULT_OG_IMAGE] } };
}

export default async function SalariesPage() {
  const { roles, remoteRoles, published, updatedAt } = await getSalaryData();
  const stats = salaryStats(roles);
  const categories = salaryCategories(roles);
  const top = [...roles].sort(byPay).slice(0, TOP);
  const asOf = formatDate(updatedAt);
  const faqs = salaryFaqs({ label: null, stats, top, categories, published, remoteRoles, asOf });

  return (
    <div className="mx-auto max-w-3xl pb-12">
      <header className="px-4 pt-6 pb-2 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">Remote tech salaries</h1>
        <p className="mt-2 max-w-[36rem] leading-relaxed text-foreground/85">{faqs[0].answer}</p>
        <SalaryStatTiles count={stats.count} low={usd(stats.medianMin)} high={usd(stats.medianMax)} />
        <p className="mt-2 text-xs text-muted-foreground">
          As of <time dateTime={updatedAt}>{asOf}</time>; open roles refresh every hour.
        </p>
      </header>

      <section aria-labelledby="by-kind" className="mt-10">
        <h2 id="by-kind" className="px-4 pb-3 text-lg font-bold tracking-tight sm:px-6">
          By kind of work
        </h2>
        <ul className="divide-y border-y sm:mx-6 sm:rounded-2xl sm:border">
          {categories.map((category) => (
            <li key={category.key} className="relative flex items-center justify-between gap-4 px-4 py-3.5 transition-colors duration-150 hover:bg-muted/60 has-[a:focus-visible]:bg-muted/60 sm:px-5">
              <div className="min-w-0">
                <h3 className="font-semibold">
                  <Link
                    href={salaryPath(category.key)}
                    className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline"
                  >
                    {category.label}
                  </Link>
                </h3>
                <p className="text-sm text-muted-foreground">{category.count} published ranges</p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums">
                {usd(category.medianMin)}–{usd(category.medianMax)}
                <span className="block text-right text-xs font-normal text-muted-foreground">median range</span>
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="top" className="mt-10">
        <h2 id="top" className="px-4 pb-3 text-lg font-bold tracking-tight sm:px-6">
          Highest-paying remote roles right now
        </h2>
        <SalaryList roles={top} />
      </section>

      <div className="mt-10 space-y-8 px-4 sm:px-6">
        <FaqSection faqs={faqs} />
        <section className="rounded-2xl border p-5 text-sm leading-relaxed">
          <h2 className="text-base font-bold">How we count</h2>
          <p className="mt-2 max-w-[36rem] text-foreground/85">
            Only postings that give an annual range in US dollars are counted, because other currencies and hourly rates
            aren’t comparable. {published - stats.count > 0 && `${published - stats.count} more remote roles show pay in another way. `}
            Figures outside $15k–$1M a year are left out as likely mislabelled. Ranges come straight from the companies’ job
            boards, so they’re what the company advertises, not what people are paid.
          </p>
        </section>
      </div>
    </div>
  );
}
