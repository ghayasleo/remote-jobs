import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/locate/route";
import { COUNTRY_CODES, countryFromCodes } from "@/lib/country-codes";
import { COUNTRY_LIST } from "@/lib/jobs";

const locate = async (body: unknown) => {
  const response = await POST(new Request("http://x/api/locate", { method: "POST", body: JSON.stringify(body) }));
  return { status: response.status, body: await response.json(), cache: response.headers.get("cache-control") };
};

describe("country codes", () => {
  it("has a code for every country roles can name", () => {
    const named = new Set(Object.values(COUNTRY_CODES));
    expect(COUNTRY_LIST.filter((country) => !named.has(country.name))).toEqual([]);
  });

  it("takes the first code on the list", () => {
    expect(countryFromCodes([null, "pk"])).toEqual({ name: "Pakistan", slug: "pakistan" });
    expect(countryFromCodes(["NP"])).toBeNull();
  });
});

describe("POST /api/locate", () => {
  it("turns coordinates into the site's country", async () => {
    expect((await locate({ lat: 33.68, lon: 73.05 })).body).toEqual({ supported: true, name: "Pakistan", slug: "pakistan" });
    expect((await locate({ lat: 22.32, lon: 114.17 })).body.slug).toBe("hong-kong");
    expect((await locate({ lat: 18.4, lon: -66.1 })).body.slug).toBe("united-states");
  });

  it("names a country that isn't on the list", async () => {
    expect((await locate({ lat: 27.7, lon: 85.32 })).body).toEqual({ supported: false, name: "Nepal" });
  });

  it("rejects anything that isn't coordinates, and never caches", async () => {
    const bad = await locate({ lat: "north", lon: 999 });
    expect(bad.status).toBe(400);
    expect(bad.cache).toBe("no-store");
  });
});
