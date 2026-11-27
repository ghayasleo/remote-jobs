// Shared by the server (which sets it) and the browser (which reads it): who's
// signed in, for showing their name and photo. It carries nothing secret; the
// session itself is a separate httpOnly cookie the browser can't read. Pages
// stay static, so knowing who's signed in costs no server work per page view.

export const PROFILE_COOKIE = "rj_user";
export const SESSION_COOKIE = "rj_session";
/** Sessions last half a year; signing in again renews them. */
export const SESSION_MAX_AGE = 180 * 24 * 60 * 60;

export type Profile = { name: string | null; picture: string | null };

export function encodeProfile(profile: Profile) {
  return encodeURIComponent(JSON.stringify(profile));
}

/** The profile from a cookie header (document.cookie or a request's), or null when signed out. */
export function readProfile(cookieHeader: string): Profile | null {
  const raw = cookieHeader
    .split(/;\s*/)
    .find((part) => part.startsWith(`${PROFILE_COOKIE}=`))
    ?.slice(PROFILE_COOKIE.length + 1);
  if (!raw) return null;
  try {
    const value = JSON.parse(decodeURIComponent(raw)) as Partial<Profile>;
    return {
      name: typeof value.name === "string" ? value.name : null,
      picture: typeof value.picture === "string" ? value.picture : null,
    };
  } catch {
    return null;
  }
}

/** One or two letters for an avatar without a photo. */
export function initials(name: string | null) {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return (words[0][0] + (words.length > 1 ? words.at(-1)![0] : "")).toUpperCase();
}
