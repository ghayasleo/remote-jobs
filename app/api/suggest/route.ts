import { createHmac } from "node:crypto";
import { currentUser, isSameOrigin } from "@/lib/auth/session";
import { db, hasDatabase } from "@/lib/db";
import { checkSuggestion } from "@/lib/suggestions";

const PER_DAY = 5;

/** A keyed hash of the visitor's address: enough to rate-limit, without storing the address. */
function ipHash(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return createHmac("sha256", process.env.AUTH_SECRET ?? "remotejobs").update(ip).digest("hex").slice(0, 32);
}

/** Stores a suggested company for review. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Cross-site request" }, { status: 403 });
  if (!hasDatabase()) return Response.json({ error: "Suggestions aren't available right now." }, { status: 503 });

  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  // A field people never see: bots that fill every box get a quiet "thanks".
  if (typeof body.company_fax === "string" && body.company_fax !== "") return Response.json({ ok: true });

  const checked = checkSuggestion(body);
  if (!checked.ok) return Response.json({ error: checked.error, field: checked.field }, { status: 400 });

  const sql = db();
  const hash = ipHash(request);
  const [{ count }] = await sql`
    select count(*)::int as count from company_suggestions
    where ip_hash = ${hash} and created_at > now() - interval '1 day'`;
  if (count >= PER_DAY) {
    return Response.json({ error: "Thanks! That's plenty for today. Please come back tomorrow." }, { status: 429 });
  }

  const user = await currentUser();
  const { name, website, careersUrl, note, contactEmail } = checked.suggestion;
  await sql`
    insert into company_suggestions (name, website, careers_url, note, contact_email, user_id, ip_hash)
    values (${name}, ${website}, ${careersUrl}, ${note}, ${contactEmail}, ${user?.id ?? null}, ${hash})`;
  return Response.json({ ok: true });
}
