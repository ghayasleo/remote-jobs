import { ACCOUNT_MCP_ENABLED } from "@/lib/features";
import { CORS, json, notFound } from "@/lib/oauth/endpoints";
import { allowedRedirect, registerClient } from "@/lib/oauth/tokens";

/** Dynamic client registration (RFC 7591): AI apps register themselves before asking to sign in. */
export async function POST(request: Request) {
  if (!ACCOUNT_MCP_ENABLED) return notFound();
  const body = (await request.json().catch(() => null)) as { redirect_uris?: unknown; client_name?: unknown } | null;
  const redirectUris = Array.isArray(body?.redirect_uris) ? body.redirect_uris.filter((uri): uri is string => typeof uri === "string").slice(0, 10) : [];
  if (redirectUris.length === 0 || !redirectUris.every(allowedRedirect)) {
    return json({ error: "invalid_redirect_uri", error_description: "Redirect addresses must be https, http on localhost, or an app's own scheme." }, 400);
  }
  const name = typeof body?.client_name === "string" ? body.client_name.slice(0, 80) : "An app";
  const clientId = await registerClient({ name, redirectUris });
  return json(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: name,
      redirect_uris: redirectUris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    },
    201,
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
