import { currentUser, isSameOrigin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { TRACKER_MAX, cleanTrackedJob, type TrackedJob } from "@/lib/tracker-model";

const NO_STORE = { "cache-control": "private, no-store" };
const SLUG = /^[a-z0-9-]{1,120}$/;
const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/;

type CompanyChange = { slug: string; saved: boolean; updatedAt: string };

function cleanCompanies(value: unknown): CompanyChange[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, TRACKER_MAX).flatMap((item) => {
    const v = item as Partial<CompanyChange> | null;
    return v && typeof v.slug === "string" && SLUG.test(v.slug) && typeof v.saved === "boolean" && typeof v.updatedAt === "string" && ISO.test(v.updatedAt)
      ? [{ slug: v.slug, saved: v.saved, updatedAt: v.updatedAt }]
      : [];
  });
}

/**
 * Two-way sync for signed-in people: takes this device's saved jobs and
 * companies (removals included), keeps whichever change is newer per item,
 * and returns the account's merged lists.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Cross-site request" }, { status: 403 });
  const user = await currentUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401, headers: NO_STORE });

  const body = (await request.json().catch(() => null)) as { jobs?: unknown; companies?: unknown } | null;
  const jobs = (Array.isArray(body?.jobs) ? body.jobs : [])
    .slice(0, TRACKER_MAX)
    .map(cleanTrackedJob)
    .filter((job): job is TrackedJob => job !== null);
  const companies = cleanCompanies(body?.companies);

  const sql = db();
  // Newer change wins per item: an update only lands when it's more recent.
  await sql.transaction([
    sql`
      insert into tracked_jobs (user_id, job_key, data, updated_at)
      select ${user.id}::uuid, item->>'key', item, (item->>'updatedAt')::timestamptz
      from jsonb_array_elements(${JSON.stringify(jobs)}::jsonb) as item
      on conflict (user_id, job_key) do update
        set data = excluded.data, updated_at = excluded.updated_at
        where tracked_jobs.updated_at < excluded.updated_at`,
    sql`
      insert into saved_companies (user_id, slug, saved, updated_at)
      select ${user.id}::uuid, item->>'slug', (item->>'saved')::boolean, (item->>'updatedAt')::timestamptz
      from jsonb_array_elements(${JSON.stringify(companies)}::jsonb) as item
      on conflict (user_id, slug) do update
        set saved = excluded.saved, updated_at = excluded.updated_at
        where saved_companies.updated_at < excluded.updated_at`,
  ]);

  const [jobRows, companyRows] = await Promise.all([
    sql`select data from tracked_jobs where user_id = ${user.id} order by updated_at desc limit ${TRACKER_MAX}`,
    sql`select slug, saved, updated_at from saved_companies where user_id = ${user.id} order by updated_at desc limit ${TRACKER_MAX}`,
  ]);
  return Response.json(
    {
      jobs: jobRows.map((row) => cleanTrackedJob(row.data)).filter(Boolean),
      companies: companyRows.map((row) => ({
        slug: row.slug as string,
        saved: row.saved as boolean,
        updatedAt: new Date(row.updated_at as string).toISOString(),
      })),
    },
    { headers: NO_STORE },
  );
}
