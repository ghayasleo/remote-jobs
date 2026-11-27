import Link from "next/link";
import { AlertTriangleIcon, ArrowRightIcon, ArrowUpRightIcon, CheckCircle2Icon, SearchIcon } from "lucide-react";
import { Sun } from "@/components/brand/logo";
import { CompanyLogo } from "@/components/company/company-logo";
import { locationSummary } from "@/components/jobs/job-row";
import { RelativeTime } from "@/components/relative-time";
import { Button } from "@/components/ui/button";
import type { HomeData } from "@/lib/data/home";
import { formatCount } from "@/lib/faq";
import { jobLocations, jobPath } from "@/lib/jobs";
import { countryPath } from "@/lib/countries";
import { usd } from "@/lib/salaries";
import { cn } from "@/lib/utils";

const QUICK_SEARCHES = [
  { label: "Engineering", href: "/jobs?category=engineering" },
  { label: "Data & AI", href: "/jobs?category=data" },
  { label: "Design", href: "/jobs?category=design" },
  { label: "Hire anywhere", href: "/jobs?where=anywhere" },
  { label: "Pay published", href: "/jobs?pay=true" },
];

/** The few real logos that sit inside the headline, sized to its letters. */
function LogoStack({ companies }: { companies: HomeData["hiringNow"] }) {
  const shown = companies.filter((company) => company.domain).slice(0, 3);
  return (
    <span aria-hidden className="mx-[0.1em] inline-flex translate-y-[0.08em] align-baseline">
      {shown.map((company, index) => (
        <span
          key={company.slug}
          className={cn(
            "inline-grid size-[0.78em] place-items-center overflow-hidden rounded-[0.2em] border-[0.025em] border-border bg-white p-[0.1em] ring-[0.05em] ring-background",
            index > 0 && "-ml-[0.24em]",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny proxied favicons, already sized */}
          <img src={`/logo/${company.domain}`} alt="" width={64} height={64} className="size-full object-contain" />
        </span>
      ))}
    </span>
  );
}

function Hero({ data }: { data: HomeData }) {
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-4 pt-8 pb-14 sm:px-6 sm:pt-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center lg:gap-12 lg:pt-16 lg:pb-20">
      <div>
        <p className="inline-flex min-h-8 items-center gap-2 rounded-full bg-hiring px-3.5 py-1 text-sm font-semibold text-hiring-foreground">
          <span className="relative grid size-2 place-items-center">
            <span className="absolute size-2 rounded-full bg-sun motion-safe:animate-ping" />
            <span className="relative size-2 rounded-full bg-sun" />
          </span>
          <span>
            {formatCount(data.totalJobs)} remote roles open now
            <span className="font-normal opacity-80"> · checked </span>
            <RelativeTime iso={data.builtAt} className="font-normal opacity-80" />
          </span>
        </p>
        <h1 className="mt-6 text-[clamp(2.5rem,6.4vw,4.5rem)] leading-[1.02] font-extrabold tracking-[-0.04em] text-balance">
          Remote tech jobs, straight from <LogoStack companies={data.hiringNow} /> the companies hiring.
        </h1>
        <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-pretty text-muted-foreground">
          We read {data.boards} employers&apos; own job boards every hour. Every role here is remote, still open, and one
          click from the company&apos;s own application page. Free, with no sign-up.
        </p>

        <form action="/jobs" method="get" role="search" className="mt-8 max-w-[34rem]">
          <label htmlFor="home-search" className="sr-only">
            Search remote jobs
          </label>
          <div className="flex h-14 items-center gap-2 rounded-full border bg-muted pr-1.5 pl-5 transition-colors focus-within:border-ring focus-within:bg-background">
            <SearchIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <input
              id="home-search"
              name="q"
              type="search"
              placeholder="Title, skill or company"
              autoComplete="off"
              enterKeyHint="search"
              className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            <Button type="submit" className="h-11 shrink-0 rounded-full px-5 text-sm">
              Search jobs
            </Button>
          </div>
        </form>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Popular searches">
          {QUICK_SEARCHES.map(({ label, href }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex h-9 items-center rounded-full border px-3.5 text-sm font-medium transition-colors duration-150 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:h-11"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-muted-foreground">
          Or{" "}
          <Link href="/companies" className="font-semibold text-primary underline-offset-4 hover:underline">
            explore {formatCount(data.totalCompanies)} remote-friendly companies
          </Link>
          , by where they hire and what they build with.
        </p>
      </div>

      <LiveBoard data={data} />
    </section>
  );
}

/** The newest real roles, as they came in: the product doing its job. */
function LiveBoard({ data }: { data: HomeData }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <div>
          <h2 className="font-bold">Newest remote roles</h2>
          <p className="text-xs text-muted-foreground">
            {formatCount(data.postedToday)} posted in the last 24 hours
          </p>
        </div>
        <Link
          href="/jobs"
          className="flex h-9 items-center gap-1 rounded-full px-3 text-sm font-semibold text-primary transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          All {formatCount(data.totalJobs)}
          <ArrowRightIcon className="size-4" aria-hidden />
        </Link>
      </div>
      <ul className="divide-y">
        {data.newest.map((job, index) => (
          <li
            key={`${job.company}:${job.id}`}
            style={{ animationDelay: `${120 + index * 90}ms` }}
            className={cn(
              "relative flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-muted/60 has-[a:focus-visible]:bg-muted/60 motion-safe:animate-[arrive_420ms_var(--ease-out-quart)_both] sm:px-5",
              index >= 5 && "hidden sm:flex",
            )}
          >
            <CompanyLogo name={job.companyName} domain={job.domain} />
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold">
                <Link
                  href={jobPath(job)}
                  className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline"
                >
                  {job.title}
                </Link>
              </h3>
              <p className="truncate text-sm text-muted-foreground">
                {job.companyName} · {locationSummary(jobLocations(job)) || "Remote"}
              </p>
            </div>
            <div className="hidden shrink-0 text-right text-xs text-muted-foreground min-[420px]:block">
              {job.postedAt && <RelativeTime iso={job.postedAt} className="block font-medium text-foreground" />}
              {job.source && <span>via {job.source}</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Sources({ data }: { data: HomeData }) {
  return (
    <section className="border-y bg-muted/60">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 className="max-w-[36rem] text-lg font-bold tracking-tight text-balance">
          Read straight from the hiring systems employers already use, never copied from other job sites.
        </h2>
        <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-4">
          {data.providers.map(({ label, count }) => (
            <li key={label} className="flex items-baseline gap-2">
              <span className="text-xl font-bold tracking-tight text-foreground/80 sm:text-2xl">{label}</span>
              <span className="text-sm text-muted-foreground tabular-nums">{count}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-[36rem] text-sm text-muted-foreground">
          Numbers are how many companies we read from each. When an employer closes a role, it leaves here within the hour.
        </p>
      </div>
    </section>
  );
}

const tile = "group relative flex flex-col rounded-2xl border bg-card p-5 transition-colors duration-150 hover:border-foreground/20 sm:p-6";
const tileTitle = "text-xl font-bold tracking-tight";
const tileLink =
  "mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-primary outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:after:ring-3 focus-visible:after:ring-ring/50";

function Countries({ data }: { data: HomeData }) {
  const top = data.countries[0]?.total ?? 1;
  return (
    <div className={cn(tile, "lg:col-span-4 lg:row-span-2")}>
      <h3 className={tileTitle}>Open to people where you live</h3>
      <p className="mt-1.5 max-w-[30rem] text-muted-foreground">
        Plenty of &ldquo;remote&rdquo; roles only hire in one country. We read each location so you see the ones you can
        actually apply for.
      </p>
      <ol className="relative z-10 mt-5 grid gap-1">
        {data.countries.map((country) => (
          <li key={country.slug}>
            <Link
              href={countryPath(country)}
              className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
            >
              <span className="truncate font-medium">{country.name}</span>
              <span className="h-2 rounded-full bg-secondary" aria-hidden>
                <span
                  className="block h-full rounded-full bg-primary/70"
                  style={{ width: `${Math.max(6, (country.total / top) * 100)}%` }}
                />
              </span>
              <span className="text-sm text-muted-foreground tabular-nums">{formatCount(country.total)} roles</span>
            </Link>
          </li>
        ))}
      </ol>
      <Link href="/remote/in" className={tileLink}>
        Find your country
        <ArrowRightIcon className="size-4" aria-hidden />
      </Link>
    </div>
  );
}

const PAY_AXIS_MAX = 300_000;

function Pay({ data }: { data: HomeData }) {
  const { categories, published, remoteRoles } = data.salaries;
  const share = remoteRoles ? Math.round((published / remoteRoles) * 100) : 0;
  return (
    <div className={cn(tile, "lg:col-span-2")}>
      <h3 className={tileTitle}>What remote roles pay</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Middle half of published ranges, in US dollars a year. Only {share}% of listings show pay.
      </p>
      <ul className="mt-5 grid gap-3.5">
        {categories.slice(0, 3).map((category) => {
          const left = (category.p25 / PAY_AXIS_MAX) * 100;
          const width = Math.max(4, ((category.p75 - category.p25) / PAY_AXIS_MAX) * 100);
          return (
            <li key={category.key}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium">{category.label}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {usd(category.p25)}–{usd(category.p75)}
                </span>
              </div>
              <div className="relative mt-1.5 h-2 rounded-full bg-secondary" aria-hidden>
                <span
                  className="absolute inset-y-0 rounded-full bg-primary/70"
                  style={{ left: `${Math.min(left, 96)}%`, width: `${Math.min(width, 100 - left)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <Link href="/salaries" className={tileLink}>
        Salaries by kind of work
        <ArrowRightIcon className="size-4" aria-hidden />
      </Link>
    </div>
  );
}

function Momentum({ data }: { data: HomeData }) {
  if (data.heatingUp.length === 0) return null;
  return (
    <div className={cn(tile, "lg:col-span-2")}>
      <h3 className={tileTitle}>Who&apos;s hiring more</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">Remote roles added over the last few weeks.</p>
      <ul className="mt-4 grid gap-2.5">
        {data.heatingUp.slice(0, 3).map((company) => (
          <li key={company.slug} className="flex items-center gap-3">
            <CompanyLogo name={company.name} domain={company.domain} size="xs" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{company.name}</span>
            <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-hiring px-2.5 text-xs font-semibold text-hiring-foreground tabular-nums">
              +{company.change}
            </span>
          </li>
        ))}
      </ul>
      <Link href="/market" className={tileLink}>
        The hiring market
        <ArrowRightIcon className="size-4" aria-hidden />
      </Link>
    </div>
  );
}

function Stacks({ data }: { data: HomeData }) {
  return (
    <div className="rounded-2xl border bg-card p-5 sm:p-6 lg:col-span-3">
      <h3 className={tileTitle}>Filter by what you build with</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">Open remote roles at companies using each.</p>
      <ul className="mt-5 flex flex-wrap gap-2">
        {data.stacks.map(({ tech, label, roles }) => (
          <li key={tech}>
            <Link
              href={`/jobs?stack=${tech}`}
              className="flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none pointer-coarse:h-11"
            >
              {label}
              <span className="text-muted-foreground tabular-nums">{formatCount(roles)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WithAi() {
  return (
    <div className={cn(tile, "lg:col-span-3")}>
      <h3 className={tileTitle}>Search from Claude or ChatGPT</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Connect RemoteJobs to your AI assistant and ask for roles in plain words.
      </p>
      <p className="mt-5 rounded-2xl rounded-bl-md bg-secondary px-4 py-3 text-sm leading-relaxed text-pretty text-secondary-foreground">
        Find senior backend roles open to people in Germany that publish pay.
      </p>
      <Link href="/ai" className={tileLink}>
        Set it up in a minute
        <ArrowRightIcon className="size-4" aria-hidden />
      </Link>
    </div>
  );
}

const EXAMPLE_CHECKS = [
  { ok: true, text: "The text can be read" },
  { ok: false, text: "Two columns: some systems mix them up" },
  { ok: true, text: "Dates on every role" },
];

function CvCheckTile() {
  return (
    <div className={cn(tile, "lg:col-span-3")}>
      <h3 className={tileTitle}>Check your CV before you apply</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">
        See how hiring systems read it, and which of a role&apos;s skills it mentions. Free, and your CV never leaves your
        device.
      </p>
      <div className="mt-5 rounded-xl border p-3" aria-label="An example result">
        <ul className="grid gap-2 text-sm">
          {EXAMPLE_CHECKS.map(({ ok, text }) => (
            <li key={text} className="flex items-center gap-2">
              {ok ? (
                <CheckCircle2Icon className="size-4 shrink-0" aria-hidden />
              ) : (
                <AlertTriangleIcon className="size-4 shrink-0 text-hiring-foreground" aria-hidden />
              )}
              {text}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">Example result</p>
      </div>
      <Link href="/cv-check" className={tileLink}>
        Check my CV
        <ArrowRightIcon className="size-4" aria-hidden />
      </Link>
    </div>
  );
}

const EXAMPLE_BOARD = [
  { status: "Saved", count: 6 },
  { status: "Applied", count: 3 },
  { status: "Interviewing", count: 1 },
];

function TrackerTile() {
  return (
    <div className={cn(tile, "lg:col-span-3")}>
      <h3 className={tileTitle}>Keep track of every application</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Save roles, move them from Applied to Offer, and keep notes, all on one dashboard. Sign in with Google to start.
      </p>
      <div className="mt-5 grid grid-cols-3 gap-2" aria-label="An example board">
        {EXAMPLE_BOARD.map(({ status, count }) => (
          <div key={status} className="rounded-xl bg-muted/70 p-2.5">
            <p className="flex items-baseline justify-between text-xs font-bold">
              {status}
              <span className="font-medium text-muted-foreground tabular-nums">{count}</span>
            </p>
            <div className="mt-2 grid gap-1.5" aria-hidden>
              {Array.from({ length: Math.min(count, 2) }, (_, index) => (
                <span key={index} className="block h-6 rounded-md border bg-card" />
              ))}
            </div>
          </div>
        ))}
      </div>
      <Link href="/dashboard" className={tileLink}>
        Open your dashboard
        <ArrowRightIcon className="size-4" aria-hidden />
      </Link>
    </div>
  );
}

function FindTheFit({ data }: { data: HomeData }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
      <h2 className="max-w-[40rem] text-[clamp(1.875rem,4vw,2.75rem)] leading-[1.08] font-extrabold tracking-[-0.035em] text-balance">
        Narrow it down to the roles that fit your life.
      </h2>
      <div className="mt-10 grid gap-4 lg:grid-cols-6">
        <Countries data={data} />
        <Pay data={data} />
        <Momentum data={data} />
        <Stacks data={data} />
        <WithAi />
        <CvCheckTile />
        <TrackerTile />
      </div>
    </section>
  );
}

function HiringNow({ data }: { data: HomeData }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:pb-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="max-w-[36rem] text-[clamp(1.5rem,3vw,2rem)] leading-tight font-extrabold tracking-[-0.03em] text-balance">
          {formatCount(data.hiringCompanies)} companies are hiring remotely today
        </h2>
        <Link
          href="/companies?hiring=true"
          className="inline-flex h-10 items-center gap-1 rounded-full px-4 text-sm font-semibold text-primary transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          See them all
          <ArrowRightIcon className="size-4" aria-hidden />
        </Link>
      </div>
      <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {data.hiringNow.map((company) => (
          <li key={company.slug}>
            <Link
              href={`/company-profiles/${company.slug}`}
              className="flex h-full items-center gap-3 rounded-2xl border p-3 transition-colors duration-150 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:p-4"
            >
              <CompanyLogo name={company.name} domain={company.domain} />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{company.name}</span>
                <span className="block text-sm text-muted-foreground tabular-nums">
                  {company.roles} <span className="hidden sm:inline">remote </span>
                  {company.roles === 1 ? "role" : "roles"}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const PROMISES = [
  {
    title: "Free to see, for good",
    text: "Every job, company, salary and country page is free, with no paywall and no sign-up wall.",
  },
  {
    title: "Only real, open roles",
    text: "Each role comes from the employer's own job board and links to it. Placeholders and duplicates are filtered out.",
  },
  {
    title: "Private by default",
    text: "Browsing never needs an account. Your CV is checked on your device and never uploaded, and we never sell your data.",
  },
];

function Promises() {
  return (
    <section className="border-t">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] lg:py-20">
        <h2 className="max-w-[24rem] text-[clamp(1.5rem,3vw,2rem)] leading-tight font-extrabold tracking-[-0.03em] text-balance">
          A job search that&apos;s on your side.
        </h2>
        <dl className="grid gap-8 sm:grid-cols-3">
          {PROMISES.map(({ title, text }) => (
            <div key={title}>
              <dt className="font-bold">{title}</dt>
              <dd className="mt-1.5 text-muted-foreground text-pretty">{text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Closing({ data }: { data: HomeData }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:pb-24">
      <div className="relative overflow-hidden rounded-3xl bg-foreground px-6 py-12 text-background sm:px-12 sm:py-16 dark:bg-card dark:text-foreground">
        <Sun className="pointer-events-none absolute -right-10 -bottom-24 size-64 sm:right-10 sm:-bottom-28 sm:size-80" />
        <h2 className="relative max-w-[30rem] text-[clamp(1.875rem,4.4vw,3rem)] leading-[1.05] font-extrabold tracking-[-0.035em] text-balance">
          Your next remote team is hiring this week.
        </h2>
        <p className="relative mt-4 max-w-[30rem] text-pretty opacity-80">
          {formatCount(data.totalJobs)} open roles at {formatCount(data.hiringCompanies)} companies, checked every hour.
        </p>
        <div className="relative mt-8 flex flex-wrap gap-3">
          <Button asChild className="h-12 rounded-full px-6 text-base">
            <Link href="/jobs">
              Browse remote jobs
              <ArrowRightIcon aria-hidden />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-12 rounded-full border-background/30 bg-transparent px-6 text-base text-background hover:bg-background/10 hover:text-background dark:border-border dark:text-foreground dark:hover:bg-muted"
          >
            <Link href="/companies">
              Explore companies
              <ArrowUpRightIcon aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function HomeView({ data }: { data: HomeData }) {
  return (
    <>
      <Hero data={data} />
      <Sources data={data} />
      <FindTheFit data={data} />
      <HiringNow data={data} />
      <Promises />
      <Closing data={data} />
    </>
  );
}
