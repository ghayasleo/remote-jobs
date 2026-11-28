import "server-only";

import { getPublicOrigin } from "mcp-handler";
import { SCOPE, allowedRedirect, readClient, type OAuthClient } from "./tokens";

// What the OAuth endpoints share: where things live, CORS for clients that
// run in a browser, and checking an authorization request.

export const MCP_ACCOUNT_PATH = "/mcp/account";
export const RESOURCE_METADATA_PATH = "/.well-known/oauth-protected-resource/mcp/account";

export const originOf = (request: Request) => getPublicOrigin(request);
export const resourceOf = (request: Request) => `${originOf(request)}${MCP_ACCOUNT_PATH}`;

export const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "authorization, content-type, mcp-protocol-version",
  "access-control-max-age": "86400",
};

export const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { ...CORS, "cache-control": "no-store" } });

export const notFound = () => Response.json({ error: "not_found" }, { status: 404 });

export type AuthorizeRequest = {
  client: OAuthClient;
  clientId: string;
  redirectUri: string;
  challenge: string;
  state: string | null;
  scope: string;
  resource: string;
};

/**
 * Checks an authorization request. Problems found before the redirect address
 * is known to be the client's are shown on the page; later ones go back to
 * the client as an OAuth error.
 */
export async function checkAuthorize(
  params: URLSearchParams,
  origin: string,
): Promise<{ ok: true; request: AuthorizeRequest } | { ok: false; message: string; redirect?: string }> {
  const clientId = params.get("client_id") ?? "";
  const redirectUri = params.get("redirect_uri") ?? "";
  const client = clientId ? await readClient(clientId) : null;
  if (!client) return { ok: false, message: "This app isn't registered. Remove it from your AI app and add the RemoteJobs connector again." };
  if (!redirectUri || !client.redirectUris.includes(redirectUri) || !allowedRedirect(redirectUri)) {
    return { ok: false, message: "This app's return address doesn't match the one it registered, so it can't be trusted with a sign-in." };
  }
  const state = params.get("state");
  const fail = (error: string, description: string) => {
    const back = new URL(redirectUri);
    back.searchParams.set("error", error);
    back.searchParams.set("error_description", description);
    if (state) back.searchParams.set("state", state);
    return { ok: false as const, message: description, redirect: back.toString() };
  };
  if (params.get("response_type") !== "code") return fail("unsupported_response_type", "Only the authorization code flow is supported.");
  const challenge = params.get("code_challenge") ?? "";
  if (!/^[A-Za-z0-9_-]{43}$/.test(challenge) || params.get("code_challenge_method") !== "S256") {
    return fail("invalid_request", "PKCE with S256 is required.");
  }
  const resource = params.get("resource") ?? `${origin}${MCP_ACCOUNT_PATH}`;
  if (resource.replace(/\/$/, "") !== `${origin}${MCP_ACCOUNT_PATH}`) return fail("invalid_target", "Unknown resource.");
  const scope = params.get("scope") ?? SCOPE;
  if (scope.split(" ").some((value) => value && value !== SCOPE)) return fail("invalid_scope", `The only scope is "${SCOPE}".`);
  return { ok: true, request: { client, clientId, redirectUri, challenge, state, scope: SCOPE, resource: `${origin}${MCP_ACCOUNT_PATH}` } };
}
