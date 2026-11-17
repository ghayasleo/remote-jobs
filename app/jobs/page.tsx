import type { Metadata } from "next";
import { JobsFeed } from "@/components/jobs/jobs-feed";
import { getJobsPreview } from "@/lib/data/jobs";
import { DEFAULT_OG_IMAGE } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const { total, companies } = await getJobsPreview();
  const description = `${total} remote tech jobs at ${companies} remote-friendly companies, straight from their job boards and refreshed every hour.`;
  return {
    title: `Remote tech jobs: ${total} open roles`,
    description,
    alternates: { canonical: "/jobs" },
    openGraph: { description, url: "/jobs", images: [DEFAULT_OG_IMAGE] },
  };
}

export default async function JobsPage() {
  const preview = await getJobsPreview();
  return <JobsFeed {...preview} />;
}
