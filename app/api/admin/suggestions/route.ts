import { currentAdmin } from "@/lib/auth/admin";
import { isSameOrigin } from "@/lib/auth/session";
import { db } from "@/lib/db";

const SUGGESTION_STATUSES = ["new", "added", "not-a-fit"] as const;

/** Marks a suggestion as added or not a fit. Admins only. */
export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Cross-site request" }, { status: 403 });
  if (!(await currentAdmin())) return Response.json({ error: "Not allowed" }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { id?: unknown; status?: unknown } | null;
  const id = typeof body?.id === "string" && /^[0-9a-f-]{36}$/.test(body.id) ? body.id : null;
  const status = SUGGESTION_STATUSES.find((value) => value === body?.status);
  if (!id || !status) return Response.json({ error: "Bad request" }, { status: 400 });
  await db()`update company_suggestions set status = ${status} where id = ${id}`;
  return Response.json({ ok: true });
}
