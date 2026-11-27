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

// Words that say how senior a role is or how it's filled, not what it is.
const NOISE = new Set(
  "senior sr junior jr lead staff principal head chief associate intern mid level i ii iii iv remote contract contractor part time full the a an and of for to in at with on".split(" "),
);

/** The words that say what a role is: "Senior Backend Engineer (Go)" → backend, engineer, go. */
export function roleWords(title: string) {
  return new Set(
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9+#]+/g, " ")
      .split(" ")
      .filter((word) => word.length > 1 && !NOISE.has(word)),
  );
}

type RoleLike = { company: string; id: string; title: string; category: string; postedAt: string | null };

/**
 * Roles at other companies most like this one: the same kind of work, and as
 * many title words in common as possible. Newer roles break ties. At most one
 * per company, so the list isn't one employer's board again. Pure.
 */
export function similarRoles<T extends RoleLike>(role: RoleLike, roles: T[], limit = 5): T[] {
  const words = roleWords(role.title);
  if (words.size === 0) return [];
  const scored = roles
    .filter((other) => other.company !== role.company && other.category === role.category)
    .map((other) => {
      const otherWords = roleWords(other.title);
      let shared = 0;
      for (const word of otherWords) if (words.has(word)) shared++;
      // Overlap relative to both titles, so "Engineer" alone doesn't match everything.
      const score = shared / Math.sqrt(words.size * Math.max(otherWords.size, 1));
      return { other, shared, score };
    })
    .filter(({ shared, score }) => shared > 0 && score >= 0.5)
    .sort((a, b) => b.score - a.score || (b.other.postedAt ?? "").localeCompare(a.other.postedAt ?? ""));
  const seen = new Set<string>();
  const picked: T[] = [];
  for (const { other } of scored) {
    if (seen.has(other.company)) continue;
    seen.add(other.company);
    picked.push(other);
    if (picked.length === limit) break;
  }
  return picked;
}
