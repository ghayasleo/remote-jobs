import { ACCOUNT_MCP_ENABLED } from "@/lib/features";
import { tokenStillAllowed } from "@/lib/oauth/access";
import { CORS, json, notFound, resourceOf } from "@/lib/oauth/endpoints";
import { issueTokens, readClient, readRefresh, redeemCode } from "@/lib/oauth/tokens";

const fail = (error: string, description: string, status = 400) => json({ error, error_description: description }, status);

/** The token endpoint: trades an authorization code (with its PKCE verifier) or a refresh token for tokens. */
export async function POST(request: Request) {
  if (!ACCOUNT_MCP_ENABLED) return notFound();
  const type = request.headers.get("content-type") ?? "";
  const form = type.includes("application/json")
    ? new URLSearchParams(Object.entries((await request.json().catch(() => ({}))) as Record<string, string>))
    : new URLSearchParams(await request.text());
  const clientId = form.get("client_id") ?? "";
  if (!(await readClient(clientId))) return fail("invalid_client", "Unknown client.", 401);
  const resource = resourceOf(request);

  if (form.get("grant_type") === "authorization_code") {
    const grant = await redeemCode(form.get("code") ?? "", {
      clientId,
      redirectUri: form.get("redirect_uri") ?? "",
      verifier: form.get("code_verifier") ?? "",
    });
    if (!grant || grant.resource !== resource) return fail("invalid_grant", "The code is invalid, expired, or doesn't match this request.");
    if (!(await tokenStillAllowed(grant.userId, grant.issuedAt))) return fail("invalid_grant", "That account no longer exists, or its apps were just disconnected.");
    return json(await issueTokens(grant.userId, clientId, grant.scope, resource));
  }

  if (form.get("grant_type") === "refresh_token") {
    const refresh = await readRefresh(form.get("refresh_token") ?? "", clientId);
    if (!refresh || refresh.resource !== resource) return fail("invalid_grant", "The refresh token is invalid or expired.");
    if (!(await tokenStillAllowed(refresh.userId, refresh.issuedAt))) return fail("invalid_grant", "This app was disconnected, or the account no longer exists. Connect it again.");
    return json(await issueTokens(refresh.userId, clientId, refresh.scope, resource));
  }

  return fail("unsupported_grant_type", "Use authorization_code or refresh_token.");
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
