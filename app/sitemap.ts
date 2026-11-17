import type { MetadataRoute } from "next";
import { getCompanyIndex } from "@/lib/data/companies";
import { getLandingTopics } from "@/lib/data/explore-data";
import { getRemoteJobs } from "@/lib/data/jobs";
import { jobPath } from "@/lib/jobs";
import { absoluteUrl } from "@/lib/site";

const date = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00Z`) : undefined);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [companies, landing, jobs] = await Promise.all([getCompanyIndex(), getLandingTopics(), getRemoteJobs()]);
  return [
    { url: absoluteUrl("/"), changeFrequency: "hourly", priority: 1 },
    { url: absoluteUrl("/remote"), changeFrequency: "daily", priority: 0.8 },
    ...landing.map(({ path, topic }) => ({
      url: absoluteUrl(path),
      changeFrequency: "daily" as const,
      priority: topic.region && topic.stack ? 0.6 : 0.8,
    })),
    { url: absoluteUrl("/jobs"), changeFrequency: "hourly", priority: 0.9 },
    { url: absoluteUrl("/new"), changeFrequency: "daily", priority: 0.7 },
    ...jobs.map((job) => ({
      url: absoluteUrl(jobPath(job)),
      lastModified: job.postedAt ? new Date(job.postedAt) : undefined,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.3 },
    ...companies.map((company) => ({
      url: absoluteUrl(`/company-profiles/${company.slug}`),
      lastModified: date(company.updatedAt ?? company.addedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
