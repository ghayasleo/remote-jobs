import { currentUser, isSameOrigin } from "@/lib/auth/session";
import { tailorForJob } from "@/lib/cv-maker/store";
import { CV_MAKER_ENABLED } from "@/lib/features";

const NO_STORE = { "cache-control": "private, no-store" };

/** Makes (or finds) the CV tailored to one saved job: { jobKey: "company/id" }. */
export async function POST(request: Request) {
  if (!CV_MAKER_ENABLED) return Response.json({ error: "Not found" }, { status: 404 });
  if (!isSameOrigin(request)) return Response.json({ error: "Cross-site request" }, { status: 403 });
  const user = await currentUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401, headers: NO_STORE });
  const body = (await request.json().catch(() => null)) as { jobKey?: unknown } | null;
  const jobKey = typeof body?.jobKey === "string" ? body.jobKey.slice(0, 400) : "";
  const result = await tailorForJob(user.id, jobKey);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status, headers: NO_STORE });
  return Response.json({ id: result.record.id, created: result.created, matched: result.matched, gaps: result.record.gaps }, { headers: NO_STORE });
}
