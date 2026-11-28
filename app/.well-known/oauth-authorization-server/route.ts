import { ACCOUNT_MCP_ENABLED } from "@/lib/features";
import { CORS, json, notFound, originOf } from "@/lib/oauth/endpoints";
import { SCOPE } from "@/lib/oauth/tokens";

/** OAuth authorization server metadata (RFC 8414), for the account MCP server. */
export function GET(request: Request) {
  if (!ACCOUNT_MCP_ENABLED) return notFound();
  const origin = originOf(request);
  return json({
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    registration_endpoint: `${origin}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: [SCOPE],
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
