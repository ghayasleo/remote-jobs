import type { Metadata } from "next";
import { DiscoverLinks } from "@/components/explore/discover-links";
import { Explore } from "@/components/explore/explore";
import { getExplorePreview } from "@/lib/data/explore-data";
import { getNewThisWeek } from "@/lib/data/jobs";
import { DEFAULT_OG_IMAGE, OG_BASE } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const { total, hiringCount } = await getExplorePreview();
  const description = `Search ${total} tech companies that hire remotely by where you live and what you build with, plus live openings from ${hiringCount} companies hiring now.`;
  return {
    title: `${total} remote-friendly tech companies`,
    description,
    alternates: { canonical: "/companies" },
    openGraph: { ...OG_BASE, description, url: "/companies", images: [DEFAULT_OG_IMAGE] },
  };
}

export default async function CompaniesPage() {
  const [preview, fresh] = await Promise.all([getExplorePreview(), getNewThisWeek()]);
  return <Explore {...preview} discover={<DiscoverLinks newRoles={fresh.jobs.length} />} />;
}
