import type { Metadata } from "next";
import { HomeView } from "@/components/home/home-view";
import { getHomeData } from "@/lib/data/home";
import { siteJsonLd } from "@/lib/seo";
import { OG_BASE, SITE_BRAND, jsonLd } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const { totalJobs, hiringCompanies, boards } = await getHomeData();
  const description = `${totalJobs} remote tech jobs at ${hiringCompanies} companies, read straight from ${boards} employers' own job boards every hour. Free, with no sign-up.`;
  return {
    title: { absolute: `Remote tech jobs straight from the companies hiring · ${SITE_BRAND}` },
    description,
    alternates: { canonical: "/" },
    openGraph: { ...OG_BASE, description, url: "/" },
  };
}

export default async function HomePage() {
  const data = await getHomeData();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          siteJsonLd(
            `A free directory of ${data.totalCompanies} remote-friendly tech companies and the ${data.totalJobs} remote roles they're hiring for, read straight from their own job boards.`,
          ),
        )}
      />
      <HomeView data={data} />
    </>
  );
}
