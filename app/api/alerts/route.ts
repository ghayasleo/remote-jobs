import { ALERTS_PER_DEVICE, FREQUENCIES, alertsConfigured, canonicalQuery, cleanSubscription, type Frequency } from "@/lib/alerts";
import { currentUser, isSameOrigin } from "@/lib/auth/session";
import { db, hasDatabase } from "@/lib/db";

const NO_STORE = { "cache-control": "private, no-store" };

type Body = { action?: unknown; subscription?: unknown; endpoint?: unknown; query?: unknown; label?: unknown; frequency?: unknown; id?: unknown };

async function listFor(endpoint: string) {
  const rows = await db()`
    select id, query, label, frequency, created_at from job_alerts where endpoint = ${endpoint} order by created_at desc`;
  return rows.map((row) => ({
    id: row.id as string,
    query: row.query as string,
    label: row.label as string,
    frequency: row.frequency as Frequency,
    createdAt: new Date(row.created_at as string).toISOString(),
  }));
}

/**
 * Job alerts for this device, keyed by its push subscription endpoint (a long
 * unguessable URL only this browser knows). Everything goes through POST so
 * the endpoint never appears in a URL:
 *   { action: "create", subscription, query, label, frequency }
 *   { action: "list", endpoint }
 *   { action: "delete", endpoint, id }
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Cross-site request" }, { status: 403 });
  if (!hasDatabase() || !alertsConfigured()) return Response.json({ error: "Alerts aren't available right now." }, { status: 503 });
  const body = ((await request.json().catch(() => null)) ?? {}) as Body;
  const sql = db();

  if (body.action === "create") {
    const subscription = cleanSubscription(body.subscription);
    if (!subscription) return Response.json({ error: "Your browser didn't give us a way to notify you." }, { status: 400 });
    const query = canonicalQuery(typeof body.query === "string" ? body.query : "");
    const label = typeof body.label === "string" ? body.label.trim().slice(0, 120) : "";
    const frequency = FREQUENCIES.find((value) => value === body.frequency) ?? "daily";
    const user = await currentUser();
    const [{ count }] = await sql`select count(*)::int as count from job_alerts where endpoint = ${subscription.endpoint}`;
    if (count >= ALERTS_PER_DEVICE) {
      return Response.json({ error: `You can have up to ${ALERTS_PER_DEVICE} alerts on a device. Remove one first.` }, { status: 409 });
    }
    await sql.transaction([
      sql`
        insert into push_subscriptions (endpoint, p256dh, auth, user_id)
        values (${subscription.endpoint}, ${subscription.keys.p256dh}, ${subscription.keys.auth}, ${user?.id ?? null})
        on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth,
          user_id = coalesce(excluded.user_id, push_subscriptions.user_id)`,
      sql`
        insert into job_alerts (endpoint, query, label, frequency)
        values (${subscription.endpoint}, ${query}, ${label}, ${frequency})
        on conflict (endpoint, query) do update set label = excluded.label, frequency = excluded.frequency`,
    ]);
    return Response.json({ alerts: await listFor(subscription.endpoint) }, { headers: NO_STORE });
  }

  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  if (!endpoint) return Response.json({ alerts: [] }, { headers: NO_STORE });
  if (body.action === "delete" && typeof body.id === "string" && /^[0-9a-f-]{36}$/.test(body.id)) {
    await sql`delete from job_alerts where id = ${body.id} and endpoint = ${endpoint}`;
  } else if (body.action === "delete-all") {
    await sql`delete from push_subscriptions where endpoint = ${endpoint}`;
  }
  return Response.json({ alerts: await listFor(endpoint) }, { headers: NO_STORE });
}
