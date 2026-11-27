import "server-only";

import { sendNotification, setVapidDetails } from "web-push";
import { db } from "./db";
import type { JobListing } from "./jobs";

// Job alerts: saved Jobs searches that send a browser notification when new
// roles match. The hourly snapshot cron calls sendAlerts after each refresh.

export * from "./alerts-model";
import { alertPayload, isDue, newRolesFor, type Frequency } from "./alerts-model";

export const alertsConfigured = () =>
  Boolean(process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_SUBJECT);

type AlertRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  query: string;
  label: string;
  frequency: Frequency;
  last_sent_at: string | Date;
};

/** Sends every alert that's due and has new roles. Gone subscriptions are deleted. */
export async function sendAlerts(jobs: JobListing[], now = new Date()) {
  if (!alertsConfigured()) return { skipped: "Push keys aren't set" };
  setVapidDetails(process.env.VAPID_SUBJECT!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  const sql = db();
  const rows = (await sql`
    select a.id, a.endpoint, s.p256dh, s.auth, a.query, a.label, a.frequency, a.last_sent_at
    from job_alerts a join push_subscriptions s using (endpoint)
    limit 20000`) as AlertRow[];

  let sent = 0;
  let removed = 0;
  const due = rows.filter((row) => isDue(row, now));
  const queue = [...due];
  const worker = async () => {
    for (let row = queue.shift(); row; row = queue.shift()) {
      const fresh = newRolesFor(jobs, row.query, row.last_sent_at, now);
      if (fresh.length === 0) continue;
      try {
        await sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          JSON.stringify(alertPayload(row, fresh)),
          { TTL: 86_400, urgency: "normal" },
        );
        await sql`update job_alerts set last_sent_at = ${now.toISOString()} where id = ${row.id}`;
        sent++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // The browser unsubscribed or the subscription expired: forget the device.
        if (status === 404 || status === 410) {
          await sql`delete from push_subscriptions where endpoint = ${row.endpoint}`;
          removed++;
        }
      }
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  return { alerts: rows.length, due: due.length, sent, removed };
}
