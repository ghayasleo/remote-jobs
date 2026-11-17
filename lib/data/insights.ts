import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { getCompanyIndex } from "./companies";
import { forEachBoard } from "./job-boards";
import { computeInsights, type CompanyRoles } from "@/lib/insights";

/** Live numbers for "State of remote hiring", refreshed with the hourly role data. */
export async function getInsights() {
  "use cache";
  cacheLife("hours");
  cacheTag("roles", "companies");

  const companies = await getCompanyIndex();
  const boards: CompanyRoles[] = [];
  await forEachBoard((slug, open) => boards.push({ slug, roles: open.roles, total: open.total }));
  return { ...computeInsights(companies, boards), updatedAt: new Date().toISOString() };
}
