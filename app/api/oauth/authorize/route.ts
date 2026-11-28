import { currentUser, isSameOrigin } from "@/lib/auth/session";
import { ACCOUNT_MCP_ENABLED } from "@/lib/features";
import { checkAuthorize, notFound, originOf } from "@/lib/oauth/endpoints";
import { issueCode } from "@/lib/oauth/tokens";

const NO_STORE = { "cache-control": "private, no-store" };

/** The consent page checks the request here before asking: { client name } or why it can't go ahead. */
export async function GET(request: Request) {
  if (!ACCOUNT_MCP_ENABLED) return notFound();
  const result = await checkAuthorize(new URL(request.url).searchParams, originOf(request));
  if (!result.ok) return Response.json({ ok: false, message: result.message, redirect: result.redirect ?? null }, { headers: NO_STORE });
  return Response.json({ ok: true, clientName: result.request.client.name, redirectHost: new URL(result.request.redirectUri).host }, { headers: NO_STORE });
}

/** The signed-in person said yes or no: where to send the browser next. */
export async function POST(request: Request) {
  if (!ACCOUNT_MCP_ENABLED) return notFound();
  if (!isSameOrigin(request)) return Response.json({ error: "Cross-site request" }, { status: 403 });
  const user = await currentUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401, headers: NO_STORE });
  const body = (await request.json().catch(() => null)) as { params?: string; allow?: boolean } | null;
  const result = await checkAuthorize(new URLSearchParams(body?.params ?? ""), originOf(request));
  if (!result.ok) return Response.json({ redirect: result.redirect ?? null, message: result.message }, { headers: NO_STORE });

  const back = new URL(result.request.redirectUri);
  if (body?.allow === true) {
    back.searchParams.set(
      "code",
      await issueCode({
        userId: user.id,
        clientId: result.request.clientId,
        redirectUri: result.request.redirectUri,
        challenge: result.request.challenge,
        scope: result.request.scope,
        resource: result.request.resource,
      }),
    );
  } else {
    back.searchParams.set("error", "access_denied");
  }
  if (result.request.state) back.searchParams.set("state", result.request.state);
  back.searchParams.set("iss", originOf(request));
  return Response.json({ redirect: back.toString() }, { headers: NO_STORE });
}
