import { ACCOUNT_MCP_ENABLED } from "@/lib/features";
import { CORS, json, notFound, originOf, resourceOf } from "@/lib/oauth/endpoints";
import { SCOPE } from "@/lib/oauth/tokens";

/** Protected resource metadata (RFC 9728) for the account MCP server: where to get a token for it. */
export function GET(request: Request) {
  if (!ACCOUNT_MCP_ENABLED) return notFound();
  return json({
    resource: resourceOf(request),
    authorization_servers: [originOf(request)],
    scopes_supported: [SCOPE],
    bearer_methods_supported: ["header"],
    resource_name: "RemoteJobs account",
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
