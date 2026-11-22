import "server-only";

import type { CallToolResult, McpServer, ServerContext } from "@modelcontextprotocol/server";
import { z } from "zod";
import { findSlugByAlias, getCompany } from "@/lib/data/companies";
import { getJob } from "@/lib/data/jobs";
import { COMPANY_SIZES, REMOTE_POLICIES, TECHS } from "@/lib/data/labels";
import { REGION_FILTER_KEYS, SORTS, type SortKey } from "@/lib/explore";
import { JOB_CATEGORY_KEYS, JOB_REGION_KEYS, JOB_SORTS, POSTED_WITHIN, countrySlug, jobPath, type JobSort } from "@/lib/jobs";
import { loadExplore, loadInsights, loadJobs, siteOrigin } from "./data";
import {
  MAX_RESULTS,
  clipDescription,
  companyDetails,
  companyPath,
  findCompany,
  htmlToText,
  marketOverview,
  salaryInsights,
  searchCompanies,
  searchJobs,
} from "./tools";

// The tools the MCP endpoint (app/mcp/route.ts) offers. All read public data.

export const SERVER_INFO = { name: "remotejobs", version: "1.0.0" };

export const SERVER_INSTRUCTIONS = `Remote Jobs (remotejobs.ghayasuddin.net) lists remote-friendly tech companies from the open-source remoteintech/remote-jobs list, and the remote roles open on their public job boards (Greenhouse, Lever, Ashby, Workable, Recruitee), refreshed hourly.
Use search_jobs to find roles, search_companies to find employers, get_company and get_job for details, salary_insights for pay and market_overview for the overall picture.
Every result has a url on remotejobs.ghayasuddin.net: share it with the user so they can read the full page and apply.`;

const oneOf = <T extends string>(values: readonly T[]) => z.enum(values as [T, ...T[]]);
const listOf = <T extends string>(values: readonly T[], description: string) =>
  z.array(oneOf(values)).max(values.length).optional().describe(description);

const limit = z.number().int().min(1).max(MAX_RESULTS).default(10).describe(`How many results to return, at most ${MAX_RESULTS}.`);
const offset = z.number().int().min(0).max(10_000).default(0).describe("How many results to skip, for the next page.");

// Most profiles tag front-end work only as "javascript", so stack: ["react"] finds a handful.
const STACK_HINT =
  'Broad technology tags from the company profiles (any of them matches). Many companies tag front-end work only as "javascript", so for a specific framework such as React or Django, put it in query instead.';

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

const answer = (value: unknown): CallToolResult => ({ content: [{ type: "text", text: JSON.stringify(value) }] });
const failure = (message: string): CallToolResult => ({ content: [{ type: "text", text: message }], isError: true });
const UNAVAILABLE = "The site's data couldn't be loaded just now. Try again in a minute.";

/** Where links point and data comes from, for this request. */
function context(ctx: ServerContext) {
  const origin = siteOrigin(ctx.http?.req);
  return { origin, url: (path: string) => new URL(path, origin).toString() };
}

/** Runs a tool, turning a failed data load into a message the model can pass on. */
async function guarded(run: () => Promise<CallToolResult>): Promise<CallToolResult> {
  try {
    return await run();
  } catch (error) {
    console.error("[mcp]", error);
    return failure(UNAVAILABLE);
  }
}

export function registerTools(server: McpServer) {
  server.registerTool(
    "search_jobs",
    {
      title: "Search remote jobs",
      description:
        "Search the remote roles currently open at remote-friendly tech companies, newest first. Filters combine; leave them out to see everything. Each job has an id and company_slug for get_job, and a url to its page.",
      inputSchema: z.object({
        query: z.string().max(100).optional().describe('Words that must all appear in the title, company, location or team, e.g. "senior backend" or "designer".'),
        category: listOf(JOB_CATEGORY_KEYS, "Kinds of work."),
        where: listOf(JOB_REGION_KEYS, 'Regions the role can be done from. Roles open "anywhere" match every region.'),
        country: z
          .string()
          .max(60)
          .optional()
          .describe('The country the candidate lives in, in English (e.g. "Pakistan", "Germany"): only roles open to people there.'),
        posted_within: oneOf(Object.keys(POSTED_WITHIN) as (keyof typeof POSTED_WITHIN)[]).optional().describe("Only roles posted in the last day, week or month."),
        with_salary: z.boolean().optional().describe("Only roles whose posting publishes pay."),
        remote_policy: listOf(REMOTE_POLICIES, "The company's remote policy."),
        company_size: listOf(COMPANY_SIZES, "Company size: tiny 1–10, small 11–50, medium 51–200, large 201–1,000, enterprise 1,000+ people."),
        stack: listOf(TECHS, STACK_HINT),
        sort: oneOf(Object.keys(JOB_SORTS) as JobSort[]).optional().describe("newest (default) or company A–Z."),
        limit,
        offset,
      }),
      annotations: { title: "Search remote jobs", ...READ_ONLY },
    },
    (input, ctx) =>
      guarded(async () => {
        const { origin, url } = context(ctx);
        const result = searchJobs(await loadJobs(origin), input, Date.now(), url);
        return "error" in result ? failure(result.error!) : answer(result);
      }),
  );

  server.registerTool(
    "search_companies",
    {
      title: "Search remote-friendly companies",
      description:
        "Search remote-friendly tech companies by name, product or technology, where they hire, remote policy, size and stack. By default companies hiring now come first. Use get_company for one company's full profile and open roles.",
      inputSchema: z.object({
        query: z.string().max(100).optional().describe('Words to match in the name, description or stack, e.g. "kubernetes" or "fintech".'),
        region: listOf(REGION_FILTER_KEYS, "Where the candidate is based. Each choice also matches companies that hire worldwide."),
        remote_policy: listOf(REMOTE_POLICIES, "Remote policy."),
        stack: listOf(TECHS, STACK_HINT),
        size: listOf(COMPANY_SIZES, "Company size: tiny 1–10, small 11–50, medium 51–200, large 201–1,000, enterprise 1,000+ people."),
        hiring_now: z.boolean().optional().describe("Only companies with open roles on their job board right now."),
        recently_added: z.boolean().optional().describe("Only companies added to the list in the last year."),
        sort: oneOf(Object.keys(SORTS) as SortKey[]).optional().describe("recommended (default: hiring first), name, newest (recently added) or roles (most open roles)."),
        limit,
        offset,
      }),
      annotations: { title: "Search remote-friendly companies", ...READ_ONLY },
    },
    (input, ctx) =>
      guarded(async () => {
        const { origin, url } = context(ctx);
        return answer(searchCompanies(await loadExplore(origin), input, url));
      }),
  );

  server.registerTool(
    "get_company",
    {
      title: "Get a company",
      description:
        "One company's profile: what it does, its remote policy, where it hires, how to apply, office locations, its stack and the remote roles open now (up to 25, newest first).",
      inputSchema: z.object({
        company: z.string().min(1).max(100).describe('The company\'s slug, name or website domain, e.g. "gitlab", "GitLab" or "gitlab.com".'),
      }),
      annotations: { title: "Get a company", ...READ_ONLY },
    },
    ({ company }, ctx) =>
      guarded(async () => {
        const { origin, url } = context(ctx);
        const explore = await loadExplore(origin);
        let listed = findCompany(explore.companies, company);
        if (!listed) {
          // A company renamed upstream keeps its old slug as an alias.
          const renamed = await findSlugByAlias(countrySlug(company));
          listed = renamed ? (explore.companies.find((candidate) => candidate.slug === renamed) ?? null) : null;
        }
        if (!listed) {
          const close = searchCompanies(explore, { query: company, limit: 5 }, url).companies;
          return failure(
            close.length
              ? `No company called "${company}". Close matches: ${close.map((match) => `${match.name} (${match.slug})`).join(", ")}.`
              : `No company called "${company}". Try search_companies.`,
          );
        }
        const [profile, jobs] = await Promise.all([getCompany(listed.slug), loadJobs(origin)]);
        return answer(companyDetails(profile, listed, explore.hiring, jobs, url));
      }),
  );

  server.registerTool(
    "get_job",
    {
      title: "Get a job",
      description:
        "One remote role in full, checked live against the company's job board: the description, location, pay when published, its page and the link to apply. Takes the company_slug and id from search_jobs or get_company.",
      inputSchema: z.object({
        company_slug: z.string().min(1).max(100).describe('The company_slug from a job result, e.g. "gitlab".'),
        id: z.string().min(1).max(200).describe("The id from a job result."),
      }),
      annotations: { title: "Get a job", ...READ_ONLY, openWorldHint: true },
    },
    ({ company_slug, id }, ctx) =>
      guarded(async () => {
        const { origin, url } = context(ctx);
        const listed = findCompany((await loadExplore(origin)).companies, company_slug);
        const job = listed ? await getJob(listed.slug, id) : null;
        if (!listed || !job) return failure(`No remote role ${id} at "${company_slug}". Use search_jobs to find current roles.`);

        const companyUrl = url(companyPath(job.company.slug));
        if (job.status === "unavailable") {
          return answer({ status: "unavailable", message: `${job.company.name}'s job board couldn't be reached just now. Try again later.`, company_url: companyUrl });
        }
        if (job.status === "closed") {
          return answer({
            status: "closed",
            message: `This role is no longer open on ${job.company.name}'s job board.`,
            company_url: companyUrl,
            other_remote_roles: job.others.slice(0, 10).map((role) => ({
              title: role.title,
              id: role.id,
              location: role.location || null,
              url: url(jobPath({ company: job.company.slug, id: role.id, title: role.title })),
            })),
          });
        }
        const { role, detail } = job;
        return answer({
          status: "open",
          title: role.title,
          company: job.company.name,
          company_url: companyUrl,
          location: role.location || null,
          team: role.team,
          employment_type: role.employmentType,
          salary: role.salary ?? detail?.payText ?? null,
          posted: role.postedAt,
          url: url(jobPath({ company: job.company.slug, id: role.id, title: role.title })),
          apply_url: role.url,
          description: detail ? clipDescription(htmlToText(detail.html)) : null,
          source: `${job.providerLabel}, checked ${job.fetchedAt}`,
        });
      }),
  );

  server.registerTool(
    "salary_insights",
    {
      title: "Remote salaries",
      description:
        "What remote tech roles pay, from the postings that publish an annual US-dollar range: the median and typical range overall and by kind of work, and the best-paid roles. Narrow it to a kind of work or to title words.",
      inputSchema: z.object({
        category: oneOf(JOB_CATEGORY_KEYS.filter((key) => key !== "other") as Exclude<(typeof JOB_CATEGORY_KEYS)[number], "other">[])
          .optional()
          .describe("One kind of work."),
        query: z.string().max(100).optional().describe('Words that must appear in the title or company, e.g. "staff engineer".'),
      }),
      annotations: { title: "Remote salaries", ...READ_ONLY },
    },
    (input, ctx) =>
      guarded(async () => {
        const { origin, url } = context(ctx);
        return answer(salaryInsights(await loadJobs(origin), input, url));
      }),
  );

  server.registerTool(
    "market_overview",
    {
      title: "Remote hiring market",
      description:
        "The state of remote tech hiring right now: how many companies are hiring and how many remote roles are open, who has the most, who posted the most this month, the mix by kind of work, region and remote policy, and how often pay is published.",
      inputSchema: z.object({}),
      annotations: { title: "Remote hiring market", ...READ_ONLY },
    },
    (_input, ctx) =>
      guarded(async () => {
        const { origin, url } = context(ctx);
        const [insights, jobs] = await Promise.all([loadInsights(origin), loadJobs(origin)]);
        return answer(marketOverview(insights, jobs, Date.now(), url));
      }),
  );
}
