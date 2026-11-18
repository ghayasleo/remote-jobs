import type { Role } from "@/lib/data/job-boards/providers";
import { COMPANY_SIZES, REGIONS, REMOTE_POLICIES, TECHS, type Tech } from "@/lib/data/labels";
import type { CompanyListItem } from "@/lib/data/parse";
import { formatCount, listAnd, type Faq } from "@/lib/faq";
import { formatDate } from "@/lib/format";
import { JOB_CATEGORIES, JOB_CATEGORY_KEYS, isPlaceholderRole, jobCategory, type JobCategory } from "@/lib/jobs";

// "State of remote hiring": aggregate numbers from the company list and every
// readable job board. Pure, so it's easy to test.

export type CompanyRoles = { slug: string; roles: Role[]; total: number };

const median = (values: number[]) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

export function computeInsights(companies: CompanyListItem[], boards: CompanyRoles[]) {
  const names = new Map(companies.map((company) => [company.slug, company.name]));
  const isReal = (role: Role) => !isPlaceholderRole(role.title);

  const remoteByCompany = boards
    .map((board) => ({
      slug: board.slug,
      name: names.get(board.slug) ?? board.slug,
      remote: board.roles.filter((role) => role.workplace === "remote" && isReal(role)).length,
      total: board.total,
    }))
    .filter((company) => company.total > 0);
  const remoteRoles = boards.flatMap((board) => board.roles.filter((role) => role.workplace === "remote" && isReal(role)));
  const allRoles = remoteByCompany.reduce((sum, company) => sum + company.total, 0);
  const hiring = new Set(remoteByCompany.map((company) => company.slug));

  const categories = new Map<JobCategory, number>(JOB_CATEGORY_KEYS.map((key) => [key, 0]));
  for (const role of remoteRoles) {
    const category = jobCategory(role.title, role.team);
    categories.set(category, categories.get(category)! + 1);
  }

  const stackAmongHiring = new Map<Tech, number>(TECHS.map((tech) => [tech, 0]));
  for (const company of companies) {
    if (!hiring.has(company.slug)) continue;
    for (const tech of company.technologies) {
      if (stackAmongHiring.has(tech as Tech)) stackAmongHiring.set(tech as Tech, stackAmongHiring.get(tech as Tech)! + 1);
    }
  }

  // Pay: only structured, annual, US-dollar ranges are comparable.
  const annualUsd = remoteRoles.filter((role) => role.pay?.unit === "YEAR" && role.pay.currency === "USD");
  const withPay = remoteRoles.filter((role) => role.salary || role.pay).length;

  return {
    companies: companies.length,
    hiringCompanies: hiring.size,
    remoteRoles: remoteRoles.length,
    allRoles,
    topCompanies: remoteByCompany.filter((company) => company.remote > 0).sort((a, b) => b.remote - a.remote).slice(0, 10),
    categories: [...categories].map(([key, count]) => ({ key, count })).filter(({ count }) => count > 0).sort((a, b) => b.count - a.count),
    regions: REGIONS.map((region) => ({
      key: region,
      count: companies.filter((company) => company.region === region).length,
      hiring: companies.filter((company) => company.region === region && hiring.has(company.slug)).length,
    })).sort((a, b) => b.count - a.count),
    policies: REMOTE_POLICIES.map((policy) => ({
      key: policy,
      count: companies.filter((company) => company.remotePolicy === policy).length,
    })),
    sizes: COMPANY_SIZES.map((size) => ({ key: size, count: companies.filter((company) => company.companySize === size).length })),
    stacks: [...stackAmongHiring].map(([key, count]) => ({ key, count })).filter(({ count }) => count > 0).sort((a, b) => b.count - a.count).slice(0, 12),
    pay: {
      published: withPay,
      share: remoteRoles.length ? withPay / remoteRoles.length : 0,
      annualUsd: {
        count: annualUsd.length,
        medianMin: median(annualUsd.map((role) => role.pay!.min).filter((value): value is number => value !== null)),
        medianMax: median(annualUsd.map((role) => role.pay!.max).filter((value): value is number => value !== null)),
      },
    },
  };
}

export type Insights = ReturnType<typeof computeInsights>;

const percent = new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: 0 });
const usd = new Intl.NumberFormat("en", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 0 });
const share = (part: number, whole: number) => percent.format(whole ? part / whole : 0);

/** The questions "State of remote hiring" answers, from its own numbers. */
export function insightsFaqs(insights: Insights, updatedAt: string): Faq[] {
  const { companies, hiringCompanies, remoteRoles, allRoles, topCompanies, categories, pay } = insights;
  const faqs: Faq[] = [
    {
      question: "How many remote tech jobs are open right now?",
      answer: `${formatCount(remoteRoles)} remote roles were open at ${formatCount(hiringCompanies)} of the ${formatCount(companies)} remote-friendly tech companies we track on ${formatDate(updatedAt)}. That's ${share(remoteRoles, allRoles)} of all the roles those companies list.`,
    },
  ];
  if (topCompanies.length >= 3) {
    faqs.push({
      question: "Which companies are hiring the most remote roles?",
      answer: `${listAnd(topCompanies.slice(0, 3).map((company) => `${company.name} (${formatCount(company.remote)} roles)`))} have the most open remote roles right now.`,
    });
  }
  const [first, second, third] = categories;
  if (first) {
    const next = [second, third].filter(Boolean).map((category) => JOB_CATEGORIES[category.key]);
    faqs.push({
      question: "What kinds of remote jobs are most common?",
      answer: `${JOB_CATEGORIES[first.key]} roles: ${share(first.count, remoteRoles)} of open remote roles${next.length ? `, followed by ${listAnd(next)}` : ""}.`,
    });
  }
  const { medianMin, medianMax, count } = pay.annualUsd;
  faqs.push({
    question: "Do remote job listings show pay?",
    answer: `${pay.published === 0 ? "None" : pay.share >= 0.5 ? "Most" : "Fewer than half"} do: ${formatCount(pay.published)} of ${formatCount(remoteRoles)} remote roles (${percent.format(pay.share)}) show pay on the listing.${count >= 20 && medianMin && medianMax ? ` Among the ${formatCount(count)} with an annual US-dollar range, the median range is ${usd.format(medianMin)}–${usd.format(medianMax)}.` : ""}`,
  });
  return faqs;
}
