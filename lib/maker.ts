// Who built Remote Jobs. Shown on About and in the footer, and described to
// search engines as the site's author.

import { absoluteUrl } from "./site";

export const MAKER = {
  name: "Ghayas Ud Din",
  jobTitle: "Senior Software Engineer",
  location: "Islamabad",
  portfolio: "https://www.ghayasuddin.net",
  work: "https://www.ghayasuddin.net/#work",
  github: "https://github.com/ghayasleo",
  linkedin: "https://www.linkedin.com/in/ghayas-ud-din",
} as const;

export const makerJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: MAKER.name,
  jobTitle: MAKER.jobTitle,
  url: MAKER.portfolio,
  image: absoluteUrl("/images/ghayas-ud-din.webp"),
  sameAs: [MAKER.github, MAKER.linkedin],
};
