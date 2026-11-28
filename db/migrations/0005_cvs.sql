-- CVs made with the CV maker: one main CV per person, plus copies tailored to
-- saved jobs. The content is JSON (see lib/cv-maker/model.ts); the LaTeX and
-- the PDF are made from it in the browser, so neither is stored.
create table if not exists cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kind text not null check (kind in ('main', 'tailored')),
  job_key text,
  title text not null default '',
  data jsonb not null,
  gaps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cvs_one_main_per_user on cvs (user_id) where kind = 'main';

create unique index if not exists cvs_one_per_saved_job on cvs (user_id, job_key) where kind = 'tailored';
