import renderShareImage from "@/app/opengraph-image";
import { getNewThisWeek, getRemoteJobs } from "@/lib/data/jobs";
import { getSocialData } from "@/lib/data/social";
import { CARD_SIZE, renderCard } from "@/lib/social-cards";
import { absoluteUrl } from "@/lib/site";
import { blueskyLinkCard, blueskyPost, pickDailyRoles, planExtraPosts, richText, type PlannedPost } from "@/lib/social";

// The daily Bluesky posts (see vercel.json for the schedule): every day the
// new roles, with a link card to /new; plus Monday's weekly report, an
// insight card on Wednesday and Friday, and Saturday's new companies (see
// planExtraPosts). Posts only when BLUESKY_HANDLE and BLUESKY_APP_PASSWORD
// are set. Vercel calls this with "Authorization: Bearer $CRON_SECRET".
//
// ?dry=1 lists what would be posted without logging in or posting;
// &date=YYYY-MM-DD plays a given day; &image=N returns post N's image.

const BLUESKY = "https://bsky.social/xrpc";
const TIMEOUT = AbortSignal.timeout.bind(AbortSignal);
// Bluesky refuses blobs over 1 MB; the cards are 50–80 KB.
const MAX_IMAGE_BYTES = 950_000;

type Session = { accessJwt: string; did: string };

async function login(): Promise<Session | string> {
  const response = await fetch(`${BLUESKY}/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: process.env.BLUESKY_HANDLE, password: process.env.BLUESKY_APP_PASSWORD }),
    signal: TIMEOUT(10_000),
  });
  return response.ok ? ((await response.json()) as Session) : `login failed (${response.status})`;
}

/** Uploads a rendered image; the reason instead of a blob when that fails, so the post still goes out. */
async function upload(session: Session, image: Response | Promise<Response>): Promise<{ blob: unknown } | { error: string }> {
  try {
    const rendered = await image;
    const bytes = await rendered.arrayBuffer();
    if (bytes.byteLength > MAX_IMAGE_BYTES) return { error: `image too big (${bytes.byteLength} bytes)` };
    const response = await fetch(`${BLUESKY}/com.atproto.repo.uploadBlob`, {
      method: "POST",
      headers: { "content-type": rendered.headers.get("content-type") ?? "image/png", authorization: `Bearer ${session.accessJwt}` },
      body: bytes,
      signal: TIMEOUT(15_000),
    });
    if (!response.ok) return { error: `upload ${response.status}: ${(await response.text()).slice(0, 160)}` };
    return { blob: ((await response.json()) as { blob: unknown }).blob };
  } catch (error) {
    return { error: `image: ${error instanceof Error ? error.message : String(error)}` };
  }
}

async function createPost(session: Session, record: Record<string, unknown>) {
  const response = await fetch(`${BLUESKY}/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${session.accessJwt}` },
    body: JSON.stringify({
      repo: session.did,
      collection: "app.bsky.feed.post",
      record: { $type: "app.bsky.feed.post", ...record, langs: ["en"], createdAt: new Date().toISOString() },
    }),
    signal: TIMEOUT(10_000),
  });
  return response.ok ? "posted" : `failed (${response.status})`;
}

/** One of the extra posts: its text, and its card as an image with alt text. */
async function sendPlanned(session: Session, post: PlannedPost) {
  const { text, facets } = richText(post.segments);
  if (!post.image) return createPost(session, { text, facets });
  const uploaded = await upload(session, renderCard(post.image.card));
  if ("error" in uploaded) return `${await createPost(session, { text, facets })} without image (${uploaded.error})`;
  const embed = {
    $type: "app.bsky.embed.images",
    images: [{ alt: post.image.alt, image: uploaded.blob, aspectRatio: CARD_SIZE }],
  };
  return createPost(session, { text, facets, embed });
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const search = new URL(request.url).searchParams;
  const dry = search.get("dry") === "1";
  const now = Date.now();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(search.get("date") ?? "") ? search.get("date")! : new Date(now).toISOString().slice(0, 10);

  const [jobs, week, social] = await Promise.all([getRemoteJobs(), getNewThisWeek(), getSocialData(now)]);
  const { picked, total } = pickDailyRoles(jobs, now);
  const daily = picked.length > 0 ? blueskyPost(picked, total) : null;
  const card = blueskyLinkCard({
    url: absoluteUrl("/new"),
    title: `New this week: ${week.jobs.length} fresh remote roles`,
    description: `${week.jobs.length} remote tech roles posted in the last 7 days, plus the newest remote-friendly companies on the list.`,
  });
  const extras = planExtraPosts(date, social, absoluteUrl);

  if (dry) {
    const index = search.get("image");
    if (index !== null) {
      const post = extras[Number(index)];
      return post?.image ? renderCard(post.image.card) : new Response("No image for that post", { status: 404 });
    }
    return Response.json({
      date,
      daily: daily?.text ?? null,
      extras: extras.map((post) => ({ kind: post.kind, text: richText(post.segments).text, alt: post.image?.alt ?? null })),
    });
  }

  const result = await (async () => {
    if (!process.env.BLUESKY_HANDLE || !process.env.BLUESKY_APP_PASSWORD) return { posted: false, reason: "Bluesky isn't set up" };
    if (!daily && extras.length === 0) return { posted: false, reason: "Nothing to post today" };
    const session = await login();
    if (typeof session === "string") return { posted: false, reason: session };
    const results: Record<string, string> = {};
    if (daily) {
      const thumb = await upload(session, renderShareImage());
      const embed = "blob" in thumb ? { ...card, external: { ...card.external, thumb: thumb.blob } } : card;
      results.daily = await createPost(session, { ...daily, embed }).catch(() => "failed");
      if (!("blob" in thumb)) results.daily += ` without image (${thumb.error})`;
    }
    for (const post of extras) results[post.kind] = await sendPlanned(session, post).catch(() => "failed");
    return { posted: Object.values(results).some((value) => value.startsWith("posted")), total, results };
  })();
  // The outcome in the function logs, so a day without a post can be explained.
  console.log("Bluesky post:", JSON.stringify(result));
  return Response.json(result);
}
