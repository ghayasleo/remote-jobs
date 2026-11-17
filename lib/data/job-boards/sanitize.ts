import sanitizeHtml from "sanitize-html";

// Postings are written by companies on third-party boards: keep structure and
// links, drop everything else (scripts, styles, inline handlers, images).
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "ul", "ol", "li", "strong", "b", "em", "i", "h2", "h3", "h4", "blockquote", "a", "hr"],
  // target and rel are always set by the transform below, overriding the posting's own.
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    h1: "h2",
    h5: "h4",
    h6: "h4",
    a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer nofollow" }),
  },
  exclusiveFilter: (frame) => ["p", "li", "h2", "h3", "h4"].includes(frame.tag) && !frame.text.trim(),
};

export function sanitizePosting(html: string) {
  return sanitizeHtml(html, OPTIONS).trim();
}

/** Plain text, e.g. for meta descriptions. */
export function postingText(html: string) {
  const spaced = html.replace(/<\/(p|li|h[1-6]|div)>|<br\s*\/?>/gi, " ");
  return sanitizeHtml(spaced, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, " ").trim();
}
