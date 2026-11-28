import "server-only";

import { SignJWT, jwtVerify } from "jose";

// OAuth 2.1 for the account MCP server (app/mcp/account), stateless: every
// client registration, code and token is a JWT signed with AUTH_SECRET, so
// nothing is stored. Each kind carries its own "typ" and audience, so one can
// never be used as another, or as the site's session cookie.
//
// Clients are public (no secret) and must use PKCE (S256), as OAuth 2.1 and
// the MCP authorization spec require.

const ISSUER = "remotejobs";
const ACCESS_SECONDS = 60 * 60;
const REFRESH_SECONDS = 60 * 60 * 24 * 60;
const CODE_SECONDS = 120;

export const SCOPE = "account";

const secret = () => {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(value);
};

async function sign(payload: Record<string, unknown>, audience: string, seconds?: number) {
  const jwt = new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuer(ISSUER).setAudience(audience).setIssuedAt();
  if (seconds) jwt.setExpirationTime(`${seconds}s`);
  return jwt.sign(secret());
}

async function verify(token: string, audience: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER, audience, algorithms: ["HS256"] });
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ---- Clients (dynamic client registration, RFC 7591) ----

export type OAuthClient = { name: string; redirectUris: string[] };

/**
 * Redirect addresses a client may register: https, loopback http (desktop
 * apps and CLIs listening on localhost), or an app's own scheme
 * (cursor://, vscode://). Never http on another host.
 */
export function allowedRedirect(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.hash) return false;
  if (url.protocol === "https:") return true;
  if (url.protocol === "http:") return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  return /^[a-z][a-z0-9+.-]*:$/.test(url.protocol) && !["javascript:", "data:", "file:", "vbscript:"].includes(url.protocol);
}

export async function registerClient(client: OAuthClient): Promise<string> {
  return sign({ typ: "client", name: client.name, redirect_uris: client.redirectUris }, "oauth-client");
}

export async function readClient(clientId: string): Promise<OAuthClient | null> {
  const payload = await verify(clientId, "oauth-client");
  if (payload?.typ !== "client" || !Array.isArray(payload.redirect_uris)) return null;
  return {
    name: typeof payload.name === "string" && payload.name ? payload.name : "An app",
    redirectUris: payload.redirect_uris.filter((uri): uri is string => typeof uri === "string"),
  };
}

// ---- Authorization codes ----

export type CodeGrant = { userId: string; clientId: string; redirectUri: string; challenge: string; scope: string; resource: string };

export async function issueCode(grant: CodeGrant): Promise<string> {
  return sign(
    { typ: "code", sub: grant.userId, cid: grant.clientId, ruri: grant.redirectUri, chl: grant.challenge, scope: grant.scope, res: grant.resource },
    "oauth-code",
    CODE_SECONDS,
  );
}

async function s256(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return Buffer.from(digest).toString("base64url");
}

/** Checks a code against what the token request presents, including the PKCE verifier. */
export async function redeemCode(
  code: string,
  presented: { clientId: string; redirectUri: string; verifier: string },
): Promise<(CodeGrant & { issuedAt?: number }) | null> {
  const payload = await verify(code, "oauth-code");
  if (payload?.typ !== "code" || typeof payload.sub !== "string") return null;
  if (payload.cid !== presented.clientId || payload.ruri !== presented.redirectUri) return null;
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(presented.verifier)) return null;
  if ((await s256(presented.verifier)) !== payload.chl) return null;
  return {
    userId: payload.sub,
    clientId: presented.clientId,
    redirectUri: presented.redirectUri,
    challenge: String(payload.chl),
    scope: String(payload.scope ?? SCOPE),
    resource: String(payload.res ?? ""),
    issuedAt: typeof payload.iat === "number" ? payload.iat : undefined,
  };
}

// ---- Access and refresh tokens ----

export type TokenSet = { access_token: string; token_type: "Bearer"; expires_in: number; refresh_token: string; scope: string };

export async function issueTokens(userId: string, clientId: string, scope: string, resource: string): Promise<TokenSet> {
  const [access, refresh] = await Promise.all([
    sign({ typ: "access", sub: userId, cid: clientId, scope }, resource, ACCESS_SECONDS),
    sign({ typ: "refresh", sub: userId, cid: clientId, scope, res: resource }, "oauth-refresh", REFRESH_SECONDS),
  ]);
  return { access_token: access, token_type: "Bearer", expires_in: ACCESS_SECONDS, refresh_token: refresh, scope };
}

export async function readRefresh(token: string, clientId: string) {
  const payload = await verify(token, "oauth-refresh");
  if (payload?.typ !== "refresh" || typeof payload.sub !== "string" || payload.cid !== clientId) return null;
  return {
    userId: payload.sub,
    scope: String(payload.scope ?? SCOPE),
    resource: String(payload.res ?? ""),
    issuedAt: typeof payload.iat === "number" ? payload.iat : undefined,
  };
}

/** An access token for this resource: who it's for and when it ends. */
export async function readAccess(token: string, resource: string) {
  const payload = await verify(token, resource);
  if (payload?.typ !== "access" || typeof payload.sub !== "string") return null;
  return {
    userId: payload.sub,
    clientId: String(payload.cid ?? ""),
    scopes: String(payload.scope ?? "").split(" ").filter(Boolean),
    expiresAt: typeof payload.exp === "number" ? payload.exp : undefined,
    issuedAt: typeof payload.iat === "number" ? payload.iat : undefined,
  };
}
