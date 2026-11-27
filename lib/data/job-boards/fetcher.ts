import type { Fetcher } from "./providers";

const FETCH_TIMEOUT_MS = 8_000;

/**
 * Reads one board URL: JSON, or text for RSS feeds. null when it fails, is
 * slow, or is rate-limited (Workday answers 429 readily), so the board is
 * simply skipped until the next refresh.
 */
export const fetchBoard: Fetcher = async (url, init = {}) => {
  try {
    // "no-store": the snapshot keeps the result, and Next's fetch cache would
    // keep reading a slow response past the timeout.
    const response = await fetch(url, {
      method: init.method ?? "GET",
      headers: {
        accept: init.as === "text" ? "application/rss+xml, application/xml, text/xml, */*" : "application/json",
        ...(init.body !== undefined && { "content-type": "application/json" }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) return null;
    return init.as === "text" ? await response.text() : await response.json();
  } catch {
    return null;
  }
};
