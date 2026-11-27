import { describe, expect, it } from "vitest";
import { compareWithRole, readabilityChecks, type CvDocument } from "@/lib/cv/analyze";
import { findSkills } from "@/lib/cv/skills";

const CV = `Ada Lovelace
ada@example.com · +44 20 7946 0958 · linkedin.com/in/ada

Experience
Senior Backend Engineer, Acme — Mar 2021 – Present
Built payment services in Go and PostgreSQL on AWS with Kubernetes and Terraform.
Backend Engineer, Beta — Jan 2018 – Feb 2021
Node.js and TypeScript APIs (REST, GraphQL), Redis caching, CI/CD with GitHub Actions.

Education
BSc Computer Science, 2017

Skills
Go, TypeScript, Node.js, PostgreSQL, AWS, Docker, Kubernetes
`;

const doc = (text: string, extra: Partial<CvDocument> = {}): CvDocument => ({ text, kind: "text", pages: null, layout: null, ...extra });
const status = (checks: ReturnType<typeof readabilityChecks>, id: string) => checks.find((check) => check.id === id)?.status;

describe("findSkills", () => {
  it("finds skills however they're written", () => {
    const names = findSkills("We use golang, k8s, Postgres, React.js and node, plus CI/CD.").map((skill) => skill.name);
    expect(names).toEqual(expect.arrayContaining(["Go", "Kubernetes", "PostgreSQL", "React", "Node.js", "CI/CD"]));
  });

  it("doesn't mistake everyday words for skills", () => {
    const names = findSkills("Go ahead and rest assured: we are hiring for growth. You excel at writing. Google is great.").map(
      (skill) => skill.name,
    );
    expect(names).not.toContain("REST");
    expect(names).not.toContain("Excel");
    // "Go ahead" is capitalised at the start of a sentence; it's the one ambiguity we accept.
    expect(names.filter((name) => name !== "Go")).toEqual([]);
  });
});

describe("readabilityChecks", () => {
  it("passes a clean, single-column CV", () => {
    const checks = readabilityChecks(doc(CV.repeat(3)));
    expect(checks.filter((check) => check.status === "problem")).toEqual([]);
    expect(status(checks, "sections")).toBe("good");
    expect(status(checks, "dates")).toBe("good");
  });

  it("flags a PDF with no readable text", () => {
    const checks = readabilityChecks(doc("  ", { kind: "pdf", pages: 2 }));
    expect(checks).toHaveLength(1);
    expect(checks[0]).toMatchObject({ id: "text", status: "problem" });
  });

  it("flags two-column layouts, missing email and icon glyphs", () => {
    const text = `${CV.replace(/ada@example\.com · /, "")}   `.repeat(3);
    const checks = readabilityChecks(doc(text, { kind: "pdf", pages: 1, layout: { rows: 40, splitRows: 20 } }));
    expect(status(checks, "columns")).toBe("problem");
    expect(status(checks, "contact")).toBe("problem");
    expect(status(checks, "icons")).toBe("tip");
  });
});

describe("compareWithRole", () => {
  const role = `We're looking for a backend engineer with 5+ years of experience building APIs in Go.
You'll work with PostgreSQL, Kafka and Kubernetes on GCP. Experience with Rust is a plus.
You must be located in the EU and able to overlap with CET business hours. We can't sponsor visas.`;

  it("splits the posting's skills into found and missing", () => {
    const result = compareWithRole(CV, role);
    expect(result.found.map((skill) => skill.name)).toEqual(expect.arrayContaining(["Go", "PostgreSQL", "Kubernetes"]));
    expect(result.missing.map((skill) => skill.name)).toEqual(expect.arrayContaining(["Kafka", "GCP", "Rust"]));
  });

  it("quotes years of experience and location or visa requirements", () => {
    const result = compareWithRole(CV, role);
    expect(result.years[0]).toMatch(/^5\+ years of experience/);
    expect(result.constraints.join(" ")).toMatch(/located in the EU/);
    expect(result.constraints.join(" ")).toMatch(/sponsor visas/);
  });
});

describe("readabilityChecks layouts", () => {
  const long = CV.repeat(3);
  it("spots a sidebar layout from where rows start", () => {
    const checks = readabilityChecks(doc(long, { kind: "pdf", pages: 1, layout: { rows: 30, splitRows: 2, leftStarts: 12, rightStarts: 14 } }));
    expect(status(checks, "columns")).toBe("problem");
  });
  it("leaves a single column alone", () => {
    const checks = readabilityChecks(doc(long, { kind: "pdf", pages: 1, layout: { rows: 30, splitRows: 1, leftStarts: 28, rightStarts: 2 } }));
    expect(status(checks, "columns")).toBeUndefined();
  });
});
