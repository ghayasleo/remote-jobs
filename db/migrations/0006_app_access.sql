-- When the person last disconnected the AI apps using their account through
-- the account MCP server: tokens issued before this stop working (see
-- lib/oauth/access.ts). Null means they never have.
alter table users add column if not exists apps_revoked_at timestamptz
