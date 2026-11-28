import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { ACCOUNT_MCP_ENABLED } from "@/lib/features";
import { ACCOUNT_INSTRUCTIONS, ACCOUNT_SERVER_INFO, registerAccountTools } from "@/lib/mcp/account-tools";
import { tokenStillAllowed } from "@/lib/oauth/access";
import { CORS, RESOURCE_METADATA_PATH, resourceOf } from "@/lib/oauth/endpoints";
import { readAccess } from "@/lib/oauth/tokens";

// The account MCP server: a signed-in person's saved jobs, companies, alerts
// and CVs, for AI apps they connect. Unlike the public /mcp it needs a
// sign-in: apps get a token through OAuth 2.1 (/.well-known/oauth-* and
// /oauth/*), with the person approving on /oauth/authorize.
// Development only for now (see lib/features.ts).

const mcp = createMcpHandler(registerAccountTools, { serverInfo: ACCOUNT_SERVER_INFO, instructions: ACCOUNT_INSTRUCTIONS });

const authed = withMcpAuth(
  mcp,
  async (request, token) => {
    if (!token) return undefined;
    const access = await readAccess(token, resourceOf(request));
    if (!access) return undefined;
    // Stops working at once when the account is deleted or its apps are disconnected.
    if (!(await tokenStillAllowed(access.userId, access.issuedAt))) return undefined;
    return { token, clientId: access.clientId, scopes: access.scopes, expiresAt: access.expiresAt, extra: { userId: access.userId } };
  },
  { required: true, resourceMetadataPath: RESOURCE_METADATA_PATH },
);

async function handle(request: Request) {
  if (!ACCOUNT_MCP_ENABLED) return Response.json({ error: "Not found" }, { status: 404 });
  const response = await authed(request);
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(CORS)) headers.set(name, value);
  headers.set("access-control-expose-headers", "mcp-session-id, mcp-protocol-version, www-authenticate");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export { handle as GET, handle as POST, handle as DELETE };

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
