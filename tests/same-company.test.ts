import { describe, expect, it } from "vitest";
import { baseDomain, mergeDuplicateCompanies, sameName, similar } from "@/lib/data/same-company";

type Entry = { slug: string; name: string; domain: string | null; aliases: string[]; sections: { markdown: string }[] };
const entry = (slug: string, name: string, domain: string | null, profile = "About us."): Entry => ({
  slug,
  name,
  domain,
  aliases: [],
  sections: [{ markdown: profile }],
});
const list = (...entries: Entry[]) => new Map(entries.map((company) => [company.slug, company]));

describe("same company", () => {
  it("compares names loosely or strictly", () => {
    expect(similar("O'Reilly Media", "O'Reilly Online Learning")).toBe(true);
    expect(similar("Incsub", "inDrive")).toBe(false);
    expect(sameName("Stripe", "Stripe Inc")).toBe(true);
    expect(sameName("Flip", "Flipboard")).toBe(false);
  });

  it("reduces hosts to the registrable domain", () => {
    expect(baseDomain("careers.oreilly.com")).toBe("oreilly.com");
    expect(baseDomain("www.enjoei.com.br")).toBe("enjoei.com.br");
    expect(baseDomain("adzuna.co.uk")).toBe("adzuna.co.uk");
  });
});

describe("mergeDuplicateCompanies", () => {
  it("folds a company listed twice into one, and redirects the other slug", () => {
    const companies = list(
      entry("oreilly-media", "O'Reilly Media", "oreilly.com", "A long profile with every section filled in."),
      entry("oreilly-online-learning", "O'Reilly Online Learning", "oreilly.com"),
    );
    expect(mergeDuplicateCompanies(companies, () => false)).toEqual(["oreilly-media ← oreilly-online-learning"]);
    expect([...companies.keys()]).toEqual(["oreilly-media"]);
    expect(companies.get("oreilly-media")!.aliases).toEqual(["oreilly-online-learning"]);
  });

  it("keeps the entry with a job board", () => {
    const companies = list(
      entry("oreilly-media", "O'Reilly Media", "oreilly.com", "A long profile with every section filled in."),
      entry("oreilly-online-learning", "O'Reilly Online Learning", "oreilly.com"),
    );
    mergeDuplicateCompanies(companies, (slug) => slug === "oreilly-online-learning");
    expect([...companies.keys()]).toEqual(["oreilly-online-learning"]);
  });

  it("leaves different companies on one domain alone (an upstream mistake), and different domains", () => {
    const companies = list(
      entry("incsub", "Incsub", "incsub.com"),
      entry("indrive", "inDrive", "incsub.com"),
      entry("enjoei", "Enjoei", "enjoei.com.br"),
      entry("zup", "Zup", "zup.com.br"),
    );
    expect(mergeDuplicateCompanies(companies, () => false)).toEqual([]);
    expect(companies.size).toBe(4);
  });
});
