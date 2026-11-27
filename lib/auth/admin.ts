import "server-only";

import { currentUser, type SessionUser } from "./session";

/** The signed-in user, if their email is in ADMIN_EMAILS (comma-separated). */
export async function currentAdmin(): Promise<SessionUser | null> {
  const user = await currentUser();
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return user && admins.includes(user.email.toLowerCase()) ? user : null;
}
