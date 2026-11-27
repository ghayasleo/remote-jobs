import { describe, expect, it } from "vitest";
import { checkSuggestion, normalizeUrl } from "@/lib/suggestions";

describe("normalizeUrl", () => {
  it("adds https:// and rejects things that aren't web addresses", () => {
    expect(normalizeUrl("acme.com")).toBe("https://acme.com/");
    expect(normalizeUrl("http://acme.com/jobs")).toBe("http://acme.com/jobs");
    expect(normalizeUrl("not a url")).toBeNull();
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("localhost")).toBeNull();
  });
});

describe("checkSuggestion", () => {
  it("accepts a name and website, with optional extras", () => {
    expect(checkSuggestion({ name: "Acme", website: "acme.com", note: "  Fully remote  " })).toEqual({
      ok: true,
      suggestion: { name: "Acme", website: "https://acme.com/", careersUrl: null, note: "Fully remote", contactEmail: null },
    });
  });

  it("names the field that needs fixing", () => {
    expect(checkSuggestion({ name: "A", website: "acme.com" })).toMatchObject({ ok: false, field: "name" });
    expect(checkSuggestion({ name: "Acme", website: "" })).toMatchObject({ ok: false, field: "website" });
    expect(checkSuggestion({ name: "Acme", website: "acme.com", careersUrl: "nope nope" })).toMatchObject({ ok: false, field: "careersUrl" });
    expect(checkSuggestion({ name: "Acme", website: "acme.com", contactEmail: "me@" })).toMatchObject({ ok: false, field: "contactEmail" });
  });
});
