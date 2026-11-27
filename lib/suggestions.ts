// Checking a "suggest a company" form. Pure, shared by the API and tests.

export type Suggestion = {
  name: string;
  website: string;
  careersUrl: string | null;
  note: string | null;
  contactEmail: string | null;
};

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;

/** A web address, with https:// added when it's missing; null if it isn't one. */
export function normalizeUrl(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    if (!/^https?:$/.test(url.protocol) || !url.hostname.includes(".")) return null;
    return url.toString().slice(0, 500);
  } catch {
    return null;
  }
}

export type SuggestionResult = { ok: true; suggestion: Suggestion } | { ok: false; field: keyof Suggestion; error: string };

export function checkSuggestion(input: Record<string, unknown>): SuggestionResult {
  const text = (key: string) => (typeof input[key] === "string" ? (input[key] as string).trim() : "");
  const name = text("name");
  if (name.length < 2 || name.length > 120) return { ok: false, field: "name", error: "Add the company's name." };
  const website = normalizeUrl(text("website"));
  if (!website) return { ok: false, field: "website", error: "Add the company's website, like acme.com." };
  const careersText = text("careersUrl");
  const careersUrl = careersText ? normalizeUrl(careersText) : null;
  if (careersText && !careersUrl) return { ok: false, field: "careersUrl", error: "That careers link doesn't look like a web address." };
  const note = text("note").slice(0, 1000) || null;
  const emailText = text("contactEmail");
  if (emailText && !EMAIL.test(emailText)) return { ok: false, field: "contactEmail", error: "That email address doesn't look right." };
  return { ok: true, suggestion: { name, website, careersUrl, note, contactEmail: emailText || null } };
}
