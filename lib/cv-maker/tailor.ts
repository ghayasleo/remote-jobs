// Tailors a copy of the main CV to one job posting, without AI and without
// adding anything the person didn't write: bullets and skills that match what
// the posting asks for move up, and what the posting wants that the CV
// doesn't show is listed, for the person to add only where it's true.

import { findSkills } from "@/lib/cv/skills";
import { cvPlainText, newId, type CvData } from "./model";

export type Tailoring = {
  data: CvData;
  /** Skills the posting names that the CV also shows. */
  matched: string[];
  /** Skills the posting names that the CV doesn't show, most mentioned first. */
  gaps: string[];
};

/** Sorts by score, highest first, keeping the original order for ties. */
function byScore<T>(items: T[], score: (item: T) => number): T[] {
  return items
    .map((item, index) => ({ item, index, score: score(item) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ item }) => item);
}

// Sentences about how a company hires (equal-opportunity statements, AI and
// privacy notices, recruiter warnings) name things like "recruiting" that
// aren't part of the job, so they're left out before matching.
const HIRING_BOILERPLATE =
  /\b(equal (employment )?opportunit|EEO\b|affirmative action|reasonable accommodation|hiring (process|decisions?)|recruit\w* (team|process|fraud|agenc|partner)|recruiters?\b|background checks?|e-verify|privacy (notice|policy)|protected (veteran|characteristic|class)|AI (tools|notice))/i;

/** The posting without its sentences about the hiring process. */
export function jobText(text: string): string {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .filter((sentence) => !HIRING_BOILERPLATE.test(sentence))
    .join("\n");
}

export function tailorCv(main: CvData, posting: { title: string; text: string }): Tailoring {
  const wanted = findSkills(`${posting.title}\n${jobText(posting.text)}`).map((skill) => skill.name);
  const have = new Set(findSkills(cvPlainText(main)).map((skill) => skill.name));
  const matched = wanted.filter((name) => have.has(name));
  const gaps = wanted.filter((name) => !have.has(name)).slice(0, 15);

  const relevance = (text: string) => {
    const named = new Set(findSkills(text).map((skill) => skill.name));
    return wanted.filter((name) => named.has(name)).length;
  };

  // A fresh copy with new ids, so the tailored CV can change without touching the main one.
  const data = structuredClone(main);
  for (const section of data.sections) {
    section.id = newId();
    if (section.type === "experience" || section.type === "projects") {
      for (const item of section.items) {
        item.id = newId();
        item.bullets = byScore(item.bullets, (bullet) => relevance(bullet.text)).map((bullet) => ({ ...bullet, id: newId() }));
      }
    } else if (section.type === "education") {
      for (const item of section.items) {
        item.id = newId();
        item.bullets = item.bullets.map((bullet) => ({ ...bullet, id: newId() }));
      }
    } else if (section.type === "skills") {
      section.groups = byScore(
        section.groups.map((group) => {
          const skills = group.skills.split(",").map((skill) => skill.trim()).filter(Boolean);
          return { ...group, id: newId(), skills: byScore(skills, (skill) => relevance(skill)).join(", ") };
        }),
        (group) => relevance(group.skills),
      );
    } else {
      for (const item of section.items) item.id = newId();
    }
  }
  for (const link of data.basics.links) link.id = newId();

  return { data, matched, gaps };
}
