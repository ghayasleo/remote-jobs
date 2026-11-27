import { currentUser, endSession, isSameOrigin } from "@/lib/auth/session";
import { deleteUser } from "@/lib/auth/users";

const NO_STORE = { "cache-control": "private, no-store" };

/** Who's signed in (the account page shows the email, which the readable cookie leaves out). */
export async function GET() {
  const user = await currentUser();
  return Response.json(
    { user: user && { name: user.name, email: user.email, picture: user.picture } },
    { headers: NO_STORE },
  );
}

/**
 * Signs out. With ?account=delete it also deletes the account and everything
 * stored for it.
 */
export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Cross-site request" }, { status: 403 });
  const user = await currentUser();
  if (user && new URL(request.url).searchParams.get("account") === "delete") await deleteUser(user.id);
  await endSession();
  return Response.json({ ok: true }, { headers: NO_STORE });
}
