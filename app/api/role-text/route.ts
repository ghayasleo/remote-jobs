import { getJob } from "@/lib/data/jobs";
import { postingText } from "@/lib/data/job-boards/sanitize";

/**
 * A role's title and description as plain text, for the CV check:
 * /api/role-text?role={company}/{id}. Postings rarely change, so the CDN
 * keeps each answer for a day.
 */
export async function GET(request: Request) {
  const role = new URL(request.url).searchParams.get("role") ?? "";
  const [company, ...rest] = role.split("/");
  const id = rest.join("/");
  if (!company || !id) return Response.json({ error: "Which role?" }, { status: 400 });

  const job = await getJob(company, id);
  if (!job || job.status !== "open") {
    return Response.json({ error: "That role isn't open any more." }, { status: 404, headers: { "cache-control": "public, s-maxage=3600" } });
  }
  return Response.json(
    {
      title: job.role.title,
      companyName: job.company.name,
      provider: job.providerLabel,
      text: job.detail ? postingText(job.detail.html) : "",
    },
    { headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=86400" } },
  );
}
