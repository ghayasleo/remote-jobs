// Display labels for company fields. Mirrors src/_data/labels.js in
// remoteintech/remote-jobs, which is the source of truth for the allowed values.

export const regionLabels: Record<string, string> = {
  worldwide: "Worldwide",
  americas: "Americas",
  europe: "Europe",
  "americas-europe": "Americas & Europe",
  "asia-pacific": "Asia Pacific",
  other: "Other",
};

export const remotePolicyLabels: Record<string, string> = {
  "fully-remote": "Fully Remote",
  "remote-first": "Remote First",
  hybrid: "Hybrid",
  "remote-friendly": "Remote Friendly",
};

export const companySizeLabels: Record<string, string> = {
  tiny: "1-10 employees",
  small: "11-50 employees",
  medium: "51-200 employees",
  large: "201-1000 employees",
  enterprise: "1000+ employees",
};

export const techLabels: Record<string, string> = {
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
  mobile: "Mobile Development",
  data: "Data",
  ml: "ML/AI",
  sql: "SQL",
  postgres: "PostgreSQL",
  nosql: "NoSQL",
  search: "Search",
  graphql: "GraphQL",
  api: "API",
};

// Falls back to the raw value so an unexpected upstream value still shows up.
export const label = (labels: Record<string, string>, value: string | null) =>
  value ? labels[value] ?? value : "";
