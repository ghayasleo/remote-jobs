import { describe, expect, it } from "vitest";
import { domainOf, excerpt, extractKeywords, parseCompanyFile, splitSections, toListItem } from "@/lib/data/parse";

const AUTOMATTIC = `---
title: "Automattic"
slug: automattic
website: https://www.automattic.com/
careers_url: https://automattic.com/work-with-us/
region: worldwide
remote_policy: fully-remote
company_size: enterprise
technologies:
  - javascript
  - php
addedAt: 2015-10-29
updatedAt: 2022-10-30
redirectFrom:
  - /companies/automattic-inc
  - /automattic-inc
---

## Company blurb

We are the people behind [WordPress.com](https://wordpress.com), **WooCommerce** and more. We believe in making the web a better place.

## Company technologies

WordPress, JavaScript (Node/React/Redux), PHP, AWS

## How to apply

Visit [our careers page](https://automattic.com/work-with-us/).
`;

describe("parseCompanyFile", () => {
  const company = parseCompanyFile("automattic", AUTOMATTIC)!;

  it("reads the frontmatter fields", () => {
    expect(company).toMatchObject({
      slug: "automattic",
      name: "Automattic",
      website: "https://www.automattic.com/",
      domain: "automattic.com",
      careersUrl: "https://automattic.com/work-with-us/",
      region: "worldwide",
      remotePolicy: "fully-remote",
      companySize: "enterprise",
      technologies: ["javascript", "php"],
      addedAt: "2015-10-29",
      updatedAt: "2022-10-30",
      aliases: ["automattic-inc", "automattic-inc"],
    });
  });

  it("builds a plain-text blurb from the Company blurb section", () => {
    expect(company.blurb).toBe(
      "We are the people behind WordPress.com, WooCommerce and more. We believe in making the web a better place.",
    );
  });

  it("keeps sections in order with known ids", () => {
    expect(company.sections.map((section) => [section.id, section.title])).toEqual([
      ["blurb", "Company blurb"],
      ["technologies", "Company technologies"],
      ["howToApply", "How to apply"],
    ]);
  });

  it("fills in defaults for missing optional fields", () => {
    const minimal = parseCompanyFile("tiny", "---\ntitle: Tiny\nwebsite: https://tiny.dev\n---\n")!;
    expect(minimal).toMatchObject({
      careersUrl: null,
      region: "other",
      remotePolicy: "",
      companySize: null,
      technologies: [],
      addedAt: null,
      aliases: [],
      blurb: "",
      sections: [],
    });
  });

  it("rejects files without a name, website or frontmatter", () => {
    expect(parseCompanyFile("x", "---\ntitle: No site\n---\n")).toBeNull();
    expect(parseCompanyFile("x", "# Just markdown\n")).toBeNull();
    expect(parseCompanyFile("x", "---\ntitle: [unclosed\n---\n")).toBeNull();
  });

  it("ignores dates that aren't YYYY-MM-DD", () => {
    const odd = parseCompanyFile("odd", "---\ntitle: Odd\nwebsite: https://odd.io\naddedAt: soon\n---\n")!;
    expect(odd.addedAt).toBeNull();
  });
});

describe("toListItem", () => {
  it("drops profile-only fields and keeps only new words from the stack section", () => {
    const item = toListItem(parseCompanyFile("automattic", AUTOMATTIC)!);
    expect(item).not.toHaveProperty("sections");
    expect(item).not.toHaveProperty("aliases");
    // "WordPress, JavaScript (Node/React/Redux), PHP, AWS": javascript and php
    // are already technologies, and WordPress is in the blurb.
    expect(item.keywords).toBe("node react redux aws");
  });
});

describe("splitSections", () => {
  it("skips empty sections and labels unknown ones as other", () => {
    expect(splitSections("intro\n\n## Perks\n\nGood ones\n\n## Region\n\n")).toEqual([
      { id: "other", title: "Perks", markdown: "Good ones" },
    ]);
  });
});

describe("excerpt", () => {
  it("cuts long text at a sentence when one ends past the halfway mark", () => {
    const text = `${"word ".repeat(20).trim()}. ${"more ".repeat(40)}`;
    expect(excerpt(text, 160)).toBe(`${"word ".repeat(20).trim()}.`);
  });

  it("otherwise cuts at a word boundary with an ellipsis", () => {
    expect(excerpt("alpha beta gamma delta", 14)).toBe("alpha beta…");
  });

  it("removes Markdown syntax and hard line breaks", () => {
    expect(excerpt("**Bold** [link](https://x.y) `code`\\\nnext line")).toBe("Bold link code next line");
  });
});

describe("extractKeywords", () => {
  it("keeps tech-style tokens once, without stop words or known words", () => {
    expect(extractKeywords("We use C#, .NET and Node.js. And node.js again!", "ACME .net")).toBe("c# node.js again");
  });
});

describe("domainOf", () => {
  it("strips www and handles invalid URLs", () => {
    expect(domainOf("https://www.example.com/path")).toBe("example.com");
    expect(domainOf("not a url")).toBeNull();
  });
});
