import { isSameOrigin, startSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

// Development only: signs this browser in as one test user, so features that
// need an account can be tried on localhost without Google. It works only
// under `next dev` with DEV_LOGIN=1, which lives in .env.development.local
// next to the development database's DATABASE_URL; anywhere else it's a 404.

const enabled = () => process.env.NODE_ENV === "development" && process.env.DEV_LOGIN === "1";

export async function POST(request: Request) {
  if (!enabled()) return Response.json({ error: "Not found" }, { status: 404 });
  if (!isSameOrigin(request)) return Response.json({ error: "Cross-site request" }, { status: 403 });
  const email = process.env.DEV_LOGIN_EMAIL || "test@remotejobs.localhost";
  const name = process.env.DEV_LOGIN_NAME || "Test User";
  const [row] = await db()`
    insert into users (google_sub, email, name, picture)
    values ('dev:test-user', ${email}, ${name}, null)
    on conflict (google_sub) do update set email = excluded.email, name = excluded.name, last_seen_at = now()
    returning id, email, name, picture`;
  await startSession({ id: row.id, email: row.email, name: row.name, picture: row.picture });
  return Response.json({ ok: true, name: row.name });
}
