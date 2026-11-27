import { revalidateTag } from "next/cache";
import { sendAlerts } from "@/lib/alerts";
import { remoteJobsFrom } from "@/lib/data/jobs";
import { readSnapshot, refreshSnapshot } from "@/lib/data/snapshot";

// Reading every job board takes a minute or two.
export const maxDuration = 300;

// Run every hour by the cron in vercel.json: reads the company list and every
// job board once, stores the result in Blob, then marks the pages built from
// the old data as stale. Pages rebuild from the new snapshot on their next
// visit, so the sitemap, lists and job pages follow the boards within the hour.
// Vercel sends CRON_SECRET as a bearer token, so nobody else can trigger it.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const stats = await refreshSnapshot();
  revalidateTag("roles", "max");
  // Company profiles change a few times a week; their pages keep their cache otherwise.
  if (stats.companiesChanged) revalidateTag("companies", "max");
  // Job alerts: new roles from the snapshot just built.
  const alerts = await sendAlerts(remoteJobsFrom(await readSnapshot())).catch((error: Error) => ({ error: error.message }));
  return Response.json({ ...stats, alerts });
}
