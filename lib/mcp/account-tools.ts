import "server-only";

import type { CallToolResult, McpServer, ServerContext } from "@modelcontextprotocol/server";
import { z } from "zod";
import { cvToLatex } from "@/lib/cv-maker/latex";
import { cleanCvData } from "@/lib/cv-maker/model";
import { getCv, listCvs, saveCv, saveMainCv, tailorForJob } from "@/lib/cv-maker/store";
import { cvSuggestions } from "@/lib/cv-maker/suggestions";
import { getCompany } from "@/lib/data/companies";
import { getJob } from "@/lib/data/jobs";
import { db } from "@/lib/db";
import { jobPath } from "@/lib/jobs";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { TRACK_STATUSES, TRACK_STATUS_KEYS, cleanTrackedJob, trackKey, withStatus, type TrackStatus, type TrackedJob } from "@/lib/tracker-model";
import { siteOrigin } from "./data";

// The account MCP server's tools (app/mcp/account): a signed-in person's
// saved jobs, saved companies, job alerts and CVs. Every call is for the
// person whose OAuth token it carries. Writes use the same newest-change-wins
// rules as the browser sync, so changes made here show up on their devices.

export const ACCOUNT_SERVER_INFO = {
  name: "remotejobs-account",
  title: `${SITE_NAME} account`,
  version: "1.0.0",
  description: "Your RemoteJobs saved jobs, saved companies, job alerts and CVs.",
  websiteUrl: SITE_URL,
};

export const ACCOUNT_INSTRUCTIONS = `This is the signed-in person's own RemoteJobs account. list_saved_jobs and update_saved_job manage their application tracker (statuses: ${TRACK_STATUS_KEYS.join(", ")}); list_saved_companies and save_company their shortlist; list_alerts their job alerts; get_cv, update_cv, tailor_cv and cv_suggestions their CVs.
Find jobs and companies with the public RemoteJobs MCP server (search_jobs, search_companies): its company_slug and id are what save_job and tailor_cv take.
Never invent CV content: only rephrase or reorder what the person has written, and ask them before adding anything new.`;

const answer = (value: unknown): CallToolResult => ({ content: [{ type: "text", text: JSON.stringify(value) }] });
const failure = (message: string): CallToolResult => ({ content: [{ type: "text", text: message }], isError: true });

const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false };

function account(ctx: ServerContext) {
  const userId = ctx.http?.authInfo?.extra?.userId;
  if (typeof userId !== "string") throw new Error("Not signed in");
  const origin = siteOrigin(ctx.http?.req);
  return { userId, url: (path: string) => new URL(path, origin).toString() };
}

async function guarded(run: () => Promise<CallToolResult>): Promise<CallToolResult> {
  try {
    return await run();
  } catch (error) {
    console.error("[mcp:account]", error);
    return failure("That didn't work just now. Try again in a minute.");
  }
}

// ---- Saved jobs ----

async function trackedJobs(userId: string): Promise<TrackedJob[]> {
  const rows = await db()`select data from tracked_jobs where user_id = ${userId} order by updated_at desc limit 1000`;
  return rows.map((row) => cleanTrackedJob(row.data)).filter((job): job is TrackedJob => job !== null && !job.deleted);
}

async function writeTracked(userId: string, job: TrackedJob) {
  await db()`
    insert into tracked_jobs (user_id, job_key, data, updated_at)
    values (${userId}, ${job.key}, ${JSON.stringify(job)}::jsonb, ${job.updatedAt}::timestamptz)
    on conflict (user_id, job_key) do update set data = excluded.data, updated_at = excluded.updated_at
      where tracked_jobs.updated_at < excluded.updated_at`;
}

const savedJobView = (job: TrackedJob, url: (path: string) => string) => ({
  company_slug: job.company,
  id: job.id,
  title: job.title,
  company: job.companyName,
  location: job.location,
  status: job.status,
  note: job.note || undefined,
  saved_at: job.savedAt,
  applied_at: job.appliedAt ?? undefined,
  url: url(jobPath({ company: job.company, id: job.id, title: job.title })),
});

const jobRef = {
  company_slug: z.string().min(1).max(120).describe("The job's company_slug, from search_jobs or list_saved_jobs."),
  id: z.string().min(1).max(200).describe("The job's id, from search_jobs or list_saved_jobs."),
};

// ---- Saved companies ----

async function setCompanySaved(userId: string, slug: string, saved: boolean) {
  await db()`
    insert into saved_companies (user_id, slug, saved, updated_at) values (${userId}, ${slug}, ${saved}, now())
    on conflict (user_id, slug) do update set saved = excluded.saved, updated_at = excluded.updated_at`;
}

export function registerAccountTools(server: McpServer) {
  server.registerTool(
    "list_saved_jobs",
    {
      title: "List saved jobs",
      description: "The person's saved jobs (their application tracker), most recently changed first, with each one's status and note.",
      inputSchema: z.object({ status: z.enum(TRACK_STATUS_KEYS as [TrackStatus, ...TrackStatus[]]).optional().describe("Only jobs with this status.") }),
      annotations: { title: "List saved jobs", ...READ },
    },
    ({ status }, ctx) =>
      guarded(async () => {
        const { userId, url } = account(ctx);
        const jobs = (await trackedJobs(userId)).filter((job) => !status || job.status === status);
        return answer({ count: jobs.length, jobs: jobs.map((job) => savedJobView(job, url)) });
      }),
  );

  server.registerTool(
    "save_job",
    {
      title: "Save a job",
      description: "Saves an open job to the person's tracker (status \"saved\"), or returns it if it's already saved.",
      inputSchema: z.object(jobRef),
      annotations: { title: "Save a job", ...WRITE },
    },
    ({ company_slug, id }, ctx) =>
      guarded(async () => {
        const { userId, url } = account(ctx);
        const key = trackKey({ company: company_slug, id });
        const existing = (await trackedJobs(userId)).find((job) => job.key === key);
        if (existing) return answer({ already_saved: true, job: savedJobView(existing, url) });
        const found = await getJob(company_slug, id);
        if (found?.status !== "open") return failure("That job isn't open on RemoteJobs. Find current ones with search_jobs.");
        const now = new Date().toISOString();
        const job: TrackedJob = {
          key,
          company: company_slug,
          companyName: found.company.name,
          domain: found.company.domain ?? null,
          id,
          title: found.role.title,
          location: found.role.location ?? "",
          status: "saved",
          note: "",
          savedAt: now,
          appliedAt: null,
          updatedAt: now,
          order: -Date.now(),
        };
        await writeTracked(userId, job);
        return answer({ saved: true, job: savedJobView(job, url) });
      }),
  );

  server.registerTool(
    "update_saved_job",
    {
      title: "Update a saved job",
      description: `Changes a saved job's status (${TRACK_STATUS_KEYS.map((key) => `${key}: ${TRACK_STATUSES[key]}`).join(", ")}) and/or its note.`,
      inputSchema: z.object({
        ...jobRef,
        status: z.enum(TRACK_STATUS_KEYS as [TrackStatus, ...TrackStatus[]]).optional(),
        note: z.string().max(2000).optional().describe("Replaces the note. An empty string clears it."),
      }),
      annotations: { title: "Update a saved job", ...WRITE },
    },
    ({ company_slug, id, status, note }, ctx) =>
      guarded(async () => {
        const { userId, url } = account(ctx);
        const key = trackKey({ company: company_slug, id });
        const job = (await trackedJobs(userId)).find((candidate) => candidate.key === key);
        if (!job) return failure("That job isn't saved. Save it first with save_job.");
        const now = new Date().toISOString();
        let next: TrackedJob = { ...job, updatedAt: now };
        if (status && status !== job.status) next = { ...withStatus(job, status, now), order: -Date.now() };
        if (note !== undefined) next.note = note;
        await writeTracked(userId, next);
        return answer({ updated: true, job: savedJobView(next, url) });
      }),
  );

  server.registerTool(
    "remove_saved_job",
    {
      title: "Remove a saved job",
      description: "Removes a job from the person's tracker, with its status and note. Confirm with the person first.",
      inputSchema: z.object(jobRef),
      annotations: { title: "Remove a saved job", ...DESTRUCTIVE },
    },
    ({ company_slug, id }, ctx) =>
      guarded(async () => {
        const { userId } = account(ctx);
        const key = trackKey({ company: company_slug, id });
        const job = (await trackedJobs(userId)).find((candidate) => candidate.key === key);
        if (!job) return answer({ removed: false, reason: "It wasn't saved." });
        // A removal is kept as a tombstone, so it reaches the person's other devices too.
        await writeTracked(userId, { ...job, deleted: true, updatedAt: new Date().toISOString() });
        return answer({ removed: true });
      }),
  );

  server.registerTool(
    "list_saved_companies",
    {
      title: "List saved companies",
      description: "The companies the person has saved, most recent first.",
      inputSchema: z.object({}),
      annotations: { title: "List saved companies", ...READ },
    },
    (_input, ctx) =>
      guarded(async () => {
        const { userId, url } = account(ctx);
        const rows = await db()`select slug from saved_companies where user_id = ${userId} and saved order by updated_at desc limit 500`;
        const companies = await Promise.all(
          rows.map(async (row) => {
            const company = await getCompany(row.slug as string);
            return { slug: row.slug as string, name: company?.name ?? row.slug, url: url(`/company-profiles/${row.slug}`) };
          }),
        );
        return answer({ count: companies.length, companies });
      }),
  );

  server.registerTool(
    "save_company",
    {
      title: "Save or unsave a company",
      description: "Adds a company to the person's saved companies, or removes it with saved: false.",
      inputSchema: z.object({
        slug: z.string().min(1).max(120).describe("The company's slug, from search_companies."),
        saved: z.boolean().default(true),
      }),
      annotations: { title: "Save or unsave a company", ...WRITE },
    },
    ({ slug, saved }, ctx) =>
      guarded(async () => {
        const { userId } = account(ctx);
        if (saved && !(await getCompany(slug))) return failure("There's no company with that slug. Find it with search_companies.");
        await setCompanySaved(userId, slug, saved);
        return answer({ slug, saved });
      }),
  );

  server.registerTool(
    "list_alerts",
    {
      title: "List job alerts",
      description: "The person's job alerts: each is a saved Jobs search they get notifications for, on one of their devices.",
      inputSchema: z.object({}),
      annotations: { title: "List job alerts", ...READ },
    },
    (_input, ctx) =>
      guarded(async () => {
        const { userId, url } = account(ctx);
        const rows = await db()`
          select a.id, a.query, a.label, a.frequency, a.created_at from job_alerts a
          join push_subscriptions p on p.endpoint = a.endpoint
          where p.user_id = ${userId} order by a.created_at desc`;
        return answer({
          count: rows.length,
          alerts: rows.map((row) => ({
            id: row.id,
            label: row.label,
            frequency: row.frequency,
            created_at: new Date(row.created_at as string).toISOString(),
            url: url(`/jobs${row.query}`),
          })),
          note: "New alerts are set up from the Jobs page on the device that should get the notifications.",
        });
      }),
  );

  server.registerTool(
    "delete_alert",
    {
      title: "Delete a job alert",
      description: "Deletes one of the person's job alerts. Confirm with the person first.",
      inputSchema: z.object({ id: z.string().uuid().describe("The alert's id, from list_alerts.") }),
      annotations: { title: "Delete a job alert", ...DESTRUCTIVE },
    },
    ({ id }, ctx) =>
      guarded(async () => {
        const { userId } = account(ctx);
        const rows = await db()`
          delete from job_alerts a using push_subscriptions p
          where a.endpoint = p.endpoint and p.user_id = ${userId} and a.id = ${id} returning a.id`;
        return answer({ deleted: rows.length > 0 });
      }),
  );

  server.registerTool(
    "list_cvs",
    {
      title: "List CVs",
      description: "The person's main CV (if they've made one) and the CVs tailored to saved jobs.",
      inputSchema: z.object({}),
      annotations: { title: "List CVs", ...READ },
    },
    (_input, ctx) =>
      guarded(async () => {
        const { userId, url } = account(ctx);
        const { main, tailored } = await listCvs(userId);
        return answer({
          main: main ? { id: main.id, updated_at: main.updatedAt, url: url("/dashboard/cv") } : null,
          tailored: tailored.map((cv) => ({ id: cv.id, title: cv.title, job_key: cv.jobKey, updated_at: cv.updatedAt, url: url(`/dashboard/cv?id=${cv.id}`) })),
        });
      }),
  );

  const cvId = z.string().uuid().optional().describe("A tailored CV's id, from list_cvs. Leave it out for the main CV.");

  async function loadCv(userId: string, id: string | undefined) {
    if (id) return getCv(userId, id);
    return (await listCvs(userId)).main;
  }

  server.registerTool(
    "get_cv",
    {
      title: "Get a CV",
      description: "A CV's content as structured data (contact details, remote-work details, sections, design). Set include_latex to also get the LaTeX it compiles to.",
      inputSchema: z.object({ id: cvId, include_latex: z.boolean().default(false) }),
      annotations: { title: "Get a CV", ...READ },
    },
    ({ id, include_latex }, ctx) =>
      guarded(async () => {
        const { userId, url } = account(ctx);
        const cv = await loadCv(userId, id);
        if (!cv) return failure(id ? "There's no CV with that id." : "No main CV yet. The person can start one in the CV maker, or you can create it with update_cv.");
        return answer({
          id: cv.id,
          kind: cv.kind,
          title: cv.title,
          gaps: cv.gaps.length ? cv.gaps : undefined,
          data: cv.data,
          latex: include_latex ? cvToLatex(cv.data) : undefined,
          url: url(cv.kind === "main" ? "/dashboard/cv" : `/dashboard/cv?id=${cv.id}`),
        });
      }),
  );

  server.registerTool(
    "update_cv",
    {
      title: "Update a CV",
      description:
        "Replaces a CV's content with the given data, in the same shape get_cv returns (read it first and change only what's needed). Creates the main CV if there isn't one. Never add experience or skills the person hasn't confirmed.",
      inputSchema: z.object({ id: cvId, data: z.record(z.string(), z.unknown()).describe("The complete CV data, as from get_cv.") }),
      annotations: { title: "Update a CV", ...WRITE },
    },
    ({ id, data }, ctx) =>
      guarded(async () => {
        const { userId, url } = account(ctx);
        const clean = cleanCvData(data);
        if (!clean) return failure("That isn't valid CV data. Use the shape get_cv returns.");
        const saved = id ? await saveCv(userId, id, clean) : await saveMainCv(userId, clean);
        if (!saved) return failure("There's no CV with that id.");
        return answer({ saved: true, id: saved.id, suggestions: cvSuggestions(saved.data).length, url: url(saved.kind === "main" ? "/dashboard/cv" : `/dashboard/cv?id=${saved.id}`) });
      }),
  );

  server.registerTool(
    "tailor_cv",
    {
      title: "Tailor the CV to a job",
      description:
        "Makes a copy of the main CV tailored to a job: bullets and skills that match the posting move up, and skills the posting asks for that the CV doesn't show come back as gaps (to add only where true). Returns the existing one if already made.",
      inputSchema: z.object(jobRef),
      annotations: { title: "Tailor the CV to a job", ...WRITE },
    },
    ({ company_slug, id }, ctx) =>
      guarded(async () => {
        const { userId, url } = account(ctx);
        const result = await tailorForJob(userId, trackKey({ company: company_slug, id }));
        if (!result.ok) return failure(result.error);
        return answer({
          id: result.record.id,
          created: result.created,
          title: result.record.title,
          matched: result.matched.length ? result.matched : undefined,
          gaps: result.record.gaps,
          url: url(`/dashboard/cv?id=${result.record.id}`),
        });
      }),
  );

  server.registerTool(
    "cv_suggestions",
    {
      title: "Check a CV",
      description: "What to fix or improve in a CV for hiring systems and recruiters: missing details, weak bullets, non-standard headings, dates. No made-up score.",
      inputSchema: z.object({ id: cvId }),
      annotations: { title: "Check a CV", ...READ },
    },
    ({ id }, ctx) =>
      guarded(async () => {
        const { userId } = account(ctx);
        const cv = await loadCv(userId, id);
        if (!cv) return failure(id ? "There's no CV with that id." : "No main CV yet.");
        const suggestions = cvSuggestions(cv.data).map(({ level, title, detail, target }) => ({ level, title, detail, where: target }));
        return answer({ count: suggestions.length, suggestions });
      }),
  );
}
