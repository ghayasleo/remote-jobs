import { getCompanyIndex } from "@/lib/data/companies";
import { getRemoteJobs } from "@/lib/data/jobs";
import { indexNowPaths, submitToIndexNow } from "@/lib/indexnow";
import { SITE_URL, absoluteUrl } from "@/lib/site";

// Run once a day by the cron in vercel.json. Vercel sends CRON_SECRET as a
// bearer token, so nobody else can trigger the pings.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (process.env.VERCEL_ENV !== "production") return Response.json({ skipped: "Only production is submitted." });

  const [jobs, companies] = await Promise.all([getRemoteJobs(), getCompanyIndex()]);
  const paths = indexNowPaths({ jobs, companies, now: Date.now() });
  const status = await submitToIndexNow(SITE_URL, paths.map(absoluteUrl));
  return Response.json({ submitted: paths.length, status }, { status: status < 300 ? 200 : 502 });
}
