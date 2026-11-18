import type { ExploreCompany, HiringCounts } from "@/lib/explore";

/**
 * The companies most like this one: a shared tech stack counts most, then
 * hiring in the same region and having the same remote policy, and companies
 * hiring right now break ties. Pure, so it's easy to test.
 */
export function similarCompanies(
  company: Pick<ExploreCompany, "slug" | "region" | "remotePolicy" | "technologies">,
  companies: ExploreCompany[],
  hiring: HiringCounts,
  limit = 6,
) {
  const stack = new Set(company.technologies);
  return companies
    .filter((other) => other.slug !== company.slug)
    .map((other) => {
      const shared = other.technologies.filter((tech) => stack.has(tech)).length;
      const sameRegion = other.region === company.region;
      const score =
        shared * 2 +
        (sameRegion ? 1.5 : 0) +
        (other.remotePolicy && other.remotePolicy === company.remotePolicy ? 1 : 0) +
        ((hiring[other.slug]?.remote ?? 0) > 0 ? 1 : 0);
      return { other, shared, sameRegion, score };
    })
    .filter(({ shared, sameRegion }) => shared > 0 || sameRegion)
    .sort((a, b) => b.score - a.score || a.other.name.localeCompare(b.other.name))
    .slice(0, limit)
    .map(({ other }) => other);
}
