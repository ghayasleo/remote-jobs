import "server-only";

import { db } from "@/lib/db";
import type { GoogleProfile } from "./google";
import type { SessionUser } from "./session";

/** Creates the user on their first sign-in; afterwards keeps their name, email and photo current. */
export async function upsertGoogleUser(profile: GoogleProfile): Promise<SessionUser> {
  const [row] = await db()`
    insert into users (google_sub, email, name, picture)
    values (${profile.sub}, ${profile.email}, ${profile.name}, ${profile.picture})
    on conflict (google_sub) do update
      set email = excluded.email, name = excluded.name, picture = excluded.picture, last_seen_at = now()
    returning id, email, name, picture`;
  return { id: row.id, email: row.email, name: row.name, picture: row.picture };
}

/** Deletes the user and, through foreign keys, everything stored for them. */
export async function deleteUser(id: string) {
  await db()`delete from users where id = ${id}`;
}
