-- People who signed in with Google. Signing in is optional: it syncs saved
-- jobs, the application tracker and alerts across devices.
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  google_sub text not null unique,
  email text not null,
  name text,
  picture text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
