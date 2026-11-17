import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { readTar } from "@/lib/data/tar";

function read(fixture: string) {
  const files: Record<string, string> = {};
  readTar(gunzipSync(readFileSync(`tests/fixtures/${fixture}`)), (path, content) => {
    files[path] = content.toString("utf8");
  });
  return files;
}

describe("readTar", () => {
  it("reads a GitHub-style pax archive, including long paths", () => {
    const longPath = `repo-main/src/companies/${"a-very-long-company-slug-".repeat(4)}end.md`;
    expect(read("pax.tar.gz")).toEqual({
      "repo-main/src/companies/acme.md": "---\ntitle: Acme\n---\n\n## Company blurb\n\nHi.\n",
      [longPath]: "long path\n",
      "repo-main/README.md": "# readme\n",
    });
  });

  it("joins the ustar prefix and name fields", () => {
    const files = read("ustar.tar.gz");
    expect(Object.keys(files)).toEqual([
      "repo-main/src/companies/acme.md",
      `repo-main/${"nested-directory/".repeat(6)}deep.md`,
    ]);
    expect(files[`repo-main/${"nested-directory/".repeat(6)}deep.md`]).toBe("prefix path\n");
  });

  it("returns nothing for an empty or all-zero archive", () => {
    const seen: string[] = [];
    readTar(Buffer.alloc(0), (path) => seen.push(path));
    readTar(Buffer.alloc(1024), (path) => seen.push(path));
    expect(seen).toEqual([]);
  });
});
