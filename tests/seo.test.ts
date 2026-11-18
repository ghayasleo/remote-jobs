import { describe, expect, it } from "vitest";
import type { CompanyProfile } from "@/lib/data/parse";
import { clip, companyJsonLd, companySeo, insightsDatasetJsonLd, rolesPhrase, siteJsonLd } from "@/lib/seo";

const company: CompanyProfile = {
  slug: "acme",
  name: "Acme",
  website: "https://acme.dev",
  domain: "acme.dev",
  careersUrl: null,
  region: "europe",
  remotePolicy: "fully-remote",
  companySize: "small",
  technologies: [],
  addedAt: null,
  updatedAt: null,
  blurb: "Acme builds rockets for coyotes.",
  aliases: [],
  sections: [],
};

describe("companySeo", () => {
  it("leads with open roles when the company is hiring", () => {
    expect(companySeo(company, { total: 12, remote: 5 })).toEqual({
      title: "Acme remote jobs: 5 remote roles open now",
      description: "Acme is fully remote and hires in Europe. Hiring now: 5 remote roles. Acme builds rockets for coyotes.",
    });
  });

  it("answers 'is it remote?' when it isn't hiring", () => {
    expect(companySeo(company, null).title).toBe("Is Acme remote? Fully remote, hires in Europe");
    expect(companySeo({ ...company, remotePolicy: "" }, null).title).toBe("Is Acme remote? Remote-friendly, hires in Europe");
  });
});

describe("rolesPhrase", () => {
  it("prefers remote roles and handles singulars and zero", () => {
    expect(rolesPhrase({ total: 3, remote: 1 })).toBe("1 remote role");
    expect(rolesPhrase({ total: 3, remote: 0 })).toBe("3 open roles");
    expect(rolesPhrase({ total: 0, remote: 0 })).toBeNull();
  });
});

describe("clip", () => {
  it("cuts at a word with an ellipsis", () => {
    expect(clip("one two three four", 12)).toBe("one two…");
    expect(clip("short", 12)).toBe("short");
  });
});

describe("companyJsonLd", () => {
  it("describes the organization and its breadcrumb", () => {
    const [organization, breadcrumb] = companyJsonLd(company)["@graph"];
    expect(organization).toMatchObject({
      "@type": "Organization",
      name: "Acme",
      url: "https://acme.dev",
      numberOfEmployees: { minValue: 11, maxValue: 50 },
    });
    expect(breadcrumb.itemListElement).toHaveLength(2);
  });
});

describe("insightsDatasetJsonLd", () => {
  it("describes the dataset with its date", () => {
    const dataset = insightsDatasetJsonLd({ companies: 876 }, "2026-11-18T10:00:00.000Z");
    expect(dataset["@type"]).toBe("Dataset");
    expect(dataset.description.length).toBeGreaterThan(50);
    expect(dataset.description).toContain("876");
    expect(dataset.dateModified).toBe("2026-11-18T10:00:00.000Z");
    expect(dataset.temporalCoverage).toBe("2026-11-18");
  });
});

describe("siteJsonLd", () => {
  it("names the site's organization, logo and publisher", () => {
    const [organization, website] = siteJsonLd("A directory.")["@graph"];
    expect(organization["@type"]).toBe("Organization");
    expect(organization.logo?.url).toMatch(/\/icons\/icon-512\.png$/);
    expect(organization.sameAs).toContain("https://github.com/ghayasleo/remote-jobs");
    expect(website.publisher?.["@id"]).toBe(organization["@id"]);
  });
});
