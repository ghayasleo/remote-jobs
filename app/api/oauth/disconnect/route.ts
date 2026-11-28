import { currentUser, isSameOrigin } from "@/lib/auth/session";
import { ACCOUNT_MCP_ENABLED } from "@/lib/features";
import { disconnectApps } from "@/lib/oauth/access";

/** Signs every AI app out of the signed-in person's account (from the Account screen). */
export async function POST(request: Request) {
  if (!ACCOUNT_MCP_ENABLED) return Response.json({ error: "Not found" }, { status: 404 });
  if (!isSameOrigin(request)) return Response.json({ error: "Cross-site request" }, { status: 403 });
  const user = await currentUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  await disconnectApps(user.id);
  return Response.json({ ok: true }, { headers: { "cache-control": "private, no-store" } });
}
