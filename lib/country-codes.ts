import { COUNTRY_LIST, countrySlug } from "@/lib/jobs";

// ISO 3166-1 alpha-2 codes for the countries roles can name, so "use my
// location" can turn a looked-up code into one of the site's countries.
const CODES: Record<string, string> = {
  US: "United States", CA: "Canada", MX: "Mexico", BR: "Brazil", AR: "Argentina", CO: "Colombia", CL: "Chile",
  PE: "Peru", UY: "Uruguay", CR: "Costa Rica", EC: "Ecuador", GT: "Guatemala", DO: "Dominican Republic",
  GB: "United Kingdom", IE: "Ireland", DE: "Germany", FR: "France", ES: "Spain", PT: "Portugal", NL: "Netherlands",
  BE: "Belgium", LU: "Luxembourg", IT: "Italy", CH: "Switzerland", AT: "Austria", PL: "Poland", CZ: "Czechia",
  SK: "Slovakia", HU: "Hungary", RO: "Romania", BG: "Bulgaria", GR: "Greece", HR: "Croatia", SI: "Slovenia",
  RS: "Serbia", ME: "Montenegro", SE: "Sweden", DK: "Denmark", NO: "Norway", FI: "Finland", IS: "Iceland",
  EE: "Estonia", LV: "Latvia", LT: "Lithuania", UA: "Ukraine", MD: "Moldova", AM: "Armenia", CY: "Cyprus",
  MT: "Malta", TR: "Turkey", IL: "Israel", AE: "United Arab Emirates", SA: "Saudi Arabia", QA: "Qatar",
  EG: "Egypt", ZA: "South Africa", NG: "Nigeria", KE: "Kenya", GH: "Ghana", MA: "Morocco", IN: "India",
  PK: "Pakistan", BD: "Bangladesh", LK: "Sri Lanka", JP: "Japan", KR: "South Korea", CN: "China",
  HK: "Hong Kong", TW: "Taiwan", SG: "Singapore", MY: "Malaysia", ID: "Indonesia", TH: "Thailand",
  VN: "Vietnam", PH: "Philippines", AU: "Australia", NZ: "New Zealand",
};

const KNOWN = new Set(COUNTRY_LIST.map((country) => country.name));

/** The site's country for the first ISO code that's on its list, or null. */
export function countryFromCodes(codes: (string | null | undefined)[]) {
  for (const code of codes) {
    const name = code ? CODES[code.toUpperCase()] : undefined;
    if (name && KNOWN.has(name)) return { name, slug: countrySlug(name) };
  }
  return null;
}

/** Every listed country has a code (checked by the tests). */
export const COUNTRY_CODES = CODES;
