import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { getCompanyIndex } from "./companies";
import { forEachBoard } from "./job-boards";
import { isPlaceholderRole, jobCategory } from "@/lib/jobs";
import { annualUsd, type SalaryRole } from "@/lib/salaries";

/**
 * Every remote role whose posting gives an annual US-dollar range, plus how
 * many remote roles show pay at all. Refreshed with the hourly role data.
 */
export async function getSalaryData() {
  "use cache";
  cacheLife("hours");
  cacheTag("roles", "companies");

  const names = new Map((await getCompanyIndex()).map((company) => [company.slug, company.name]));
  const roles: SalaryRole[] = [];
  let remoteRoles = 0;
  let published = 0;
  await forEachBoard((slug, open) => {
    const companyName = names.get(slug);
    if (!companyName) return;
    for (const role of open.roles) {
      if (role.workplace !== "remote" || isPlaceholderRole(role.title)) continue;
      remoteRoles += 1;
      if (role.salary || role.pay) published += 1;
      const pay = annualUsd(role);
      if (!pay) continue;
      roles.push({
        company: slug,
        companyName,
        id: role.id,
        title: role.title,
        location: role.location,
        category: jobCategory(role.title, role.team),
        min: pay.min,
        max: pay.max,
      });
    }
  });
  return { roles, remoteRoles, published, updatedAt: new Date().toISOString() };
}
