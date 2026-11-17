// Who built Remote Jobs. Shown on About and in the footer, and described to
// search engines as the site's author.

export const MAKER = {
  name: "Ghayas Ud Din",
  jobTitle: "E-commerce & SaaS developer",
  location: "Islamabad",
  portfolio: "https://www.ghayasuddin.net",
  contact: "https://www.ghayasuddin.net/#contact",
  github: "https://github.com/ghayasleo",
  linkedin: "https://www.linkedin.com/in/ghayas-ud-din",
} as const;

export const makerJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: MAKER.name,
  jobTitle: MAKER.jobTitle,
  url: MAKER.portfolio,
  sameAs: [MAKER.github, MAKER.linkedin],
};
