// Allowed values and display labels for company fields. Mirrors
// src/_data/labels.js in remoteintech/remote-jobs, the source of truth.
// Order matters: it's the order options appear in filters.

export const regionLabels = {
  worldwide: "Worldwide",
  americas: "Americas",
  europe: "Europe",
  "americas-europe": "Americas & Europe",
  "asia-pacific": "Asia Pacific",
  other: "Other",
} as const;

export const remotePolicyLabels = {
  "fully-remote": "Fully remote",
  "remote-first": "Remote first",
  "remote-friendly": "Remote friendly",
  hybrid: "Hybrid",
} as const;

export const companySizeLabels = {
  tiny: "1–10",
  small: "11–50",
  medium: "51–200",
  large: "201–1,000",
  enterprise: "1,000+",
} as const;

export const techLabels = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  react: "React",
  nodejs: "Node.js",
  python: "Python",
  ruby: "Ruby",
  go: "Go",
  java: "Java",
  php: "PHP",
  rust: "Rust",
  dotnet: ".NET",
  elixir: "Elixir",
  scala: "Scala",
  swift: "Swift",
  cloud: "Cloud",
  devops: "DevOps",
  docker: "Docker",
  kubernetes: "Kubernetes",
  infrastructure: "Infrastructure",
  linux: "Linux",
  mobile: "Mobile",
  data: "Data",
  ml: "ML / AI",
  sql: "SQL",
  postgres: "PostgreSQL",
  nosql: "NoSQL",
  search: "Search",
  graphql: "GraphQL",
  api: "APIs",
} as const;

export type Region = keyof typeof regionLabels;
export type RemotePolicy = keyof typeof remotePolicyLabels;
export type CompanySize = keyof typeof companySizeLabels;
export type Tech = keyof typeof techLabels;

export const REGIONS = Object.keys(regionLabels) as Region[];
export const REMOTE_POLICIES = Object.keys(remotePolicyLabels) as RemotePolicy[];
export const COMPANY_SIZES = Object.keys(companySizeLabels) as CompanySize[];
export const TECHS = Object.keys(techLabels) as Tech[];

// Falls back to the raw value so an unexpected upstream value still shows up.
export function label(labels: Record<string, string>, value: string | null | undefined) {
  if (!value) return "";
  return labels[value] ?? value;
}

export const isRegion = (value: string): value is Region => value in regionLabels;
