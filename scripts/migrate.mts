// Applies db/migrations/*.sql to the Neon database in DATABASE_URL, in name
// order, once each (recorded in schema_migrations). Runs before every build
// (see "build" in package.json), so production's database always matches the
// code being deployed. Without DATABASE_URL it does nothing.
//
//   npm run db:migrate   # locally, using DATABASE_URL from .env.local
import { readdirSync, readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("migrate: DATABASE_URL is not set, skipping");
  process.exit(0);
}

const sql = neon(url);
const dir = new URL("../db/migrations/", import.meta.url);

await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
const applied = new Set((await sql`select name from schema_migrations`).map((row) => row.name as string));

for (const name of readdirSync(dir).filter((file) => file.endsWith(".sql")).sort()) {
  if (applied.has(name)) continue;
  const statements = readFileSync(new URL(name, dir), "utf8")
    .split(/;\s*$/m)
    .map((statement) => statement.replace(/^\s*--.*$/gm, "").trim())
    .filter(Boolean);
  // One transaction per file: it applies completely or not at all.
  await sql.transaction([...statements.map((statement) => sql.query(statement)), sql`insert into schema_migrations (name) values (${name})`]);
  console.log(`migrate: applied ${name}`);
}
console.log("migrate: up to date");
