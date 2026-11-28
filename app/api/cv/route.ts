import { currentUser, isSameOrigin } from "@/lib/auth/session";
import { cleanCvData } from "@/lib/cv-maker/model";
import { listCvs, saveMainCv } from "@/lib/cv-maker/store";
import { CV_MAKER_ENABLED } from "@/lib/features";

const NO_STORE = { "cache-control": "private, no-store" };
const notFound = () => Response.json({ error: "Not found" }, { status: 404 });

/** The signed-in person's main CV and their tailored ones. */
export async function GET() {
  if (!CV_MAKER_ENABLED) return notFound();
  const user = await currentUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401, headers: NO_STORE });
  return Response.json(await listCvs(user.id), { headers: NO_STORE });
}

/** Saves the main CV. */
export async function PUT(request: Request) {
  if (!CV_MAKER_ENABLED) return notFound();
  if (!isSameOrigin(request)) return Response.json({ error: "Cross-site request" }, { status: 403 });
  const user = await currentUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401, headers: NO_STORE });
  const body = (await request.json().catch(() => null)) as { data?: unknown } | null;
  const data = cleanCvData(body?.data);
  if (!data) return Response.json({ error: "That isn't a CV the maker can read." }, { status: 400 });
  return Response.json(await saveMainCv(user.id, data), { headers: NO_STORE });
}
