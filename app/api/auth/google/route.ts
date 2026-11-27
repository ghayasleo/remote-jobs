import { verifyGoogleIdToken } from "@/lib/auth/google";
import { isSameOrigin, startSession } from "@/lib/auth/session";
import { upsertGoogleUser } from "@/lib/auth/users";
import { hasDatabase } from "@/lib/db";

/**
 * Signs in with the ID token from "Sign in with Google": checks it, creates or
 * updates the user, and sets the session cookies.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Cross-site request" }, { status: 403 });
  if (!hasDatabase() || !process.env.AUTH_SECRET) {
    return Response.json({ error: "Sign-in isn't set up on this server" }, { status: 503 });
  }
  const body = (await request.json().catch(() => null)) as { credential?: unknown } | null;
  const credential = typeof body?.credential === "string" ? body.credential : "";
  const profile = await verifyGoogleIdToken(credential);
  if (!profile) return Response.json({ error: "Google couldn't confirm the sign-in. Please try again." }, { status: 401 });

  const user = await upsertGoogleUser(profile);
  await startSession(user);
  return Response.json({ user: { name: user.name, email: user.email, picture: user.picture } });
}
