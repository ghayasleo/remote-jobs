import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { getCompany, getCompanyIndex } from "./companies";
import { forEachBoard, getBoard, getOpenRoles, getRoleDetail, type Role } from "./job-boards";
import { toExploreCompany } from "@/lib/explore";
import { isPlaceholderRole, jobCategory, type JobListing } from "@/lib/jobs";

const byNewest = (a: JobListing, b: JobListing) => (b.postedAt ?? "").localeCompare(a.postedAt ?? "");

/** Every remote role at every company with a readable job board, newest first. */
export async function getRemoteJobs(): Promise<JobListing[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("roles", "companies");

  const companies = new Map((await getCompanyIndex()).map((company) => [company.slug, company]));
  const jobs: JobListing[] = [];
  await forEachBoard((slug, open) => {
    const company = companies.get(slug);
    if (!company) return;
    for (const role of open.roles) {
      if (role.workplace !== "remote" || isPlaceholderRole(role.title)) continue;
      jobs.push({
        id: role.id,
        company: slug,
        companyName: company.name,
        domain: company.domain,
        title: role.title,
        location: role.location,
        team: role.team,
        employmentType: role.employmentType,
        salary: role.salary,
        postedAt: role.postedAt,
        category: jobCategory(role.title, role.team),
        companyPolicy: company.remotePolicy || null,
        companySize: company.companySize,
        companyStack: company.technologies,
      });
    }
  });
  return jobs.sort(byNewest);
}

export const JOBS_PREVIEW_SIZE = 24;

/** What the Jobs page's HTML carries: the newest roles and the totals. */
export async function getJobsPreview() {
  "use cache";
  cacheLife("hours");
  cacheTag("roles", "companies");

  const jobs = await getRemoteJobs();
  return {
    preview: jobs.slice(0, JOBS_PREVIEW_SIZE),
    total: jobs.length,
    companies: new Set(jobs.map((job) => job.company)).size,
  };
}

const isRealRemoteRole = (role: Role) => role.workplace === "remote" && !isPlaceholderRole(role.title);
const remoteRoles = (roles: Role[]) => roles.filter(isRealRemoteRole);

/**
 * One role's page. "closed" when the board no longer lists it (or it stopped
 * being remote); "unavailable" when the board couldn't be reached just now.
 */
export async function getJob(companySlug: string, id: string) {
  const company = await getCompany(companySlug);
  const board = company ? getBoard(companySlug) : null;
  if (!company || !board) return null;

  const open = await getOpenRoles(board);
  if (!open) return { status: "unavailable" as const, company };

  const listed = open.roles.find((candidate) => candidate.id === id);
  // A talent pool isn't a job: no page for it.
  if (listed && isPlaceholderRole(listed.title)) return null;
  const role = listed && isRealRemoteRole(listed) ? listed : undefined;
  const others = remoteRoles(open.roles).filter((candidate) => candidate.id !== id);
  if (!role) return { status: "closed" as const, company, others };

  const detail = await getRoleDetail(board, id);
  return {
    status: "open" as const,
    company,
    role,
    detail,
    others,
    providerLabel: open.providerLabel,
    fetchedAt: open.fetchedAt,
  };
}

const WEEK_MS = 7 * 86_400_000;

/** Roles posted in the last 7 days, newest first. */
export async function getNewThisWeek() {
  "use cache";
  cacheLife("hours");
  cacheTag("roles", "companies");

  const since = new Date(Date.now() - WEEK_MS).toISOString();
  const [jobs, companies] = await Promise.all([getRemoteJobs(), getCompanyIndex()]);
  const recentCompanies = companies
    .filter((company) => company.addedAt)
    .sort((a, b) => b.addedAt!.localeCompare(a.addedAt!))
    .slice(0, 12)
    .map(toExploreCompany);
  return {
    jobs: jobs.filter((job) => job.postedAt && job.postedAt >= since),
    companies: recentCompanies,
    since,
  };
}
