import { describe, expect, it } from "vitest";
import { PROFILE_COOKIE, encodeProfile, initials, readProfile } from "@/lib/auth/profile";

describe("profile cookie", () => {
  it("round-trips a name and photo through a cookie header", () => {
    // Next.js URL-encodes the value once when it sets the cookie.
    const header = `theme=dark; ${PROFILE_COOKIE}=${encodeURIComponent(encodeProfile({ name: "Ada Lovelace", picture: "https://x.test/a.png" }))}; other=1`;
    expect(readProfile(header)).toEqual({ name: "Ada Lovelace", picture: "https://x.test/a.png" });
  });

  it("still reads cookies that were encoded twice", () => {
    const twice = encodeURIComponent(encodeURIComponent(JSON.stringify({ name: "Ada", picture: null })));
    expect(readProfile(`${PROFILE_COOKIE}=${twice}`)).toEqual({ name: "Ada", picture: null });
  });

  it("is null when signed out or when the cookie is garbled", () => {
    expect(readProfile("theme=dark")).toBeNull();
    expect(readProfile(`${PROFILE_COOKIE}=%7Bnot-json`)).toBeNull();
  });

  it("ignores fields of the wrong type", () => {
    const header = `${PROFILE_COOKIE}=${encodeURIComponent(JSON.stringify({ name: 3, picture: null }))}`;
    expect(readProfile(header)).toEqual({ name: null, picture: null });
  });
});

describe("initials", () => {
  it("takes the first and last name's first letters", () => {
    expect(initials("Ghayas Ud Din")).toBe("GD");
    expect(initials("cher")).toBe("C");
    expect(initials(null)).toBe("?");
  });
});
