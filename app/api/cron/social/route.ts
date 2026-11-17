import { getRemoteJobs } from "@/lib/data/jobs";
import { jobPath } from "@/lib/jobs";
import { absoluteUrl } from "@/lib/site";
import { blueskyPost, pickDailyRoles, telegramDigest } from "@/lib/social";

// Daily post of the last day's new remote roles (see vercel.json for the
// schedule). Each network only posts when its credentials are set:
//   TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID, BLUESKY_HANDLE + BLUESKY_APP_PASSWORD.
// Vercel calls this with "Authorization: Bearer $CRON_SECRET".

const TIMEOUT = AbortSignal.timeout.bind(AbortSignal);

async function postToTelegram(text: string) {
  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    }),
    signal: TIMEOUT(10_000),
  });
  return response.ok ? "posted" : `failed (${response.status})`;
}

async function postToBluesky(post: ReturnType<typeof blueskyPost>) {
  const session = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: process.env.BLUESKY_HANDLE, password: process.env.BLUESKY_APP_PASSWORD }),
    signal: TIMEOUT(10_000),
  });
  if (!session.ok) return `login failed (${session.status})`;
  const { accessJwt, did } = (await session.json()) as { accessJwt: string; did: string };
  const response = await fetch("https://bsky.social/xrpc/com.atproto.repo.createRecord", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${accessJwt}` },
    body: JSON.stringify({
      repo: did,
      collection: "app.bsky.feed.post",
      record: { $type: "app.bsky.feed.post", ...post, langs: ["en"], createdAt: new Date().toISOString() },
    }),
    signal: TIMEOUT(10_000),
  });
  return response.ok ? "posted" : `failed (${response.status})`;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { picked, total } = pickDailyRoles(await getRemoteJobs(), Date.now());
  if (picked.length === 0) return Response.json({ posted: false, reason: "No new roles in the last day" });

  const results: Record<string, string> = {};
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    results.telegram = await postToTelegram(
      telegramDigest(picked, total, (job) => absoluteUrl(jobPath(job)), absoluteUrl("/new")),
    ).catch(() => "failed");
  }
  if (process.env.BLUESKY_HANDLE && process.env.BLUESKY_APP_PASSWORD) {
    results.bluesky = await postToBluesky(blueskyPost(picked, total, absoluteUrl("/new"))).catch(() => "failed");
  }
  return Response.json({ posted: Object.keys(results).length > 0, total, results });
}
