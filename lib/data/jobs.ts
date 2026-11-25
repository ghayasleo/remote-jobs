import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { getCompany, getCompanyIndex } from "./companies";
import {
  findRole,
  forEachBoard,
  getBoard,
  getOpenRoles,
  getRoleDetail,
  mergedRoleIds,
  roleLocations,
  type Role,
} from "./job-boards";
import { toExploreCompany } from "@/lib/explore";
import { isPlaceholderRole, jobCategory, type JobListing } from "@/lib/jobs";

const byNewest = (a: JobListing, b: JobListing) => (b.postedAt ?? "").localeCompare(a.postedAt ?? "");

/** A role as a list item: one listing, with every location and id folded into it. */
export function roleListing(company: { slug: string; name: string; domain: string | null }, role: Role): JobListing {
  const locations = roleLocations(role);
  const mergedIds = mergedRoleIds(role);
  return {
    id: role.id,
    company: company.slug,
    companyName: company.name,
    domain: company.domain,
    title: role.title,
    location: role.location,
    team: role.team,
    employmentType: role.employmentType,
    salary: role.salary,
    postedAt: role.postedAt,
    category: jobCategory(role.title, role.team),
    ...(locations.length > 1 && { locations }),
    ...(mergedIds.length > 0 && { mergedIds }),
  };
}

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
        ...roleListing(company, role),
        companyPolicy: company.remotePolicy || null,
        companyRegion: company.region || null,
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
 * being remote); "unavailable" when the board couldn't be reached just now;
 * "repost" when the id is a repost of another posting, whose page it goes to.
 * A role posted for several locations has a page per location: each lists
 * the others (`siblings`), and all point search engines at the main one
 * (`canonicalId`).
 */
export async function getJob(companySlug: string, id: string) {
  const company = await getCompany(companySlug);
  const board = company ? getBoard(companySlug) : null;
  if (!company || !board) return null;

  const open = await getOpenRoles(board);
  if (!open) return { status: "unavailable" as const, company };

  const found = findRole(open.roles, id);
  // A talent pool isn't a job: no page for it.
  if (found && isPlaceholderRole(found.posting.title)) return null;
  const role = found && isRealRemoteRole(found.posting) ? found.posting : undefined;
  const others = remoteRoles(open.roles).filter((candidate) => candidate !== found?.primary);
  if (!found || !role) return { status: "closed" as const, company, others };
  if (found.repost) return { status: "repost" as const, company, role };

  const { primary } = found;
  const siblings = [primary, ...(primary.alternates ?? [])].filter((posting) => posting.id !== role.id);
  const detail = await getRoleDetail(board, role.id);
  return {
    status: "open" as const,
    company,
    role,
    detail,
    siblings,
    canonicalId: primary.id,
    /** Every location of the role, for search engines' markup on the main page. */
    locations: roleLocations(primary),
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
