// The CV maker's data: what a person writes, kept apart from how it looks.
// The same data is turned into LaTeX (lib/cv-maker/latex.ts) and checked for
// what helps or hurts with hiring systems (lib/cv-maker/suggestions.ts).
// Shared by the browser, the API routes and the account MCP server.

import { z } from "zod";

export const TEMPLATES = {
  classic: { label: "Classic", description: "Serif, small-caps headings. Traditional and calm." },
  modern: { label: "Modern", description: "Sans-serif, bold headings. Clean and current." },
} as const;
export type TemplateId = keyof typeof TEMPLATES;

export const SECTION_TYPES = {
  experience: { label: "Experience", standardTitle: "Experience" },
  education: { label: "Education", standardTitle: "Education" },
  skills: { label: "Skills", standardTitle: "Skills" },
  projects: { label: "Projects", standardTitle: "Projects" },
  certifications: { label: "Certifications", standardTitle: "Certifications" },
  awards: { label: "Awards", standardTitle: "Awards" },
  languages: { label: "Languages", standardTitle: "Languages" },
  volunteering: { label: "Volunteering", standardTitle: "Volunteering" },
  custom: { label: "Other", standardTitle: "Additional Information" },
} as const;
export type SectionType = keyof typeof SECTION_TYPES;

const text = (max: number) => z.string().max(max).catch("");
const id = z.string().min(1).max(40);

const Bullet = z.object({ id, text: text(600) });
const Link = z.object({ id, label: text(60), url: text(300) });

const DatedItem = {
  id,
  start: text(20),
  end: text(20),
  current: z.boolean().catch(false),
  location: text(120),
  bullets: z.array(Bullet).max(20).catch([]),
};

const ExperienceItem = z.object({ ...DatedItem, role: text(140), organisation: text(140) });
const EducationItem = z.object({ ...DatedItem, degree: text(160), organisation: text(160) });
const ProjectItem = z.object({ id, name: text(140), link: text(300), bullets: z.array(Bullet).max(20).catch([]) });
const SkillGroup = z.object({ id, label: text(60), skills: text(600) });
const LineItem = z.object({ id, text: text(400) });

const sectionBase = { id, title: text(60) };
const Section = z.discriminatedUnion("type", [
  z.object({ ...sectionBase, type: z.literal("experience"), items: z.array(ExperienceItem).max(30) }),
  z.object({ ...sectionBase, type: z.literal("education"), items: z.array(EducationItem).max(15) }),
  z.object({ ...sectionBase, type: z.literal("projects"), items: z.array(ProjectItem).max(20) }),
  z.object({ ...sectionBase, type: z.literal("skills"), groups: z.array(SkillGroup).max(15) }),
  z.object({
    ...sectionBase,
    type: z.enum(["certifications", "awards", "languages", "volunteering", "custom"]),
    items: z.array(LineItem).max(30),
  }),
]);

export const CvDataSchema = z.object({
  version: z.literal(1).catch(1),
  basics: z.object({
    name: text(120),
    headline: text(140),
    email: text(160),
    phone: text(60),
    location: text(120),
    links: z.array(Link).max(6).catch([]),
    summary: text(1200),
  }),
  /** What remote employers ask about first: time zone, hours and where you can work. */
  remote: z.object({
    timezone: text(60),
    hours: text(120),
    authorization: text(240),
    experience: text(400),
  }),
  sections: z.array(Section).max(20),
  design: z.object({
    template: z.enum(["classic", "modern"]).catch("classic"),
    paper: z.enum(["a4", "letter"]).catch("a4"),
    fontSize: z.enum(["10", "10.5", "11"]).catch("10.5"),
  }),
});

export type CvData = z.infer<typeof CvDataSchema>;
export type CvSection = CvData["sections"][number];
export type ExperienceSection = Extract<CvSection, { type: "experience" }>;
export type EducationSection = Extract<CvSection, { type: "education" }>;
export type ProjectsSection = Extract<CvSection, { type: "projects" }>;
export type SkillsSection = Extract<CvSection, { type: "skills" }>;
export type LineSection = Extract<CvSection, { type: "certifications" | "awards" | "languages" | "volunteering" | "custom" }>;
export type CvBullet = z.infer<typeof Bullet>;

/** A CV as stored: the main one, or one tailored to a saved job. */
export type CvRecord = {
  id: string;
  kind: "main" | "tailored";
  jobKey: string | null;
  title: string;
  data: CvData;
  /** For a tailored CV: what the posting asks for that the CV doesn't show. */
  gaps: string[];
  updatedAt: string;
};

/** A CV in a list: enough to link to it. */
export type CvSummary = Pick<CvRecord, "id" | "kind" | "jobKey" | "title" | "updatedAt">;

export const newId = () => Math.random().toString(36).slice(2, 10);

export function emptySection(type: SectionType): CvSection {
  const title = SECTION_TYPES[type].standardTitle;
  switch (type) {
    case "experience":
      return { id: newId(), type, title, items: [emptyExperience()] };
    case "education":
      return {
        id: newId(),
        type,
        title,
        items: [{ id: newId(), degree: "", organisation: "", location: "", start: "", end: "", current: false, bullets: [] }],
      };
    case "projects":
      return { id: newId(), type, title, items: [{ id: newId(), name: "", link: "", bullets: [{ id: newId(), text: "" }] }] };
    case "skills":
      return { id: newId(), type, title, groups: [{ id: newId(), label: "", skills: "" }] };
    default:
      return { id: newId(), type, title, items: [{ id: newId(), text: "" }] };
  }
}

export function emptyExperience(): ExperienceSection["items"][number] {
  return {
    id: newId(),
    role: "",
    organisation: "",
    location: "",
    start: "",
    end: "",
    current: false,
    bullets: [{ id: newId(), text: "" }],
  };
}

/** Where a new CV starts: the sections almost every CV needs, in the usual order. */
export function starterCv(name = "", email = ""): CvData {
  return {
    version: 1,
    basics: { name, headline: "", email, phone: "", location: "", links: [], summary: "" },
    remote: { timezone: "", hours: "", authorization: "", experience: "" },
    sections: [emptySection("experience"), emptySection("education"), emptySection("skills")],
    design: { template: "classic", paper: "a4", fontSize: "10.5" },
  };
}

/** Validates CV data from outside (the browser, an MCP client), dropping anything it doesn't recognise. */
export function cleanCvData(value: unknown): CvData | null {
  const parsed = CvDataSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** All the CV's words, for matching against a job posting. */
export function cvPlainText(cv: CvData): string {
  const parts: string[] = [cv.basics.headline, cv.basics.summary, cv.remote.experience];
  for (const section of cv.sections) {
    parts.push(section.title);
    if (section.type === "experience" || section.type === "education") {
      for (const item of section.items) {
        parts.push("role" in item ? item.role : item.degree, item.organisation, ...item.bullets.map((b) => b.text));
      }
    } else if (section.type === "projects") {
      for (const item of section.items) parts.push(item.name, ...item.bullets.map((b) => b.text));
    } else if (section.type === "skills") {
      for (const group of section.groups) parts.push(group.label, group.skills);
    } else {
      for (const item of section.items) parts.push(item.text);
    }
  }
  return parts.filter(Boolean).join("\n");
}
