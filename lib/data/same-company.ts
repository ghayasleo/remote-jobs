// Telling whether two names, domains or job boards are the same company.
// Shared by scripts/find-job-boards.mts and the company list.
//
// No runtime imports: the scanner loads this file directly with Node.

const STOP_WORDS = new Set(["inc", "llc", "ltd", "gmbh", "co", "the", "company", "group", "technologies", "technology", "labs", "software", "careers", "jobs", "hq", "io", "app"]);

export const words = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));

export const squash = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Loose: one name contains the other, or they share a distinctive word ("O'Reilly Media", "O'Reilly Online Learning"). */
export function similar(a: string, b: string) {
  const [x, y] = [squash(a), squash(b)];
  if (!x || !y) return false;
  if (x.includes(y) || y.includes(x)) return true;
  const shared = words(a).filter((word) => words(b).includes(word));
  return shared.some((word) => word.length >= 4);
}

/** Strict: the same name, or one starts with the other ("Stripe", "Stripe Inc"). */
export function sameName(a: string, b: string) {
  const [x, y] = [squash(a), squash(b)];
  return x === y || (Math.min(x.length, y.length) >= 5 && (x.startsWith(y) || y.startsWith(x)));
}

export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

/** example.com, example.co.uk → the registrable part, near enough for a check. */
export const baseDomain = (host: string) => {
  const labels = host.toLowerCase().replace(/^www\./, "").split(".");
  const tail = /^(co|com|ne|or|ac|gov|org|net)$/.test(labels.at(-2) ?? "") && labels.length > 2 ? 3 : 2;
  return labels.slice(-tail).join(".");
};

type Listed = { slug: string; name: string; domain: string | null; aliases: string[]; sections: { markdown: string }[] };

/**
 * Folds entries that are the same company into one: the same registrable
 * domain *and* similar names (two names on one domain can be an upstream
 * mistake, like inDrive listed with Incsub's website). The entry with a job
 * board, else the fuller profile, stays; the other's slug becomes an alias so
 * its old address redirects. Returns what was merged, "kept ← dropped".
 */
export function mergeDuplicateCompanies<T extends Listed>(companies: Map<string, T>, hasBoard: (slug: string) => boolean) {
  const byDomain = new Map<string, T[]>();
  for (const company of companies.values()) {
    if (!company.domain) continue;
    const key = baseDomain(company.domain);
    const group = byDomain.get(key);
    if (group) group.push(company);
    else byDomain.set(key, [company]);
  }

  const size = (company: T) => company.sections.reduce((total, section) => total + section.markdown.length, 0);
  const better = (a: T, b: T) =>
    Number(hasBoard(b.slug)) - Number(hasBoard(a.slug)) || size(b) - size(a) || a.slug.localeCompare(b.slug);

  const merged: string[] = [];
  for (const group of byDomain.values()) {
    if (group.length < 2) continue;
    const remaining = [...group].sort(better);
    while (remaining.length > 1) {
      const kept = remaining.shift()!;
      for (const other of remaining.filter((candidate) => similar(candidate.name, kept.name))) {
        remaining.splice(remaining.indexOf(other), 1);
        companies.delete(other.slug);
        kept.aliases = [...new Set([...kept.aliases, other.slug, ...other.aliases])];
        merged.push(`${kept.slug} ← ${other.slug}`);
      }
    }
  }
  return merged;
}
