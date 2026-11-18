import type { Metadata } from "next";
import Link from "next/link";
import { countryPath } from "@/lib/countries";
import { getCountryIndex } from "@/lib/data/countries";
import { formatDate } from "@/lib/format";
import { JOB_REGIONS, JOB_REGION_KEYS } from "@/lib/jobs";
import { DEFAULT_OG_IMAGE, OG_BASE } from "@/lib/site";

const title = "Remote jobs by country: roles you can do from where you live";
const description =
  "Pick the country you live in to see the remote tech roles open to you: roles that name it, roles open across its region, and roles open worldwide. Updated hourly.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/remote/in" },
  openGraph: { ...OG_BASE, title, description, url: "/remote/in", images: [DEFAULT_OG_IMAGE] },
};

export default async function CountriesPage() {
  const { countries, updatedAt } = await getCountryIndex();
  const regions = JOB_REGION_KEYS.filter((region) => region !== "anywhere")
    .map((region) => ({
      region,
      countries: countries.filter((country) => country.region === region).sort((a, b) => b.total - a.total),
    }))
    .filter(({ countries }) => countries.length > 0);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-12 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">Remote jobs by country</h1>
      <p className="mt-2 max-w-[36rem] leading-relaxed text-foreground/85">
        Pick where you live to see the remote roles you can apply to: the ones that name your country, the ones open
        across your region, and the ones open worldwide.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        As of <time dateTime={updatedAt}>{formatDate(updatedAt)}</time>; open roles refresh every hour.
      </p>

      <div className="mt-8 space-y-9">
        {regions.map(({ region, countries }) => (
          <section key={region} aria-labelledby={`region-${region}`}>
            <h2 id={`region-${region}`} className="text-lg font-bold tracking-tight">
              {JOB_REGIONS[region]}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {countries.map((country) => (
                <li key={country.slug}>
                  <Link
                    href={countryPath(country)}
                    className="inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    {country.name}
                    <span className="text-muted-foreground tabular-nums">{country.total}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
