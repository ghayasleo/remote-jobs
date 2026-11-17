import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { getCompanyIndex } from "./companies";
import { getHiringSummary } from "./job-boards";
import { newSinceDate, toExploreCompany } from "@/lib/explore";

/** Everything the Explore and Saved lists need, in one cached payload. */
export async function getExploreData() {
  "use cache";
  cacheLife("hours");
  cacheTag("companies", "roles");

  const [companies, hiring] = await Promise.all([getCompanyIndex(), getHiringSummary()]);
  return {
    companies: companies.map(toExploreCompany),
    hiring,
    // Fixed when the cache fills, so server and browser agree on what's "new".
    newSince: newSinceDate(Date.now()),
  };
}

export type ExploreData = Awaited<ReturnType<typeof getExploreData>>;
