import { filterJobs, jobPath, parseJobParams, serializeJobParams, type JobListing } from "./jobs";

// The pure parts of job alerts, shared by the server and tests.

export const ALERTS_PER_DEVICE = 10;
export const FREQUENCIES = ["daily", "hourly"] as const;
export type Frequency = (typeof FREQUENCIES)[number];
export const DAY_MS = 23 * 60 * 60 * 1000; // "daily" with an hour of slack for cron timing

export type PushSubscriptionInput = { endpoint: string; keys: { p256dh: string; auth: string } };

/** A push subscription from the browser, or null if it isn't one. */
export function cleanSubscription(value: unknown): PushSubscriptionInput | null {
  const v = value as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  if (!v || typeof v.endpoint !== "string" || !/^https:\/\/[^\s]{10,1000}$/.test(v.endpoint)) return null;
  const { p256dh, auth } = v.keys ?? {};
  if (typeof p256dh !== "string" || typeof auth !== "string" || p256dh.length > 200 || auth.length > 100) return null;
  return { endpoint: v.endpoint, keys: { p256dh, auth } };
}

/** A Jobs search's query string in its one canonical form ("" for every role). */
export const canonicalQuery = (query: string) => serializeJobParams(parseJobParams(query));

export type AlertPayload = { title: string; body: string; url: string; tag: string };

/** What a notification says for a batch of new roles. */
export function alertPayload(alert: { id: string; label: string; query: string }, roles: JobListing[]): AlertPayload {
  const count = roles.length;
  const shown = roles.slice(0, 3).map((role) => `${role.title} at ${role.companyName}`);
  return {
    title: `${count} new remote ${count === 1 ? "role" : "roles"}${alert.label ? ` · ${alert.label}` : ""}`,
    body: shown.join("\n") + (count > shown.length ? `\n…and ${count - shown.length} more` : ""),
    url: count === 1 ? jobPath(roles[0]) : `/jobs${alert.query}`,
    tag: `alert-${alert.id}`,
  };
}

/** Whether an alert should be checked now: hourly ones always, daily ones a day after the last notification. */
export const isDue = (alert: { frequency: Frequency; last_sent_at: string | Date }, now: Date) =>
  alert.frequency === "hourly" || now.getTime() - new Date(alert.last_sent_at).getTime() >= DAY_MS;

/** Roles matching an alert's search that were posted since its last notification. */
export function newRolesFor(jobs: JobListing[], query: string, since: string | Date, now: Date) {
  const after = new Date(since).toISOString();
  return filterJobs(jobs, parseJobParams(query), now.getTime()).filter((job) => job.postedAt !== null && job.postedAt > after);
}
