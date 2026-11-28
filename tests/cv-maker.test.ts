import { describe, expect, it } from "vitest";
import { cvToLatex, esc, safeUrl, unsupportedCharacters } from "@/lib/cv-maker/latex";
import { cleanCvData, starterCv, type CvData } from "@/lib/cv-maker/model";
import { cvSuggestions } from "@/lib/cv-maker/suggestions";
import { tailorCv } from "@/lib/cv-maker/tailor";

function sample(): CvData {
  const cv = starterCv("Ayesha Khan", "ayesha@example.com");
  cv.basics.headline = "Frontend Engineer";
  cv.basics.phone = "+92 300 1234567";
  cv.basics.location = "Lahore, Pakistan";
  cv.remote.timezone = "UTC+5";
  cv.remote.authorization = "Contractor, worldwide";
  const [experience, education, skills] = cv.sections;
  if (experience.type === "experience") {
    experience.items = [
      {
        id: "e1",
        role: "Frontend Engineer",
        organisation: "Acme",
        location: "Remote",
        start: "Jan 2022",
        end: "",
        current: true,
        bullets: [
          { id: "b1", text: "Wrote the onboarding docs for 30 new hires" },
          { id: "b2", text: "Cut load time 38% by moving React rendering to the server with Next.js" },
          { id: "b3", text: "Built the GraphQL gateway in TypeScript serving 2M requests a day" },
        ],
      },
    ];
  }
  if (education.type === "education") {
    education.items = [{ id: "d1", degree: "BS Computer Science", organisation: "LUMS", location: "", start: "2013", end: "2017", current: false, bullets: [] }];
  }
  if (skills.type === "skills") skills.groups = [{ id: "g1", label: "Tools", skills: "Python, React, AWS, TypeScript" }];
  return cv;
}

describe("LaTeX output", () => {
  it("escapes everything a person types, so it can't become a command", () => {
    expect(esc("50% of R&D_ops #1 {x} $5 ~ ^ \\input{secret}")).toBe(
      "50\\% of R\\&D\\_ops \\#1 \\{x\\} \\$5 \\textasciitilde{} \\textasciicircum{} \\textbackslash{}input\\{secret\\}",
    );
  });

  it("drops characters pdfLaTeX can't typeset and reports them", () => {
    expect(unsupportedCharacters("Great team 🚀 — café")).toEqual(["🚀"]);
    expect(esc("Great 🚀")).toBe("Great ");
  });

  it("only links to web and mail addresses", () => {
    expect(safeUrl("github.com/ayesha")).toBe("https://github.com/ayesha");
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("https://x.com/a b")).toBeNull();
    expect(safeUrl("https://site.com/100%#top")).toBe("https://site.com/100\\%\\#top");
  });

  it("makes a complete document with the ATS text mapping", () => {
    const tex = cvToLatex(sample());
    expect(tex).toContain("\\documentclass[10pt,a4paper]{article}");
    expect(tex).toContain("\\pdfgentounicode=1");
    expect(tex).toContain("\\cvsection{Experience}");
    expect(tex).toContain("Jan 2022 -- Present");
    expect(tex).toContain("\\href{mailto:ayesha@example.com}{ayesha@example.com}");
    expect(tex.trim().endsWith("\\end{document}")).toBe(true);
  });

  it("leaves out sections with nothing in them", () => {
    const cv = starterCv("A", "a@b.co");
    expect(cvToLatex(cv)).not.toContain("\\cvsection{Experience}");
  });
});

describe("cleaning CV data", () => {
  it("accepts a valid CV and rejects junk", () => {
    expect(cleanCvData(sample())?.basics.name).toBe("Ayesha Khan");
    expect(cleanCvData({ hello: "world" })).toBeNull();
  });
});

describe("suggestions", () => {
  it("flags missing essentials as fixes", () => {
    const titles = cvSuggestions(starterCv()).filter((s) => s.level === "fix").map((s) => s.title);
    expect(titles).toContain("Add your name");
    expect(titles).toContain("Add your email address");
    expect(titles).toContain("Add your work experience");
  });

  it("points at the exact bullet and heading", () => {
    const cv = sample();
    const [experience] = cv.sections;
    if (experience.type === "experience") experience.items[0].bullets.push({ id: "weak", text: "Responsible for the design system and its docs" });
    cv.sections[2].title = "My Toolbox";
    const found = cvSuggestions(cv);
    expect(found.some((s) => s.target === "bullet:weak" && s.title === "Start with a strong verb")).toBe(true);
    expect(found.some((s) => s.target === `section:${cv.sections[2].id}` && s.title.startsWith("Use a standard heading"))).toBe(true);
  });

  it("checks dates", () => {
    const cv = sample();
    const [experience] = cv.sections;
    if (experience.type === "experience") experience.items[0] = { ...experience.items[0], current: false, start: "Mar 2023", end: "Jan 2022" };
    expect(cvSuggestions(cv).some((s) => s.title === "The end date is before the start date")).toBe(true);
  });

  it("asks to shorten past two pages", () => {
    expect(cvSuggestions(sample(), { pages: 3 }).some((s) => s.target === "length")).toBe(true);
  });
});

describe("tailoring", () => {
  it("moves the most relevant bullets and skills up, without adding anything", () => {
    const main = sample();
    const { data, matched, gaps } = tailorCv(main, {
      title: "Senior Frontend Engineer",
      text: "You'll work with React, Next.js and TypeScript. Kubernetes and Terraform experience is a plus.",
    });
    const [experience] = data.sections;
    if (experience.type !== "experience") throw new Error("expected experience");
    expect(experience.items[0].bullets.map((b) => b.text)).toEqual([
      "Cut load time 38% by moving React rendering to the server with Next.js",
      "Built the GraphQL gateway in TypeScript serving 2M requests a day",
      "Wrote the onboarding docs for 30 new hires",
    ]);
    const skills = data.sections[2];
    if (skills.type !== "skills") throw new Error("expected skills");
    expect(skills.groups[0].skills.split(", ").slice(0, 2).sort()).toEqual(["React", "TypeScript"]);
    expect(matched).toEqual(expect.arrayContaining(["React", "TypeScript"]));
    expect(gaps).toEqual(expect.arrayContaining(["Kubernetes", "Terraform"]));
    // The main CV is untouched.
    const original = main.sections[0];
    if (original.type === "experience") expect(original.items[0].bullets[0].id).toBe("b1");
  });

  it("ignores what the posting says about how the company hires", () => {
    const { gaps } = tailorCv(sample(), {
      title: "Frontend Engineer",
      text: "You'll build our web app in Vue. We are an Equal Employment Opportunity Employer. These AI tools assist our recruitment team; final hiring decisions are made by people.",
    });
    expect(gaps).toContain("Vue");
    expect(gaps).not.toContain("Recruitment");
  });
});
