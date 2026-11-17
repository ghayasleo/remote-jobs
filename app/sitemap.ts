import type { MetadataRoute } from "next";
import { getCompanyIndex } from "@/lib/data/companies";
import { absoluteUrl } from "@/lib/site";

const date = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00Z`) : undefined);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const companies = await getCompanyIndex();
  return [
    { url: absoluteUrl("/"), changeFrequency: "hourly", priority: 1 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.3 },
    ...companies.map((company) => ({
      url: absoluteUrl(`/company-profiles/${company.slug}`),
      lastModified: date(company.updatedAt ?? company.addedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
