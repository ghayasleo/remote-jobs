import { describe, expect, it } from "vitest";
import { annualUsd, isPlausibleAnnual, midpoint, parsePayText, salaryBuckets, salaryCategories, salaryFaqs, salaryStats, usd, usdRange, type SalaryRole } from "@/lib/salaries";

const role = (min: number | null, max: number | null, category: SalaryRole["category"] = "engineering"): SalaryRole => ({
  company: "acme",
  companyName: "Acme",
  id: `${min}-${max}`,
  title: "Engineer",
  location: "Remote - US",
  category,
  min,
  max,
});

describe("salary helpers", () => {
  it("rejects ranges that can't be annual", () => {
    expect(isPlausibleAnnual(120_000, 160_000)).toBe(true);
    expect(isPlausibleAnnual(8_000, 9_000)).toBe(false);
    expect(isPlausibleAnnual(null, null)).toBe(false);
  });

  it("takes a range's middle, or its one end", () => {
    expect(midpoint(role(100_000, 150_000))).toBe(125_000);
    expect(midpoint(role(null, 90_000))).toBe(90_000);
  });

  it("formats compact US-dollar ranges", () => {
    expect(usd(145_400)).toBe("$145K");
    expect(usdRange(role(120_000, 160_000))).toBe("$120K–$160K");
    expect(usdRange(role(150_000, 150_000))).toBe("$150K");
  });

  it("summarises and buckets ranges", () => {
    const roles = [role(100_000, 140_000), role(120_000, 160_000), role(140_000, 180_000)];
    const stats = salaryStats(roles);
    expect(stats.count).toBe(3);
    expect(stats.medianMin).toBe(120_000);
    expect(stats.medianMax).toBe(160_000);
    expect(stats.medianMid).toBe(140_000);
    expect(salaryBuckets(roles)).toEqual([
      { label: "$100K–$125K", count: 1 },
      { label: "$125K–$150K", count: 1 },
      { label: "$150K–$175K", count: 1 },
    ]);
  });

  it("only ranks kinds of work with enough ranges", () => {
    const roles = [...Array(5).fill(role(150_000, 200_000)), ...Array(4).fill(role(90_000, 110_000, "sales"))];
    expect(salaryCategories(roles).map((c) => c.key)).toEqual(["engineering"]);
  });

  it("answers what remote jobs pay, from the numbers", () => {
    const roles = [role(100_000, 140_000), role(120_000, 160_000), role(140_000, 180_000)];
    const [first] = salaryFaqs({ label: "Engineering", stats: salaryStats(roles), top: roles, asOf: "Nov 18, 2026" });
    expect(first.question).toBe("How much do remote engineering jobs pay?");
    expect(first.answer).toContain("$120K–$160K a year");
  });

  it("reads pay from board text", () => {
    expect(parsePayText("$130K – $290K • Offers Equity")).toEqual({ min: 130_000, max: 290_000, currency: "USD", unit: "YEAR" });
    expect(parsePayText("$267,551 – $292,583 • Offers Bonus")).toEqual({ min: 267_551, max: 292_583, currency: "USD", unit: "YEAR" });
    expect(parsePayText("$126K – $214.9K")).toEqual({ min: 126_000, max: 214_900, currency: "USD", unit: "YEAR" });
    expect(parsePayText("$199K • L3 Manager level")).toEqual({ min: 199_000, max: 199_000, currency: "USD", unit: "YEAR" });
    expect(parsePayText("CA$200K – CA$250K • Offers Equity")?.currency).toBe("CAD");
    expect(parsePayText("£110K – £115.1K")?.currency).toBe("GBP");
    expect(parsePayText("HUF\u00a01.9M – HUF\u00a02.1M per month")).toEqual({ min: 1_900_000, max: 2_100_000, currency: "HUF", unit: "MONTH" });
    expect(parsePayText("$140 – $160 per hour")?.unit).toBe("HOUR");
    expect(parsePayText("Competitive")).toBeNull();
  });

  it("keeps only believable annual US-dollar ranges", () => {
    expect(annualUsd({ pay: null, salary: "$130K – $290K • Offers Equity" })).toEqual({ min: 130_000, max: 290_000 });
    expect(annualUsd({ pay: null, salary: "$140 – $160 per hour" })).toBeNull();
    expect(annualUsd({ pay: null, salary: "CA$200K – CA$250K" })).toBeNull();
  });
});
