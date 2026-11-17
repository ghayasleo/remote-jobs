import { getCompanyIndex } from "@/lib/data/companies";
import { regionPhrase } from "@/lib/seo";
import { rssFeed, rssResponse } from "@/lib/rss";
import { absoluteUrl } from "@/lib/site";

// Companies most recently added to the list.
export async function GET() {
  const companies = (await getCompanyIndex())
    .filter((company) => company.addedAt)
    .sort((a, b) => b.addedAt!.localeCompare(a.addedAt!))
    .slice(0, 40);
  return rssResponse(
    rssFeed({
      title: "Remote Jobs: newly added companies",
      description: "Remote-friendly tech companies, newest additions first.",
      siteUrl: absoluteUrl("/"),
      feedUrl: absoluteUrl("/feeds/companies.xml"),
      items: companies.map((company) => ({
        title: company.name,
        url: absoluteUrl(`/company-profiles/${company.slug}`),
        description: [`${company.name} ${regionPhrase(company.region)}.`, company.blurb].filter(Boolean).join(" "),
        date: company.addedAt ? `${company.addedAt}T00:00:00.000Z` : null,
      })),
    }),
  );
}
