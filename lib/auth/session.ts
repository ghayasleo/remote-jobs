import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { PROFILE_COOKIE, SESSION_COOKIE, SESSION_MAX_AGE, encodeProfile } from "./profile";

export type SessionUser = { id: string; email: string; name: string | null; picture: string | null };

const secret = () => {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(value);
};

const cookieOptions = (httpOnly: boolean) =>
  ({
    httpOnly,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  }) as const;

/** Signs the user in: a signed session cookie, plus a readable one with their name and photo. */
export async function startSession(user: SessionUser) {
  const token = await new SignJWT({ email: user.email, name: user.name, picture: user.picture })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret());
  const store = await cookies();
  store.set(SESSION_COOKIE, token, cookieOptions(true));
  store.set(PROFILE_COOKIE, encodeProfile({ name: user.name, picture: user.picture }), cookieOptions(false));
}

export async function endSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(PROFILE_COOKIE);
}

/** The signed-in user, or null. Only for API routes: reading cookies makes a page dynamic. */
export async function currentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") return null;
    return {
      id: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : null,
      picture: typeof payload.picture === "string" ? payload.picture : null,
    };
  } catch {
    return null;
  }
}

/**
 * Rejects cross-site requests to the sign-in and account endpoints: browsers
 * send Origin on POST and DELETE, and it must be this site.
 */
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}
