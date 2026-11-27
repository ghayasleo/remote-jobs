import "server-only";

import { createRemoteJWKSet, jwtVerify } from "jose";

// Google's public signing keys; jose caches them and refetches on rotation.
const GOOGLE_KEYS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export type GoogleProfile = { sub: string; email: string; name: string | null; picture: string | null };

export const googleClientId = () => process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

/**
 * Checks an ID token from "Sign in with Google": signed by Google, issued for
 * this site's client ID, unexpired, with a verified email. Only the public
 * client ID is needed, never the client secret.
 */
export async function verifyGoogleIdToken(token: string): Promise<GoogleProfile | null> {
  const audience = googleClientId();
  if (!audience || !token) return null;
  try {
    const { payload } = await jwtVerify(token, GOOGLE_KEYS, { issuer: ISSUERS, audience });
    if (typeof payload.sub !== "string" || typeof payload.email !== "string" || payload.email_verified !== true) return null;
    return {
      sub: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : null,
      picture: typeof payload.picture === "string" ? payload.picture : null,
    };
  } catch {
    return null;
  }
}
