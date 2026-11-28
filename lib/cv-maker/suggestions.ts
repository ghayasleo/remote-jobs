// What to change in a CV, and why. Plain rules, no AI and no made-up "ATS
// score": each suggestion names a concrete problem that trips up hiring
// systems or recruiters, and where it is, so the editor can show it next to
// the field. People stay free to ignore any of them.

import { unsupportedCharacters } from "./latex";
import { SECTION_TYPES, type CvData, type CvSection } from "./model";

export type SuggestionLevel = "fix" | "tip";

export type Suggestion = {
  id: string;
  level: SuggestionLevel;
  /** What it's about: "basics.email", "remote.timezone", "section:<id>", "item:<id>" or "bullet:<id>". */
  target: string;
  title: string;
  detail: string;
};

/** Headings hiring systems recognise. Anything else may not be read as the section it is. */
const STANDARD_HEADINGS = new Set(
  [
    "experience", "work experience", "professional experience", "employment", "employment history", "work history",
    "relevant experience", "education", "skills", "technical skills", "core skills", "key skills", "projects",
    "certifications", "licenses & certifications", "licenses and certifications", "certificates", "awards",
    "honors", "honors & awards", "awards & honors", "publications", "languages", "volunteering", "volunteer experience",
    "summary", "profile", "professional summary", "additional information", "interests", "leadership", "activities",
    "courses", "training", "open source", "achievements", "research", "teaching",
  ],
);

const WEAK_OPENERS = /^(responsible for|worked on|helped|assisted( with)?|tasked with|duties (included|include)|in charge of|involved in|participated in|was part of|handled)\b/i;
const FIRST_PERSON = /\b(i|me|my|myself)\b/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** "Jan 2022", "January 2022", "2022", "01/2022", "2022-01": recognised, so order and format can be checked. */
function parseDate(value: string): { time: number; format: string } | null {
  const text = value.trim();
  if (!text) return null;
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  let match = /^([a-z]{3,9})\.?\s+(\d{4})$/i.exec(text);
  if (match) {
    const month = months.indexOf(match[1].slice(0, 3).toLowerCase());
    if (month >= 0) return { time: Date.UTC(Number(match[2]), month), format: match[1].length > 4 ? "Month YYYY" : "Mon YYYY" };
  }
  match = /^(\d{1,2})[/.-](\d{4})$/.exec(text);
  if (match) return { time: Date.UTC(Number(match[2]), Number(match[1]) - 1), format: "MM/YYYY" };
  match = /^(\d{4})[/.-](\d{1,2})$/.exec(text);
  if (match) return { time: Date.UTC(Number(match[1]), Number(match[2]) - 1), format: "YYYY-MM" };
  match = /^(\d{4})$/.exec(text);
  if (match) return { time: Date.UTC(Number(match[1]), 0), format: "YYYY" };
  return null;
}

/** Every piece of text the person typed, with where it lives. */
function allText(cv: CvData): { target: string; text: string }[] {
  const out = [
    ...Object.entries(cv.basics)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .map(([key, text]) => ({ target: `basics.${key}`, text })),
    ...cv.basics.links.map((link) => ({ target: "basics.links", text: `${link.label} ${link.url}` })),
    ...Object.entries(cv.remote).map(([key, text]) => ({ target: `remote.${key}`, text })),
  ];
  for (const section of cv.sections) {
    out.push({ target: `section:${section.id}`, text: section.title });
    if (section.type === "experience" || section.type === "education") {
      for (const item of section.items) {
        out.push({ target: `item:${item.id}`, text: ["role" in item ? item.role : item.degree, item.organisation, item.location, item.start, item.end].join(" ") });
        for (const bullet of item.bullets) out.push({ target: `bullet:${bullet.id}`, text: bullet.text });
      }
    } else if (section.type === "projects") {
      for (const item of section.items) {
        out.push({ target: `item:${item.id}`, text: `${item.name} ${item.link}` });
        for (const bullet of item.bullets) out.push({ target: `bullet:${bullet.id}`, text: bullet.text });
      }
    } else if (section.type === "skills") {
      for (const group of section.groups) out.push({ target: `item:${group.id}`, text: `${group.label} ${group.skills}` });
    } else {
      for (const item of section.items) out.push({ target: `item:${item.id}`, text: item.text });
    }
  }
  return out;
}

function sectionSuggestions(section: CvSection, add: (suggestion: Omit<Suggestion, "id">) => void) {
  const title = section.title.trim();
  if (!title) {
    add({ level: "fix", target: `section:${section.id}`, title: "Give this section a heading", detail: `Hiring systems find sections by their headings. "${SECTION_TYPES[section.type].standardTitle}" is the one they expect.` });
  } else if (!STANDARD_HEADINGS.has(title.toLowerCase())) {
    add({
      level: "tip",
      target: `section:${section.id}`,
      title: `Use a standard heading instead of "${title}"`,
      detail: `Hiring systems look for headings like "${SECTION_TYPES[section.type].standardTitle}". A creative one may not be read as that section, and what's in it can be missed.`,
    });
  }

  if (section.type === "experience" || section.type === "education") {
    const formats = new Set<string>();
    let previousStart: number | null = null;
    let outOfOrder = false;
    for (const item of section.items) {
      const name = "role" in item ? item.role : item.degree;
      const label = section.type === "experience" ? "role" : "degree";
      if (!name.trim()) add({ level: "fix", target: `item:${item.id}`, title: `Add the ${label}`, detail: section.type === "experience" ? "The job title is what recruiters and hiring systems search for first." : "Add the degree or qualification, like \"BSc Computer Science\"." });
      if (!item.organisation.trim()) add({ level: "fix", target: `item:${item.id}`, title: section.type === "experience" ? "Add the company" : "Add the school or university", detail: "Every entry needs who it was with; hiring systems read it as its own field." });
      const start = parseDate(item.start);
      const end = item.current ? null : parseDate(item.end);
      if (section.type === "experience" && (!item.start.trim() || (!item.current && !item.end.trim()))) {
        add({ level: "fix", target: `item:${item.id}`, title: "Add start and end dates", detail: "Hiring systems work out your years of experience from these. Use month and year, like \"Jan 2022\", and tick \"I work here now\" for a current role." });
      }
      if ((item.start.trim() && !start) || (!item.current && item.end.trim() && !end)) {
        add({ level: "tip", target: `item:${item.id}`, title: "Write dates as month and year", detail: "\"Jan 2022\" or \"01/2022\" is read reliably; other formats may not be." });
      }
      if (start) formats.add(start.format);
      if (end) formats.add(end.format);
      if (start && end && end.time < start.time) add({ level: "fix", target: `item:${item.id}`, title: "The end date is before the start date", detail: "Check the dates on this entry." });
      if (item.current && item.end.trim()) add({ level: "tip", target: `item:${item.id}`, title: "Current role with an end date", detail: "It's marked as current, so the end date is shown as \"Present\" and what's typed there is ignored." });
      if (start && previousStart !== null && start.time > previousStart) outOfOrder = true;
      if (start) previousStart = start.time;

      if (section.type === "experience") {
        const bullets = item.bullets.filter((bullet) => bullet.text.trim());
        if (bullets.length === 0 && name.trim()) {
          add({ level: "tip", target: `item:${item.id}`, title: "Add what you achieved here", detail: "Two to five bullets, each starting with a strong verb, tell a recruiter what you did and how well." });
        } else if (bullets.length > 7) {
          add({ level: "tip", target: `item:${item.id}`, title: "Trim this role to your strongest points", detail: `It has ${bullets.length} bullets. Five or six of the most relevant read better than a long list.` });
        }
        if (bullets.length >= 2 && !bullets.some((bullet) => /\d/.test(bullet.text))) {
          add({ level: "tip", target: `item:${item.id}`, title: "Show impact with a number", detail: "A figure (a percentage, users, money, time saved, team size) makes a result concrete. Add one where it's true." });
        }
      }
    }
    if (formats.size > 1) add({ level: "tip", target: `section:${section.id}`, title: "Use one date format throughout", detail: `This section mixes ${[...formats].join(", ")}. Pick one, like "Jan 2022".` });
    if (outOfOrder) add({ level: "tip", target: `section:${section.id}`, title: "Put the most recent first", detail: "Recruiters and hiring systems expect newest to oldest." });
  }

  if (section.type === "skills") {
    const skills = section.groups.flatMap((group) => group.skills.split(/[,;\n]/).map((skill) => skill.trim()).filter(Boolean));
    if (skills.length === 0) add({ level: "tip", target: `section:${section.id}`, title: "List your skills", detail: "Recruiters search hiring systems by skill. List the tools, languages and methods you really use, separated by commas." });
    if (skills.length > 40) add({ level: "tip", target: `section:${section.id}`, title: "Keep the skills list focused", detail: `There are ${skills.length}. A long list dilutes the ones that matter; keep what you'd be happy to be asked about.` });
    if (section.groups.some((group) => /\b(\d{1,3}\s?%|★|☆|\d\/(5|10))/.test(group.skills))) {
      add({ level: "tip", target: `section:${section.id}`, title: "Drop skill ratings", detail: "Percentages, stars and \"4/5\" don't mean much to a recruiter and confuse hiring systems. List the skill; show the level in your experience." });
    }
  }
}

export function cvSuggestions(cv: CvData, options: { pages?: number } = {}): Suggestion[] {
  const out: Suggestion[] = [];
  const add = (suggestion: Omit<Suggestion, "id">) => out.push({ ...suggestion, id: `${suggestion.target}:${out.length}` });
  const { basics, remote } = cv;

  // Contact details.
  if (!basics.name.trim()) add({ level: "fix", target: "basics.name", title: "Add your name", detail: "It goes at the top in large type, and hiring systems read it as your name." });
  if (!basics.email.trim()) add({ level: "fix", target: "basics.email", title: "Add your email address", detail: "It's how recruiters reply, and hiring systems match your application to it." });
  else if (!EMAIL.test(basics.email.trim())) add({ level: "fix", target: "basics.email", title: "Check your email address", detail: "It doesn't look like a complete email address." });
  if (!basics.phone.trim()) add({ level: "tip", target: "basics.phone", title: "Add a phone number", detail: "Many recruiters call before an interview. Include your country code." });
  else if (!basics.phone.trim().startsWith("+")) add({ level: "tip", target: "basics.phone", title: "Add your country code", detail: "Remote employers are often in another country, so write it like \"+92 300 1234567\"." });
  if (!basics.location.trim()) add({ level: "tip", target: "basics.location", title: "Add your city and country", detail: "Many remote roles are open only to certain countries; your location lets a recruiter check at a glance." });
  if (!basics.headline.trim()) add({ level: "tip", target: "basics.headline", title: "Add a headline", detail: "A line under your name, like \"Senior Frontend Engineer\", says what you do in one glance and matches the job titles recruiters search for." });

  // Summary.
  const summaryWords = basics.summary.split(/\s+/).filter(Boolean).length;
  if (summaryWords === 0) add({ level: "tip", target: "basics.summary", title: "Add a short summary", detail: "Two or three lines: what you do, for how long, and your strongest result." });
  else if (summaryWords > 90) add({ level: "tip", target: "basics.summary", title: "Shorten your summary", detail: `It's ${summaryWords} words. Recruiters skim; two or three lines (about 40 to 70 words) get read.` });
  if (FIRST_PERSON.test(basics.summary)) add({ level: "tip", target: "basics.summary", title: "Leave out \"I\" and \"my\"", detail: "CVs are written without the first person: \"Frontend engineer with 7 years…\" rather than \"I am a frontend engineer…\"." });

  // Remote work.
  if (!remote.timezone.trim()) add({ level: "tip", target: "remote.timezone", title: "Add your time zone", detail: "Remote employers check how your hours overlap with the team's before anything else." });
  if (!remote.authorization.trim()) add({ level: "tip", target: "remote.authorization", title: "Say where you can work", detail: "For example \"Authorized to work in the EU\" or \"Available as a contractor worldwide\". Many remote roles are limited by country." });

  // Sections.
  const experience = cv.sections.filter((section) => section.type === "experience");
  const hasExperience = experience.some((section) => section.type === "experience" && section.items.some((item) => item.role.trim() || item.organisation.trim()));
  if (!hasExperience) add({ level: "fix", target: "sections", title: "Add your work experience", detail: "It's the section recruiters read first. Internships, freelance work and open-source contributions count." });
  if (!cv.sections.some((section) => section.type === "education")) add({ level: "tip", target: "sections", title: "Add your education", detail: "Most hiring systems have an education field, and some roles filter on it." });
  if (!cv.sections.some((section) => section.type === "skills")) add({ level: "tip", target: "sections", title: "Add a Skills section", detail: "Recruiters search by skill; a plain list makes yours easy to find." });
  for (const section of cv.sections) sectionSuggestions(section, add);

  // Bullets, wherever they are.
  const seen = new Map<string, string>();
  for (const section of cv.sections) {
    if (section.type !== "experience" && section.type !== "projects") continue;
    for (const item of section.items) {
      for (const bullet of item.bullets) {
        const text = bullet.text.trim().replace(/^[•*\-–—]\s*/, "");
        if (!text) continue;
        const target = `bullet:${bullet.id}`;
        if (WEAK_OPENERS.test(text)) add({ level: "tip", target, title: "Start with a strong verb", detail: "\"Responsible for…\" describes a job; \"Led…\", \"Built…\", \"Cut…\", \"Grew…\" describe what you did." });
        if (FIRST_PERSON.test(text)) add({ level: "tip", target, title: "Leave out \"I\" and \"my\"", detail: "Start with the verb: \"Built the billing service…\" rather than \"I built…\"." });
        if (text.length > 240) add({ level: "tip", target, title: "Shorten this bullet", detail: "Keep each bullet to one or two lines; split it if it covers two things." });
        else if (text.length < 25) add({ level: "tip", target, title: "Say a little more here", detail: "What did you do, and what came of it?" });
        const key = text.toLowerCase();
        if (seen.has(key)) add({ level: "tip", target, title: "This bullet appears twice", detail: "Keep it once, where it fits best." });
        seen.set(key, target);
      }
    }
  }

  // Characters the PDF can't show.
  for (const { target, text } of allText(cv)) {
    const bad = unsupportedCharacters(text);
    if (bad.length > 0) {
      add({
        level: "fix",
        target,
        title: "Remove characters the PDF can't show",
        detail: `${bad.slice(0, 6).join(" ")} ${bad.length === 1 ? "is" : "are"} left out of the PDF. Emoji and symbols also trip up hiring systems; use plain words instead.`,
      });
    }
  }

  // Length, once the PDF exists.
  if (options.pages && options.pages > 2) {
    add({ level: "fix", target: "length", title: `Bring it down to two pages (it's ${options.pages})`, detail: "Recruiters rarely read past page two. Cut older roles to a line each and keep only the strongest bullets." });
  }

  return out;
}

/** The same rules, as advice that doesn't depend on what's written: shown next to the editor. */
export const GUIDANCE = {
  do: [
    "Keep one column and the standard headings: Experience, Education, Skills.",
    "Start bullets with a verb and add a number where it's true.",
    "Write dates as month and year, newest first.",
    "Tailor a copy for each role you apply to; keep this main CV complete.",
    "Send the PDF made here: its text is real text that hiring systems can read.",
  ],
  dont: [
    "Add a photo, logo, icons or charts. Hiring systems skip them, and photos invite bias.",
    "Rate your skills with bars, stars or percentages.",
    "Put contact details in a page header or footer; some systems never read them.",
    "Invent experience or skills to match a posting. Interviews find out.",
    "Write \"References available on request\". It's assumed.",
  ],
};
