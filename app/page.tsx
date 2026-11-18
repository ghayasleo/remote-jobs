import type { Metadata } from "next";
import { DiscoverLinks } from "@/components/explore/discover-links";
import { Explore } from "@/components/explore/explore";
import { getExplorePreview } from "@/lib/data/explore-data";
import { getNewThisWeek } from "@/lib/data/jobs";
import { siteJsonLd } from "@/lib/seo";
import { SITE_NAME, jsonLd } from "@/lib/site";

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
  const [preview, fresh] = await Promise.all([getExplorePreview(), getNewThisWeek()]);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          siteJsonLd(
            `A free directory of ${preview.total} remote-friendly tech companies and the remote roles they're hiring for, built on the community-run remoteintech list.`,
          ),
        )}
      />
      <Explore {...preview} discover={<DiscoverLinks newRoles={fresh.jobs.length} />} />
    </>
  );
}
