import { describe, expect, it } from "vitest";
import { postingText, sanitizePosting } from "@/lib/data/job-boards/sanitize";

describe("sanitizePosting", () => {
  it("removes scripts, styles, handlers and images", () => {
    const html = `<p onclick="steal()">Hi<script>alert(1)</script></p><style>p{}</style><img src=x onerror="x()"><iframe src="evil"></iframe>`;
    expect(sanitizePosting(html)).toBe("<p>Hi</p>");
  });

  it("keeps structure and makes links safe", () => {
    expect(sanitizePosting(`<h1>Role</h1><div><ul><li><b>Go</b></li></ul></div><a href="https://acme.dev" style="x">site</a>`)).toBe(
      '<h2>Role</h2><ul><li><b>Go</b></li></ul><a href="https://acme.dev" target="_blank" rel="noopener noreferrer nofollow">site</a>',
    );
  });

  it("overrides a posting's own target and rel", () => {
    expect(sanitizePosting(`<a href="https://x.dev" target="_self" rel="opener">x</a>`)).toBe(
      '<a href="https://x.dev" target="_blank" rel="noopener noreferrer nofollow">x</a>',
    );
  });

  it("drops javascript: links and empty paragraphs", () => {
    expect(sanitizePosting(`<a href="javascript:alert(1)">x</a><p> </p><p><br></p>`)).toBe(
      '<a target="_blank" rel="noopener noreferrer nofollow">x</a>',
    );
  });
});

describe("postingText", () => {
  it("returns plain text", () => {
    expect(postingText("<p>We <b>build</b>\n rockets.</p><ul><li>Go</li></ul>")).toBe("We build rockets. Go");
  });
});
