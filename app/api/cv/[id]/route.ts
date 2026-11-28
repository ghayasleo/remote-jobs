import { currentUser, isSameOrigin } from "@/lib/auth/session";
import { cleanCvData } from "@/lib/cv-maker/model";
import { deleteCv, getCv, saveCv } from "@/lib/cv-maker/store";
import { CV_MAKER_ENABLED } from "@/lib/features";

const NO_STORE = { "cache-control": "private, no-store" };
const notFound = () => Response.json({ error: "Not found" }, { status: 404, headers: NO_STORE });

async function user() {
  return CV_MAKER_ENABLED ? currentUser() : null;
}

export async function GET(_request: Request, { params }: RouteContext<"/api/cv/[id]">) {
  if (!CV_MAKER_ENABLED) return notFound();
  const signedIn = await user();
  if (!signedIn) return Response.json({ error: "Not signed in" }, { status: 401, headers: NO_STORE });
  const record = await getCv(signedIn.id, (await params).id);
  return record ? Response.json(record, { headers: NO_STORE }) : notFound();
}

export async function PUT(request: Request, { params }: RouteContext<"/api/cv/[id]">) {
  if (!CV_MAKER_ENABLED) return notFound();
  if (!isSameOrigin(request)) return Response.json({ error: "Cross-site request" }, { status: 403 });
  const signedIn = await user();
  if (!signedIn) return Response.json({ error: "Not signed in" }, { status: 401, headers: NO_STORE });
  const body = (await request.json().catch(() => null)) as { data?: unknown } | null;
  const data = cleanCvData(body?.data);
  if (!data) return Response.json({ error: "That isn't a CV the maker can read." }, { status: 400 });
  const record = await saveCv(signedIn.id, (await params).id, data);
  return record ? Response.json(record, { headers: NO_STORE }) : notFound();
}

/** Deletes a tailored CV. */
export async function DELETE(request: Request, { params }: RouteContext<"/api/cv/[id]">) {
  if (!CV_MAKER_ENABLED) return notFound();
  if (!isSameOrigin(request)) return Response.json({ error: "Cross-site request" }, { status: 403 });
  const signedIn = await user();
  if (!signedIn) return Response.json({ error: "Not signed in" }, { status: 401, headers: NO_STORE });
  return (await deleteCv(signedIn.id, (await params).id)) ? Response.json({ ok: true }, { headers: NO_STORE }) : notFound();
}
