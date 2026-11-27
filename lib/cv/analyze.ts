import { findSkills } from "./skills";

// The CV check: what a hiring system is likely to read from a CV, and how the
// CV lines up with one posting. Everything here runs in the browser; the CV
// never leaves the device. There's no score: no tool can know how a given
// company's system is set up, so this reports concrete, checkable things.

export type CvDocument = {
  text: string;
  kind: "pdf" | "docx" | "text";
  /** PDF only. */
  pages: number | null;
  /**
   * PDF only: rows of text; how many have a wide gap mid-row (two columns, or
   * a table); and how many start at the left margin or well to the right of it
   * (a sidebar layout puts rows in both places).
   */
  layout: { rows: number; splitRows: number; leftStarts?: number; rightStarts?: number } | null;
};

export type CheckStatus = "good" | "tip" | "problem";
export type Check = { id: string; status: CheckStatus; title: string; detail: string };

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE = /(?:\+?\d[\s().-]?){9,15}\d/;
const LINKS = /(linkedin\.com\/in\/|github\.com\/|gitlab\.com\/|behance\.net\/|dribbble\.com\/)/i;
const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
const DATE = new RegExp(`\\b(?:${MONTH}\\s+\\d{4}|\\d{1,2}/\\d{4}|\\d{4}\\s*[–—-]\\s*(?:\\d{4}|present|current|now))\\b`, "gi");
// Private Use Area characters: icon fonts, which hiring systems read as junk.
const ICON_GLYPHS = /[-]/g;

const SECTIONS = [
  { id: "experience", label: "Experience", pattern: /^\s*(work |professional |relevant )?(experience|employment( history)?|work history|career history)\s*:?\s*$/im },
  { id: "education", label: "Education", pattern: /^\s*(education|academic background|qualifications)\s*:?\s*$/im },
  { id: "skills", label: "Skills", pattern: /^\s*((technical |core |key )?skills|technologies|tech stack|core competencies|expertise)\s*:?\s*$/im },
] as const;

export const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

export function readabilityChecks(cv: CvDocument): Check[] {
  const checks: Check[] = [];
  const words = wordCount(cv.text);

  if (words < 60) {
    checks.push({
      id: "text",
      status: "problem",
      title: "Almost no text could be read",
      detail:
        cv.kind === "pdf"
          ? "This PDF looks like a picture of a CV (a scan, or text turned into shapes). Hiring systems read text, not images, so they'd see it as nearly empty. Export it again from Word, Google Docs or your CV builder as a text PDF."
          : "There's very little text here. Paste or upload your full CV.",
    });
    return checks;
  }
  checks.push({
    id: "text",
    status: "good",
    title: "The text can be read",
    detail: `We read ${words.toLocaleString("en")} words${cv.pages ? ` across ${cv.pages} ${cv.pages === 1 ? "page" : "pages"}` : ""}, which is what a hiring system gets to work with.`,
  });

  const layout = cv.layout;
  const columns =
    layout !== null &&
    layout.rows >= 8 &&
    (layout.splitRows / layout.rows > 0.3 ||
      ((layout.leftStarts ?? 0) / layout.rows > 0.2 && (layout.rightStarts ?? 0) / layout.rows > 0.2));
  if (columns) {
    checks.push({
      id: "columns",
      status: "problem",
      title: "Two columns, or a table",
      detail:
        "Many lines have text on both the left and the right. Some systems read straight across the page and mix the two sides together. A single column reads the same everywhere.",
    });
  }

  const icons = cv.text.match(ICON_GLYPHS)?.length ?? 0;
  if (icons >= 3) {
    checks.push({
      id: "icons",
      status: "tip",
      title: "Icons come through as stray characters",
      detail: `We found ${icons} icon characters (often next to phone numbers and emails). Systems read them as junk; plain words like "Email:" are safer.`,
    });
  }

  const contact = [EMAIL.test(cv.text) && "email", PHONE.test(cv.text) && "phone", LINKS.test(cv.text) && "profile link"].filter(Boolean);
  checks.push(
    EMAIL.test(cv.text)
      ? { id: "contact", status: "good", title: "Contact details found", detail: `We found your ${new Intl.ListFormat("en", { type: "conjunction" }).format(contact as string[])}.` }
      : {
          id: "contact",
          status: "problem",
          title: "No email address found",
          detail: "Recruiters need a way to reach you. Put your email near the top, as plain text (not inside an image or icon).",
        },
  );

  const missing = SECTIONS.filter((section) => !section.pattern.test(cv.text)).map((section) => section.label);
  checks.push(
    missing.length === 0
      ? { id: "sections", status: "good", title: "Standard section headings", detail: "Experience, Education and Skills each have a heading systems recognise." }
      : {
          id: "sections",
          status: "tip",
          title: `No "${missing.join('", "')}" heading found`,
          detail:
            "Systems split a CV into sections by their headings. Common names (Experience, Education, Skills) on their own line are the easiest to recognise; creative ones like \"My journey\" often aren't.",
        },
  );

  const dates = cv.text.match(DATE)?.length ?? 0;
  checks.push(
    dates >= 2
      ? { id: "dates", status: "good", title: "Dates on your roles", detail: "Systems use start and end dates to work out your years of experience." }
      : {
          id: "dates",
          status: "tip",
          title: "Few or no dates found",
          detail: 'Add start and end dates to each role, like "Mar 2021 – Present". Many systems calculate years of experience from them.',
        },
  );

  if (cv.pages && cv.pages > 3) {
    checks.push({
      id: "length",
      status: "tip",
      title: `${cv.pages} pages is long`,
      detail: "Systems read every page, but people often skim only the first. Put what matters most for the role on page one.",
    });
  } else if (words < 200) {
    checks.push({
      id: "length",
      status: "tip",
      title: "Quite short",
      detail: "There's not much here to match against a posting. Describe what you did in each role, and with which tools.",
    });
  }
  return checks;
}

const SENTENCES = /[^.!?\n•]+[.!?]?/g;
const CONSTRAINT =
  /\b(must|required|requires|only|need to|needs to|have to|eligible|unable|cannot|can't|not able)\b[^.]{0,80}\b(located|based|reside|residen|live|living|time ?zones?|authori[sz]|work permit|visa|sponsor|citizen|clearance|overlap)|\b(based|located|reside|living)\s+in\b|\b(UTC|GMT|EST|EDT|CET|CEST|PST|PDT)\s*[+-]?\s*\d|\bwithin\b[^.]{0,30}\b(time ?zones?|hours of)\b/i;
const YEARS = /\b(\d{1,2})\s*\+?\s*(?:-\s*\d{1,2}\s*)?(?:years?|yrs?)\b[^.]{0,60}/gi;

export type RoleComparison = {
  /** Skills the posting names that the CV also mentions, most mentioned in the posting first. */
  found: { name: string; count: number }[];
  /** Skills the posting names that the CV doesn't. */
  missing: { name: string; count: number }[];
  /** "5+ years of experience with…" lines from the posting. */
  years: string[];
  /** Sentences about where you must live, time zones, or work authorisation. */
  constraints: string[];
};

const clean = (sentence: string) => sentence.replace(/\s+/g, " ").trim().slice(0, 220);

export function compareWithRole(cvText: string, roleText: string): RoleComparison {
  const wanted = findSkills(roleText);
  const have = new Set(findSkills(cvText).map((skill) => skill.name));
  const sentences = roleText.match(SENTENCES) ?? [];
  const years = [...new Set([...roleText.matchAll(YEARS)].map((match) => clean(match[0])))].slice(0, 4);
  const constraints = [...new Set(sentences.filter((sentence) => CONSTRAINT.test(sentence)).map(clean))].slice(0, 4);
  return {
    found: wanted.filter((skill) => have.has(skill.name)),
    missing: wanted.filter((skill) => !have.has(skill.name)),
    years,
    constraints,
  };
}
