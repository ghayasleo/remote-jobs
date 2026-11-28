import "server-only";

import { getJob } from "@/lib/data/jobs";
import { postingText } from "@/lib/data/job-boards/sanitize";
import { db } from "@/lib/db";
import { cleanCvData, starterCv, type CvData, type CvRecord, type CvSummary } from "./model";
import { tailorCv } from "./tailor";

// A person's CVs in the database: the main one and the ones tailored to saved
// jobs. Shared by the CV API routes and the account MCP server, so both see
// and change the same thing.

type Row = { id: string; kind: "main" | "tailored"; job_key: string | null; title: string; data: unknown; gaps: unknown; updated_at: Date | string };

function toRecord(row: Row): CvRecord {
  return {
    id: row.id,
    kind: row.kind,
    jobKey: row.job_key,
    title: row.title,
    data: cleanCvData(row.data) ?? starterCv(),
    gaps: Array.isArray(row.gaps) ? row.gaps.filter((gap): gap is string => typeof gap === "string") : [],
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

const summary = ({ id, kind, jobKey, title, updatedAt }: CvRecord): CvSummary => ({ id, kind, jobKey, title, updatedAt });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The main CV (null until it's first saved) and the tailored ones, newest first. */
export async function listCvs(userId: string): Promise<{ main: CvRecord | null; tailored: CvSummary[] }> {
  const rows = (await db()`
    select id, kind, job_key, title, data, gaps, updated_at from cvs
    where user_id = ${userId} order by updated_at desc`) as Row[];
  const records = rows.map(toRecord);
  return { main: records.find((record) => record.kind === "main") ?? null, tailored: records.filter((record) => record.kind === "tailored").map(summary) };
}

export async function getCv(userId: string, id: string): Promise<CvRecord | null> {
  if (!UUID.test(id)) return null;
  const [row] = (await db()`
    select id, kind, job_key, title, data, gaps, updated_at from cvs where user_id = ${userId} and id = ${id}`) as Row[];
  return row ? toRecord(row) : null;
}

export async function saveMainCv(userId: string, data: CvData): Promise<CvRecord> {
  const [row] = (await db()`
    insert into cvs (user_id, kind, title, data)
    values (${userId}, 'main', 'Main CV', ${JSON.stringify(data)}::jsonb)
    on conflict (user_id) where kind = 'main'
    do update set data = excluded.data, updated_at = now()
    returning id, kind, job_key, title, data, gaps, updated_at`) as Row[];
  return toRecord(row);
}

export async function saveCv(userId: string, id: string, data: CvData): Promise<CvRecord | null> {
  if (!UUID.test(id)) return null;
  const [row] = (await db()`
    update cvs set data = ${JSON.stringify(data)}::jsonb, updated_at = now()
    where user_id = ${userId} and id = ${id}
    returning id, kind, job_key, title, data, gaps, updated_at`) as Row[];
  return row ? toRecord(row) : null;
}

/** Deletes a tailored CV. The main one can't be deleted this way. */
export async function deleteCv(userId: string, id: string): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const rows = await db()`delete from cvs where user_id = ${userId} and id = ${id} and kind = 'tailored' returning id`;
  return rows.length > 0;
}

export type TailorResult =
  | { ok: true; record: CvRecord; created: boolean; matched: string[] }
  | { ok: false; status: number; error: string };

/**
 * A copy of the main CV tailored to one saved job ("company/id"). If one
 * already exists for that job it's returned as it is, so edits made to it
 * are never overwritten.
 */
export async function tailorForJob(userId: string, jobKey: string): Promise<TailorResult> {
  const [company, ...rest] = jobKey.split("/");
  const id = rest.join("/");
  if (!company || !id) return { ok: false, status: 400, error: "Which job?" };

  const [existing] = (await db()`
    select id, kind, job_key, title, data, gaps, updated_at from cvs
    where user_id = ${userId} and kind = 'tailored' and job_key = ${jobKey}`) as Row[];
  if (existing) return { ok: true, record: toRecord(existing), created: false, matched: [] };

  const { main } = await listCvs(userId);
  if (!main) return { ok: false, status: 409, error: "Make your main CV first; tailored CVs start from it." };

  // The live posting when it's still open; otherwise what was saved with the job.
  const job = await getJob(company, id);
  let posting: { title: string; companyName: string; text: string } | null = null;
  if (job?.status === "open") {
    posting = { title: job.role.title, companyName: job.company.name, text: job.detail ? postingText(job.detail.html) : "" };
  } else {
    const [saved] = (await db()`select data from tracked_jobs where user_id = ${userId} and job_key = ${jobKey}`) as { data: { title?: string; companyName?: string } }[];
    if (saved?.data?.title) posting = { title: saved.data.title, companyName: saved.data.companyName ?? company, text: "" };
  }
  if (!posting) return { ok: false, status: 404, error: "That job isn't on RemoteJobs any more." };
  const tailoring = tailorCv(main.data, { title: posting.title, text: posting.text });
  const title = `${posting.title} at ${posting.companyName}`.slice(0, 200);

  const [row] = (await db()`
    insert into cvs (user_id, kind, job_key, title, data, gaps)
    values (${userId}, 'tailored', ${jobKey}, ${title}, ${JSON.stringify(tailoring.data)}::jsonb, ${JSON.stringify(tailoring.gaps)}::jsonb)
    on conflict (user_id, job_key) where kind = 'tailored' do nothing
    returning id, kind, job_key, title, data, gaps, updated_at`) as Row[];
  if (!row) return tailorForJob(userId, jobKey);
  return { ok: true, record: toRecord(row), created: true, matched: tailoring.matched };
}
