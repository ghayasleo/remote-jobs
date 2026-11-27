-- What signed-in people save, so it follows them across devices. Each item
-- carries its own updated_at: when two devices change the same item, the
-- newer change wins. Removed items stay as tombstones (deleted) so the
-- removal reaches the other devices too.
create table if not exists tracked_jobs (
  user_id uuid not null references users(id) on delete cascade,
  job_key text not null,
  data jsonb not null,
  updated_at timestamptz not null,
  primary key (user_id, job_key)
);

create table if not exists saved_companies (
  user_id uuid not null references users(id) on delete cascade,
  slug text not null,
  saved boolean not null,
  updated_at timestamptz not null,
  primary key (user_id, slug)
);
