import { describe, expect, it } from "vitest";
import { deviceOffset, fitsHours, formatHours, formatOffset, hoursInPosting, roleHours, statedHours } from "@/lib/timezones";

describe("statedHours", () => {
  it("reads offsets and named zones", () => {
    expect(statedHours("Remote (UTC-5 to UTC+1)")).toEqual({ min: -5, max: 1 });
    expect(statedHours("Remote, GMT+5:30")).toEqual({ min: 5.5, max: 5.5 });
    expect(statedHours("Must overlap with EST hours")).toEqual({ min: -5, max: -5 });
    expect(statedHours("Remote - CET +/- 3 hours")).toEqual({ min: -2, max: 4 });
    expect(statedHours("Remote (US)")).toBeNull();
  });

  it("doesn't read central European time as US central", () => {
    expect(statedHours("Central European Time")).toEqual({ min: 1, max: 1 });
  });
});

describe("roleHours", () => {
  it("prefers what the listing states, then its regions", () => {
    expect(roleHours(["Remote - EMEA (UTC+0 to UTC+3)"])).toMatchObject({ min: 0, max: 3, source: "listing" });
    expect(roleHours(["Remote, United States"])).toMatchObject({ min: -10, max: -3.5, source: "region" });
    expect(roleHours(["Remote - US", "Remote - Germany"])).toMatchObject({ min: -10, max: 3 });
    expect(roleHours(["Remote"])).toBeNull();
  });
});

describe("fitsHours", () => {
  it("allows about three hours either side", () => {
    const europe = { min: -1, max: 3 };
    expect(fitsHours(europe, 5)).toBe(true);
    expect(fitsHours(europe, 6.5)).toBe(false);
    expect(fitsHours(null, 0)).toBe(false);
  });
});

describe("formatting", () => {
  it("writes offsets the usual way", () => {
    expect(formatOffset(-8)).toBe("UTC−8");
    expect(formatOffset(5.5)).toBe("UTC+5:30");
    expect(formatOffset(0)).toBe("UTC");
    expect(formatHours({ min: -12, max: 14 })).toBe("Any time zone");
    expect(formatHours({ min: -5, max: 1 })).toBe("UTC−5 to UTC+1");
  });

  it("rounds this device's offset to a listed one", () => {
    expect(deviceOffset(new Date("2026-01-01T00:00:00Z"))).toBeTypeOf("number");
  });
});

describe("roleHours per location", () => {
  it("reads each location on its own", () => {
    expect(roleHours(["Remote, Canada (EST) OR Remote, US (EST) OR Remote, UK"])).toMatchObject({ min: -5, max: 3 });
    expect(roleHours(["Remote, Canada (EST)", "Remote, UK"])).toMatchObject({ min: -5, max: 3, source: "listing" });
  });

  it("ignores lowercase words that look like zone codes", () => {
    expect(statedHours("Remote, United States et al, pt-BR speakers")).toBeNull();
    expect(roleHours(["Remote, United States"])).toMatchObject({ source: "region" });
  });

  it("reads hours from the sentences of a posting that are about them", () => {
    expect(hoursInPosting("We value ownership. You'll need 4 hours of overlap with EST business hours. Our office is in PST.")).toEqual({ min: -5, max: -5 });
    expect(hoursInPosting("Our HQ is in PST. We ship daily.")).toBeNull();
  });
});
