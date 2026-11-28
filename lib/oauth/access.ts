import "server-only";

import { db } from "@/lib/db";

// Tokens are stateless JWTs (lib/oauth/tokens.ts), so they can't be deleted
// one by one. Instead each account records when its apps were last
// disconnected, and any token issued before then is refused.

/** True while the account exists and the token was issued after its apps were last disconnected. */
export async function tokenStillAllowed(userId: string, issuedAt: number | undefined): Promise<boolean> {
  const [user] = (await db()`select apps_revoked_at from users where id = ${userId}`) as { apps_revoked_at: Date | string | null }[];
  if (!user) return false;
  if (!user.apps_revoked_at) return true;
  // Fails safe: a token from the same second as the disconnect counts as before it.
  return typeof issuedAt === "number" && issuedAt * 1000 > new Date(user.apps_revoked_at).getTime();
}

/** Signs every connected app out of this account. */
export async function disconnectApps(userId: string): Promise<void> {
  await db()`update users set apps_revoked_at = now() where id = ${userId}`;
}
