import { getRemoteJobs } from "@/lib/data/jobs";

// Every remote role, for the Jobs feed. Prerendered and refreshed hourly.
export async function GET() {
  return Response.json(await getRemoteJobs());
}
