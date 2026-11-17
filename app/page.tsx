import type { Metadata } from "next";
import { Explore } from "@/components/explore/explore";
import { getExplorePreview } from "@/lib/data/explore-data";
import { SITE_NAME, SITE_URL, jsonLd } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const { total, hiringCount } = await getExplorePreview();
  const description = `Search ${total} tech companies that hire remotely by where you live and what you build with, plus live openings from ${hiringCount} companies hiring now.`;
  return {
    title: { absolute: `Remote tech jobs at ${total} remote-friendly companies · ${SITE_NAME}` },
    description,
    alternates: { canonical: "/" },
    openGraph: { description, url: "/" },
  };
}

export default async function ExplorePage() {
  const preview = await getExplorePreview();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({ "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: SITE_URL })}
      />
      <Explore {...preview} />
    </>
  );
}
