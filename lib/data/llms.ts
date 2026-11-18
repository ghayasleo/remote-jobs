import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { getLandingTopics } from "./explore-data";
import { getCountryIndex } from "./countries";
import { getInsights } from "./insights";
import { getSalaryData } from "./salaries";
import { getWeeklyReports } from "./weekly";
import { PROVIDERS } from "./job-boards/providers";
import { countryPath } from "@/lib/countries";
import { salaryCategories, salaryPath, usd } from "@/lib/salaries";
import { topicCopy, type Topic } from "@/lib/landing";
import { absoluteUrl } from "@/lib/site";

const number = new Intl.NumberFormat("en");
const list = new Intl.ListFormat("en", { type: "disjunction" });

/**
 * /llms.txt (llmstxt.org): what the site is and where its pages are, as
 * Markdown for AI assistants. Refreshed with the hourly role data.
 */
export async function getLlmsText() {
  "use cache";
  cacheLife("hours");
  cacheTag("roles", "companies");

  const [insights, topics, { countries }, salaries, reports] = await Promise.all([
    getInsights(),
    getLandingTopics(),
    getCountryIndex(),
    getSalaryData(),
    getWeeklyReports(),
  ]);
  const providers = list.format(Object.values(PROVIDERS).map((provider) => provider.label));
  const link = (title: string, path: string, note?: string) => `- [${title}](${absoluteUrl(path)})${note ? `: ${note}` : ""}`;
  const topicLink = ({ topic, count, path }: { topic: Topic; count: number; path: string }) =>
    link(topicCopy(topic).searchTitle, path, `${number.format(count)} companies`);
  const single = topics.filter(({ topic }) => !(topic.region && topic.stack));

  return [
    "# Remote Jobs",
    "",
    `> A free directory of ${number.format(insights.companies)} remote-friendly tech companies, with the ${number.format(insights.remoteRoles)} remote roles ${number.format(insights.hiringCompanies)} of them are hiring for right now.`,
    "",
    `Company profiles come from remoteintech/remote-jobs, a community-run list on GitHub (ISC license). Each profile says which regions the company hires from, how remote it is, its size and its tech stack. Open roles are read from each company's public ${providers} job board every hour; people apply on the company's own site. Numbers as of ${insights.updatedAt.slice(0, 10)}.`,
    "",
    "Addresses:",
    `- A company: ${absoluteUrl("/company-profiles/")}{company}`,
    `- A role: ${absoluteUrl("/jobs/")}{company}/{role id}/{title}`,
    "",
    "## Main pages",
    "",
    link("Explore companies", "/", "every company, filterable by region, remote policy, size, tech stack and whether it's hiring"),
    link("Remote jobs", "/jobs", "every open remote role, filterable by region, kind of work and the company's details"),
    link("New this week", "/new", "roles posted in the last 7 days and the newest companies on the list"),
    link("Remote hiring market", "/market", "which companies are hiring more, slowing or paused, who's posting the most, and company news"),
    link("State of remote hiring", "/insights", "who's hiring most, what kind of work is remote, where companies hire and pay transparency"),
    link("Remote tech salaries", "/salaries", "what remote job postings with a US-dollar range pay, and the highest-paying roles"),
    ...salaryCategories(salaries.roles).map((category) =>
      link(`Remote ${category.label.toLowerCase()} salaries`, salaryPath(category.key), `median range ${usd(category.medianMin)}–${usd(category.medianMax)}`),
    ),
    ...(reports.length > 0
      ? [link("Weekly reports", "/weekly", "each week's remote roles opened and closed, top hirers and best-paid new roles")]
      : []),
    link("Daily hiring history (open data)", "https://github.com/ghayasleo/remote-jobs/tree/data/history"),
    link("About", "/about", "where the data comes from and who built the site"),
    "",
    "## Remote jobs by the country you live in",
    "",
    link("All countries", "/remote/in", "pick a country to see the remote roles open to people living there"),
    ...countries.map((country) =>
      link(`Remote jobs in ${country.name}`, countryPath(country), `${number.format(country.total)} roles open to people there`),
    ),
    "",
    "## Companies by region and technology",
    "",
    ...single.map(topicLink),
    "",
    "## Feeds",
    "",
    link("Newly added companies (RSS)", "/feeds/companies.xml"),
    link("New remote roles (RSS)", "/feeds/jobs.xml"),
    link("Sitemap", "/sitemap.xml", "every company, role and topic page"),
    "",
    "## Optional",
    "",
    ...topics.filter(({ topic }) => topic.region && topic.stack).map(topicLink),
    "",
  ].join("\n");
}
