-- Job alerts by browser notification. A device's push subscription can carry
-- several alerts, each a saved Jobs search (its query string). Alerts are
-- tied to the device, not an account; a signed-in person's are also linked
-- to their account.
create table if not exists push_subscriptions (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  user_id uuid references users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists job_alerts (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null references push_subscriptions(endpoint) on delete cascade,
  query text not null,
  label text not null,
  frequency text not null default 'daily',
  created_at timestamptz not null default now(),
  -- Roles posted after this are new for the next notification.
  last_sent_at timestamptz not null default now(),
  unique (endpoint, query)
);
