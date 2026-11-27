-- Companies visitors suggest adding. Anyone can suggest; signed-in people are
-- linked to their account. ip_hash (a keyed hash, never the address) only
-- rate-limits suggestions per visitor.
create table if not exists company_suggestions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text not null,
  careers_url text,
  note text,
  contact_email text,
  user_id uuid references users(id) on delete set null,
  ip_hash text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create index if not exists company_suggestions_ip_recent on company_suggestions (ip_hash, created_at);
