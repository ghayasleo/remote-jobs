import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CountryView } from "@/components/countries/country-view";
import { countryPath } from "@/lib/countries";
import { getCountryIndex, getCountryPage } from "@/lib/data/countries";
import { clip } from "@/lib/seo";
import { DEFAULT_OG_IMAGE, OG_BASE } from "@/lib/site";

export async function generateStaticParams() {
  const { countries } = await getCountryIndex();
  return countries.map((country) => ({ country: country.slug }));
}

export async function generateMetadata({ params }: PageProps<"/remote/in/[country]">): Promise<Metadata> {
  const page = await getCountryPage((await params).country);
  if (!page) return { title: "Not found", robots: { index: false } };
  const { country, counts, companyCount } = page;
  const title = `Remote jobs in ${country.name}: ${counts.total} roles open to people there`;
  const description = clip(
    `${counts.total} remote tech roles at ${companyCount} companies that people living in ${country.name} can apply to, updated hourly: ${counts.named} name ${country.name}, ${counts.regional} are open across the region and ${counts.worldwide} are open worldwide.`,
  );
  const url = countryPath(country);
  return { title, description, alternates: { canonical: url }, openGraph: { ...OG_BASE, title, description, url, images: [DEFAULT_OG_IMAGE] } };
}

export default async function CountryPage({ params }: PageProps<"/remote/in/[country]">) {
  const [page, index] = await Promise.all([getCountryPage((await params).country), getCountryIndex()]);
  if (!page) notFound();
  const neighbours = index.countries
    .filter((country) => country.region === page.country.region && country.slug !== page.country.slug)
    .sort((a, b) => b.total - a.total)
    .slice(0, 16);
  return <CountryView page={page} neighbours={neighbours} />;
}
