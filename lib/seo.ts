import { label, remotePolicyLabels } from "@/lib/data/labels";
import type { CompanyProfile } from "@/lib/data/parse";
import { absoluteUrl } from "@/lib/site";

// Titles, descriptions and structured data written for how people search:
// "<company> remote jobs", "is <company> remote", "remote python jobs europe".

const REGION_PHRASES: Record<string, string> = {
  worldwide: "hires worldwide",
  americas: "hires in the Americas",
  europe: "hires in Europe",
  "americas-europe": "hires across the Americas and Europe",
  "asia-pacific": "hires in Asia Pacific",
  other: "hires in specific locations",
};

const EMPLOYEES: Record<string, [number, number | undefined]> = {
  tiny: [1, 10],
  small: [11, 50],
  medium: [51, 200],
  large: [201, 1000],
  enterprise: [1001, undefined],
};

export const regionPhrase = (region: string) => REGION_PHRASES[region] ?? REGION_PHRASES.other;

export function rolesPhrase(roles: { total: number; remote: number } | null) {
  if (!roles || roles.total === 0) return null;
  const count = roles.remote > 0 ? roles.remote : roles.total;
  return `${count} ${roles.remote > 0 ? "remote" : "open"} role${count === 1 ? "" : "s"}`;
}

/** Cuts at a word boundary so search snippets don't end mid-word. */
export function clip(text: string, max = 160) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.]$/, "")}…`;
}

export function companySeo(company: CompanyProfile, roles: { total: number; remote: number } | null) {
  const policy = label(remotePolicyLabels, company.remotePolicy).toLowerCase() || "remote-friendly";
  const where = regionPhrase(company.region);
  const hiring = rolesPhrase(roles);
  const capitalized = policy[0].toUpperCase() + policy.slice(1);
  const title = hiring
    ? `${company.name} remote jobs: ${hiring} open now`
    : `Is ${company.name} remote? ${capitalized}, ${where}`;
  const description = clip(
    [`${company.name} is ${policy} and ${where}.`, hiring && `Hiring now: ${hiring}.`, company.blurb].filter(Boolean).join(" "),
  );
  return { title, description };
}

export function companyJsonLd(company: CompanyProfile) {
  const path = `/company-profiles/${company.slug}`;
  const employees = company.companySize ? EMPLOYEES[company.companySize] : undefined;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${absoluteUrl(path)}#organization`,
        name: company.name,
        url: company.website,
        ...(company.domain && { logo: absoluteUrl(`/logo/${company.domain}`) }),
        ...(company.blurb && { description: company.blurb }),
        ...(employees && {
          numberOfEmployees: {
            "@type": "QuantitativeValue",
            minValue: employees[0],
            ...(employees[1] && { maxValue: employees[1] }),
          },
        }),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Companies", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: company.name, item: absoluteUrl(path) },
        ],
      },
    ],
  };
}
