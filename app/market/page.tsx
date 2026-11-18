import type { Metadata } from "next";
import Link from "next/link";
import { CompanyLogo } from "@/components/company/company-logo";
import { Tag } from "@/components/company/chips";
import { FaqSection } from "@/components/faq-section";
import { BarChart } from "@/components/insights/bar-chart";
import { MomentumChip } from "@/components/market/momentum-chip";
import { Sparkline } from "@/components/market/sparkline";
import { getMarket, type Market } from "@/lib/data/market";
import { getWeeklyReports } from "@/lib/data/weekly";
import { formatDate } from "@/lib/format";
import { marketFaqs } from "@/lib/market-faqs";
import { MOMENTUM } from "@/lib/momentum";
import { NEWS_TAGS } from "@/lib/news";
import { DEFAULT_OG_IMAGE, OG_BASE } from "@/lib/site";

const number = new Intl.NumberFormat("en");

export async function generateMetadata(): Promise<Metadata> {
  const market = await getMarket();
  const title = "Remote hiring market: who’s hiring more, who’s slowing down";
  const description = `${number.format(market.remoteRoles)} open remote tech roles at ${market.hiringCompanies} companies, ${number.format(market.posted7)} posted in the last 7 days. Which companies are heating up, cooling down or paused, and the latest news. Updated hourly.`;
  return { title, description, alternates: { canonical: "/market" }, openGraph: { ...OG_BASE, title, description, url: "/market", images: [DEFAULT_OG_IMAGE] } };
}

function TrendList({ id, title, hint, rows }: { id: string; title: string; hint: string; rows: Market["heatingUp"] }) {
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby={id}>
      <h3 id={id} className="text-base font-bold tracking-tight">
        {title}
      </h3>
      <p className="mt-0.5 mb-3 text-sm text-muted-foreground">{hint}</p>
      <ul className="divide-y rounded-2xl border">
        {rows.map((row) => (
          <li key={row.slug} className="relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60 has-[a:focus-visible]:bg-muted/60 sm:px-5">
            <CompanyLogo name={row.name} domain={row.domain} />
            <div className="min-w-0 flex-1">
              <Link
                href={`/company-profiles/${row.slug}`}
                className="font-semibold outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline"
              >
                {row.name}
              </Link>
              <p className="text-sm text-muted-foreground tabular-nums">
                {number.format(row.then)} → {number.format(row.now)} open remote roles since {formatDate(row.since)}
              </p>
            </div>
            <Sparkline values={row.series} className="hidden text-primary sm:block" />
            <MomentumChip label={row.label} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function MarketPage() {
  const [market, reports] = await Promise.all([getMarket(), getWeeklyReports()]);
  const asOf = formatDate(market.updatedAt);
  const faqs = marketFaqs(market, asOf);
  const kindRows = market.kinds.map((kind) => {
    const change = kind.then ? Math.round(((kind.count - kind.then) / kind.then) * 100) : null;
    return {
      label: kind.label,
      value: kind.count,
      detail: change === null ? `${kind.count} open remote roles` : `${change >= 0 ? "+" : ""}${change}% since the comparison day`,
    };
  });

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-12 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">Remote hiring market</h1>
      <p className="mt-2 max-w-[36rem] leading-relaxed text-foreground/85">{faqs[0].answer}</p>
      <dl className="mt-5 grid max-w-lg grid-cols-3 gap-px overflow-hidden rounded-2xl border bg-border text-center">
        {[
          ["Open remote roles", number.format(market.remoteRoles)],
          [market.opened7 === null ? "Posted, last 7 days" : "Opened, last 7 days", number.format(market.opened7 ?? market.posted7)],
          ["Companies hiring", number.format(market.hiringCompanies)],
        ].map(([term, value]) => (
          <div key={term} className="bg-card px-3 py-3">
            <dd className="text-xl font-bold tabular-nums">{value}</dd>
            <dt className="text-xs text-muted-foreground">{term}</dt>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-muted-foreground">
        As of <time dateTime={market.updatedAt}>{asOf}</time>; refreshed every hour from the companies’ job boards.
      </p>

      <div className="mt-10 space-y-10">
        <section aria-labelledby="momentum" className="space-y-6">
          <div>
            <h2 id="momentum" className="text-lg font-bold tracking-tight">
              Who’s hiring more, and who’s slowing down
            </h2>
            {market.hasTrends ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {(["growing", "started", "steady", "slowing", "paused"] as const)
                  .filter((label) => market.counts[label] > 0)
                  .map((label) => (
                    <li key={label} className="flex items-center gap-1.5 text-sm">
                      <MomentumChip label={label} />
                      <span className="tabular-nums">{market.counts[label]}</span>
                      <span className="sr-only">companies {MOMENTUM[label].toLowerCase()}</span>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="mt-1 max-w-[36rem] text-sm text-muted-foreground">
                We record every company’s open roles daily{market.historySince && <> since {formatDate(market.historySince)}</>}. Who’s heating
                up, cooling down or pausing appears here once a week of records exists, and sharpens over four weeks.
              </p>
            )}
          </div>
          <TrendList id="heating" title="Heating up" hint="Most growth in open remote roles over the last four weeks." rows={market.heatingUp} />
          <TrendList id="cooling" title="Cooling down" hint="Biggest drops in open remote roles over the last four weeks." rows={market.coolingDown} />
          <TrendList id="paused" title="Paused" hint="Had open remote roles, and none for at least three days now." rows={market.paused} />
        </section>

        {market.postingMost.length > 0 && (
          <section aria-labelledby="posting">
            <h2 id="posting" className="text-lg font-bold tracking-tight">
              Posting the most right now
            </h2>
            <p className="mt-0.5 mb-4 text-sm text-muted-foreground">Remote roles posted in the last 30 days.</p>
            <BarChart
              caption="Companies by remote roles posted in the last 30 days"
              rows={market.postingMost.map((company) => ({ label: company.name, value: company.count, href: `/company-profiles/${company.slug}` }))}
              unit="roles posted"
            />
          </section>
        )}

        {kindRows.length > 0 && (
          <section aria-labelledby="kinds">
            <h2 id="kinds" className="text-lg font-bold tracking-tight">
              By kind of work
            </h2>
            <p className="mt-0.5 mb-4 text-sm text-muted-foreground">Open remote roles now{market.hasTrends && ", with the change over four weeks on hover"}.</p>
            <BarChart caption="Open remote roles by kind of work" rows={kindRows} unit="open remote roles" />
          </section>
        )}

        {market.news.length > 0 && (
          <section aria-labelledby="news">
            <h2 id="news" className="text-lg font-bold tracking-tight">
              In the news
            </h2>
            <p className="mt-0.5 mb-3 text-sm text-muted-foreground">
              From the biggest remote hirers’ own posts and Hacker News, last 30 days.
            </p>
            <ul className="divide-y rounded-2xl border">
              {market.news.map((item) => (
                <li key={item.url} className="px-4 py-3.5 sm:px-5">
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-pretty underline-offset-4 hover:underline">
                    {item.title}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                  <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
                    <Link href={`/company-profiles/${item.company.slug}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                      {item.company.name}
                    </Link>
                    <span aria-hidden>·</span>
                    <span>{item.site}</span>
                    {item.date && (
                      <>
                        <span aria-hidden>·</span>
                        <time dateTime={item.date}>{formatDate(item.date)}</time>
                      </>
                    )}
                  </p>
                  {item.tags.length > 0 && (
                    <ul aria-label="Topics" className="mt-2 flex flex-wrap gap-1.5">
                      {item.tags.map((tag) => (
                        <li key={tag}>
                          <Tag>{NEWS_TAGS[tag]}</Tag>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <FaqSection faqs={faqs} />

        <p className="text-sm text-muted-foreground">
          More in{" "}
          <Link href="/insights" className="font-medium text-primary underline underline-offset-4">
            State of remote hiring
          </Link>
          {reports.length > 0 ? ", " : " and "}
          <Link href="/salaries" className="font-medium text-primary underline underline-offset-4">
            salaries
          </Link>
          {reports.length > 0 && (
            <>
              {" "}
              and the{" "}
              <Link href="/weekly" className="font-medium text-primary underline underline-offset-4">
                weekly reports
              </Link>
            </>
          )}
          .
        </p>
      </div>
    </div>
  );
}
