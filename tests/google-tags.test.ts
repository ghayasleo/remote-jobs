import { describe, expect, it } from "vitest";
import { CONSENT_KEY, TAGS_DELAY_MS, googleTagsScript, parseGaId, parseGtmId } from "@/lib/google-tags";

describe("tag IDs", () => {
  it("accepts real-looking IDs and normalizes case", () => {
    expect(parseGtmId(" gtm-ab12cd3 ")).toBe("GTM-AB12CD3");
    expect(parseGaId("G-ABC123DEF4")).toBe("G-ABC123DEF4");
  });

  it("rejects anything else, so nothing odd lands in the inline script", () => {
    expect(parseGtmId(undefined)).toBeNull();
    expect(parseGtmId("")).toBeNull();
    expect(parseGtmId("G-ABC123DEF4")).toBeNull();
    expect(parseGaId("UA-12345-1")).toBeNull();
    expect(parseGaId("G-ABC');alert(1);//")).toBeNull();
  });
});

describe("googleTagsScript", () => {
  const script = googleTagsScript({ gtmId: "GTM-AB12CD3", gaId: "G-ABC123DEF4" });

  it("is valid JavaScript", () => {
    expect(() => new Function(script)).not.toThrow();
  });

  it("sets consent defaults and the saved choice before loading any tag", () => {
    const regional = script.indexOf("region:");
    const general = script.indexOf("analytics_storage:'granted'");
    const saved = script.indexOf(CONSENT_KEY);
    const ga = script.indexOf("gtag/js?id=G-ABC123DEF4");
    const gtm = script.indexOf("gtm.js?id=GTM-AB12CD3");
    expect(regional).toBeGreaterThan(-1);
    expect(Math.max(regional, general, saved)).toBeLessThan(Math.min(ga, gtm));
    expect(script).toContain('"GB"');
    expect(script).toContain("ad_storage:'denied'");
  });

  it("waits for the first interaction or a timeout before loading tags", () => {
    const start = script.indexOf("function start(){");
    expect(start).toBeGreaterThan(-1);
    expect(script.indexOf("gtm.js?id=")).toBeGreaterThan(start);
    expect(script).toContain("addEventListener(e,start");
    expect(script).toContain(`setTimeout(start,${TAGS_DELAY_MS})`);
  });

  it("loads only what's configured", () => {
    const gtmOnly = googleTagsScript({ gtmId: "GTM-AB12CD3", gaId: null });
    expect(gtmOnly).toContain("gtm.js?id=GTM-AB12CD3");
    expect(gtmOnly).not.toContain("gtag/js");
    expect(gtmOnly).not.toContain("gtag('config'");
  });
});
