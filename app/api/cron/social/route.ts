import renderShareImage from "@/app/opengraph-image";
import { getNewThisWeek, getRemoteJobs } from "@/lib/data/jobs";
import { absoluteUrl } from "@/lib/site";
import { blueskyLinkCard, blueskyPost, pickDailyRoles } from "@/lib/social";

// Daily Bluesky post of the last day's new remote roles (see vercel.json for
// the schedule), with a link card to /new showing the site's share image.
// It only posts when BLUESKY_HANDLE and BLUESKY_APP_PASSWORD are set. Vercel
// calls this with "Authorization: Bearer $CRON_SECRET".

const BLUESKY = "https://bsky.social/xrpc";
const TIMEOUT = AbortSignal.timeout.bind(AbortSignal);
// Bluesky refuses blobs over 1 MB; the share card is about 60 KB.
const MAX_THUMB_BYTES = 950_000;

/**
 * The site's share card as PNG bytes, rendered right here rather than fetched
 * from the site: a request from Vercel's own servers to the site can be
 * challenged by bot protection, which left the first card without an image.
 */
async function shareImage(): Promise<{ bytes: ArrayBuffer; type: string } | { error: string }> {
  try {
    const response = await renderShareImage();
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > MAX_THUMB_BYTES) return { error: `image too big (${bytes.byteLength} bytes)` };
    return { bytes, type: response.headers.get("content-type") ?? "image/png" };
  } catch (error) {
    return { error: `image: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/** Uploads the card image; the reason instead of a blob when that fails, so the post still goes out. */
async function uploadThumb(accessJwt: string, image: Awaited<ReturnType<typeof shareImage>>) {
  if ("error" in image) return image;
  try {
    const upload = await fetch(`${BLUESKY}/com.atproto.repo.uploadBlob`, {
      method: "POST",
      headers: { "content-type": image.type, authorization: `Bearer ${accessJwt}` },
      body: image.bytes,
      signal: TIMEOUT(15_000),
    });
    if (!upload.ok) return { error: `upload ${upload.status}: ${(await upload.text()).slice(0, 160)}` };
    return { blob: ((await upload.json()) as { blob: unknown }).blob };
  } catch (error) {
    return { error: `upload: ${error instanceof Error ? error.message : String(error)}` };
  }
}

async function postToBluesky(post: ReturnType<typeof blueskyPost>, card: ReturnType<typeof blueskyLinkCard>) {
  // Ready before logging in, so a broken image shows up even when login fails.
  const image = await shareImage();
  const session = await fetch(`${BLUESKY}/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: process.env.BLUESKY_HANDLE, password: process.env.BLUESKY_APP_PASSWORD }),
    signal: TIMEOUT(10_000),
  });
  if (!session.ok) {
    const imageState = "error" in image ? image.error : `image ready (${Math.round(image.bytes.byteLength / 1024)} KB)`;
    return `login failed (${session.status}); ${imageState}`;
  }
  const { accessJwt, did } = (await session.json()) as { accessJwt: string; did: string };
  const thumb = await uploadThumb(accessJwt, image);
  const embed = "blob" in thumb ? { ...card, external: { ...card.external, thumb: thumb.blob } } : card;
  const response = await fetch(`${BLUESKY}/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${accessJwt}` },
    body: JSON.stringify({
      repo: did,
      collection: "app.bsky.feed.post",
      record: { $type: "app.bsky.feed.post", ...post, embed, langs: ["en"], createdAt: new Date().toISOString() },
    }),
    signal: TIMEOUT(10_000),
  });
  if (!response.ok) return `failed (${response.status})`;
  return "blob" in thumb ? "posted" : `posted without image (${thumb.error})`;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [jobs, week] = await Promise.all([getRemoteJobs(), getNewThisWeek()]);
  const { picked, total } = pickDailyRoles(jobs, Date.now());
  const result = await (async () => {
    if (picked.length === 0) return { posted: false, reason: "No new roles in the last day" };
    if (!process.env.BLUESKY_HANDLE || !process.env.BLUESKY_APP_PASSWORD) {
      return { posted: false, reason: "Bluesky isn't set up" };
    }
    const card = blueskyLinkCard({
      url: absoluteUrl("/new"),
      title: `New this week: ${week.jobs.length} fresh remote roles`,
      description: `${week.jobs.length} remote tech roles posted in the last 7 days, plus the newest remote-friendly companies on the list.`,
    });
    const bluesky = await postToBluesky(blueskyPost(picked, total), card).catch(() => "failed");
    return { posted: bluesky.startsWith("posted"), total, bluesky };
  })();
  // The outcome in the function logs, so a day without a post can be explained.
  console.log("Bluesky post:", JSON.stringify(result));
  return Response.json(result);
}
