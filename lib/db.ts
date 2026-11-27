import "server-only";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | null = null;

/** Whether a database is configured (it isn't in some local setups). */
export const hasDatabase = () => Boolean(process.env.DATABASE_URL);

/**
 * The Neon database (free plan, provisioned through Vercel). Queries go over
 * HTTP, so there's no connection pool to manage in serverless functions.
 */
export function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  client ??= neon(process.env.DATABASE_URL);
  return client;
}
