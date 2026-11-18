import type { Role } from "@/lib/data/job-boards/providers";
import { label, remotePolicyLabels } from "@/lib/data/labels";
import type { CompanyProfile } from "@/lib/data/parse";
import type { Insights } from "@/lib/insights";
import { applicantCountries, schemaEmploymentType } from "@/lib/jobs";
import { MAKER } from "@/lib/maker";
import { BLUESKY_URL, REPOSITORY_URL, SITE_BRAND, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";

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

/** schema.org JobPosting for Google Jobs. Only fields we actually know. */
export function jobPostingJsonLd({
  company,
  role,
  html,
  url,
  fallbackDate,
}: {
  company: CompanyProfile;
  role: Role;
  html: string;
  url: string;
  fallbackDate: string;
}) {
  const countries = applicantCountries(role.location);
  // Google requires at least one country for a remote job; without one the
  // posting would be invalid, so the page goes without job markup.
  if (countries.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: role.title,
    description: html,
    datePosted: role.postedAt ?? fallbackDate,
    ...(schemaEmploymentType(role.employmentType) && { employmentType: schemaEmploymentType(role.employmentType) }),
    hiringOrganization: {
      "@type": "Organization",
      name: company.name,
      sameAs: company.website,
      ...(company.domain && { logo: absoluteUrl(`/logo/${company.domain}`) }),
    },
    jobLocationType: "TELECOMMUTE",
    applicantLocationRequirements: countries.map((name) => ({ "@type": "Country", name })),
    ...(role.pay && {
      baseSalary: {
        "@type": "MonetaryAmount",
        currency: role.pay.currency,
        value: {
          "@type": "QuantitativeValue",
          ...(role.pay.min !== null && { minValue: role.pay.min }),
          ...(role.pay.max !== null && { maxValue: role.pay.max }),
          unitText: role.pay.unit,
        },
      },
    }),
    directApply: false,
    identifier: { "@type": "PropertyValue", name: company.name, value: role.id },
    url,
  };
}

/**
 * "State of remote hiring" as a Dataset, so dataset search and AI assistants
 * know what the numbers measure, where they come from and how fresh they are.
 */
export function insightsDatasetJsonLd(insights: Pick<Insights, "companies">, updatedAt: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "State of remote tech hiring",
    description: `Live numbers on remote tech hiring from the ${insights.companies} remote-friendly companies on the community-run remoteintech list and the public job boards of those that hire through Greenhouse, Lever, Ashby, Workable or Recruitee: open remote roles, who is hiring most, what kind of work is remote, where companies hire, how remote they are, which stacks they use and how often listings show pay. Recounted every hour.`,
    url: absoluteUrl("/insights"),
    dateModified: updatedAt,
    temporalCoverage: updatedAt.slice(0, 10),
    isAccessibleForFree: true,
    isBasedOn: "https://github.com/remoteintech/remote-jobs",
    creator: { "@type": "Person", name: MAKER.name, url: MAKER.portfolio },
    keywords: ["remote work", "remote jobs", "tech hiring", "job market"],
    variableMeasured: [
      "Open remote roles",
      "Companies hiring",
      "Share of open roles that are remote",
      "Remote roles by kind of work",
      "Companies by where they hire",
      "Companies by remote policy",
      "Tech stacks at companies hiring now",
      "Share of remote roles that show pay",
    ],
  };
}

const ORGANIZATION_ID = `${SITE_URL}/#organization`;

/** Who runs the site and what it is, for the homepage: name, logo, maker and source. */
export function siteJsonLd(description: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: SITE_BRAND,
        alternateName: SITE_NAME,
        url: absoluteUrl("/"),
        logo: { "@type": "ImageObject", url: absoluteUrl("/icons/icon-512.png"), width: 512, height: 512 },
        description,
        founder: { "@type": "Person", name: MAKER.name, url: MAKER.portfolio, sameAs: [MAKER.github, MAKER.linkedin] },
        sameAs: [BLUESKY_URL, REPOSITORY_URL],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_BRAND,
        alternateName: [SITE_NAME, new URL(SITE_URL).host],
        url: absoluteUrl("/"),
        description,
        inLanguage: "en",
        publisher: { "@id": ORGANIZATION_ID },
      },
    ],
  };
}

