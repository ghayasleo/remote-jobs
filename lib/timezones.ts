import { jobRegions, type JobRegion } from "./jobs";

// Which hours a remote role works in, as a range of UTC offsets. Read from
// what the listing says (an offset, or a named zone like EST or CET), else
// from the regions its location names. Pure, so it's easy to test.

export type TzRange = { min: number; max: number; source: "listing" | "region" };

const REGION_HOURS: Record<JobRegion, [number, number]> = {
  anywhere: [-12, 14],
  "us-canada": [-10, -3.5],
  "latin-america": [-6, -3],
  europe: [-1, 3],
  "middle-east-africa": [0, 4],
  "asia-pacific": [5, 13],
};

// Named zones people write in listings, with their standard offsets. Codes
// only count in capitals ("et" and "pt" are ordinary words); spelled-out
// names count however they're written.
const NAMED: [RegExp, number][] = [
  [/\b(EST|EDT|ET)\b/, -5],
  [/\beastern (standard )?time\b|\bUS eastern\b/i, -5],
  [/\b(CST|CDT)\b/, -6],
  [/\b(US )?central (standard )?time\b/i, -6],
  [/\b(MST|MDT)\b/, -7],
  [/\bmountain (standard )?time\b/i, -7],
  [/\b(PST|PDT|PT)\b/, -8],
  [/\bpacific (standard )?time\b/i, -8],
  [/\bBRT\b/, -3],
  [/\b(GMT|BST|WET)\b(?!\s*[+\-−]\s*\d)/, 0],
  [/\bUK (hours|time)\b/i, 0],
  [/\b(CET|CEST)\b/, 1],
  [/\bcentral european (summer )?time\b/i, 1],
  [/\b(EET|EEST)\b/, 2],
  [/\bIST\b/, 5.5],
  [/\bindia(n)? standard time\b/i, 5.5],
  [/\b(SGT|HKT|AWST)\b/, 8],
  [/\bJST\b/, 9],
  [/\b(AEST|AEDT)\b/, 10],
  [/\b(NZST|NZDT)\b/, 12],
];

const OFFSET = /\b(?:UTC|GMT)\s*([+-−])\s*(\d{1,2})(?::?(\d{2}))?\b/gi;
const PLUS_MINUS = /[±+]\/?-?\s*(\d)\s*(?:hours?|hrs?)\b/i;

/** Offsets a text states outright, as a range, or null when it names none. */
export function statedHours(text: string): { min: number; max: number } | null {
  const offsets: number[] = [];
  for (const match of text.matchAll(OFFSET)) {
    const sign = match[1] === "+" ? 1 : -1;
    offsets.push(sign * (Number(match[2]) + Number(match[3] ?? 0) / 60));
  }
  const withoutEurope = text.replace(/central european (summer )?time/gi, "CET");
  for (const [pattern, offset] of NAMED) if (pattern.test(withoutEurope)) offsets.push(offset);
  const valid = offsets.filter((offset) => offset >= -12 && offset <= 14);
  if (valid.length === 0) return null;
  // "EST ± 3 hours": widen a single zone by what the listing allows.
  const spread = valid.length === 1 ? Number(PLUS_MINUS.exec(text)?.[1] ?? 0) : 0;
  return { min: Math.min(...valid) - spread, max: Math.max(...valid) + spread };
}

/**
 * A role's working hours, or null when its listing only says "Remote". Each
 * location counts on its own: one that names a zone uses it, one that names a
 * region uses the region's hours ("Canada (EST) or UK" covers both).
 */
export function roleHours(locations: string[], title = ""): TzRange | null {
  const ranges: { min: number; max: number }[] = [];
  let stated = false;
  // "Remote, Canada (EST) OR Remote, UK" is two places.
  const places = locations.flatMap((location) => location.split(/\s+or\s+|\s*[;|]\s*/i)).filter(Boolean);
  for (const location of places) {
    const hours = statedHours(location);
    if (hours) {
      stated = true;
      ranges.push(hours);
      continue;
    }
    for (const region of jobRegions(location)) ranges.push({ min: REGION_HOURS[region][0], max: REGION_HOURS[region][1] });
  }
  const fromTitle = statedHours(title);
  if (fromTitle) {
    stated = true;
    ranges.push(fromTitle);
  }
  if (ranges.length === 0) return null;
  return { min: Math.min(...ranges.map((r) => r.min)), max: Math.max(...ranges.map((r) => r.max)), source: stated ? "listing" : "region" };
}

/** Hours a posting's description asks for: only from sentences about overlap, time zones or working hours. */
export function hoursInPosting(text: string) {
  const sentences = text.match(/[^.!?\n]+/g) ?? [];
  const relevant = sentences.filter((sentence) => /overlap|time ?zones?|working hours|business hours|core hours/i.test(sentence));
  return relevant.length ? statedHours(relevant.join(" ")) : null;
}

/** About three hours either side: enough overlap for a shared working day. */
export const OVERLAP_HOURS = 3;

export const fitsHours = (range: { min: number; max: number } | null, offset: number) =>
  range !== null && offset >= range.min - OVERLAP_HOURS && offset <= range.max + OVERLAP_HOURS;

export function formatOffset(offset: number) {
  if (offset === 0) return "UTC";
  const sign = offset > 0 ? "+" : "−";
  const hours = Math.floor(Math.abs(offset));
  const minutes = Math.round((Math.abs(offset) - hours) * 60);
  return `UTC${sign}${hours}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
}

export function formatHours(range: { min: number; max: number }) {
  if (range.min <= -11 && range.max >= 13) return "Any time zone";
  return range.min === range.max ? formatOffset(range.min) : `${formatOffset(range.min)} to ${formatOffset(range.max)}`;
}

/** The offsets people can pick: every hour, plus the half and quarter hours in use. */
export const TIME_ZONE_OFFSETS = [
  ...Array.from({ length: 27 }, (_, index) => index - 12),
  -3.5, 3.5, 4.5, 5.5, 5.75, 6.5, 9.5, 10.5,
].sort((a, b) => a - b);

/** This device's current UTC offset, rounded to the nearest offset in the list. */
export function deviceOffset(date = new Date()) {
  const offset = -date.getTimezoneOffset() / 60;
  return TIME_ZONE_OFFSETS.reduce((best, candidate) => (Math.abs(candidate - offset) < Math.abs(best - offset) ? candidate : best));
}
