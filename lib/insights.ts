import type { Role } from "@/lib/data/job-boards/providers";
import { COMPANY_SIZES, REGIONS, REMOTE_POLICIES, TECHS, type Tech } from "@/lib/data/labels";
import type { CompanyListItem } from "@/lib/data/parse";
import { JOB_CATEGORY_KEYS, isPlaceholderRole, jobCategory, type JobCategory } from "@/lib/jobs";

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
