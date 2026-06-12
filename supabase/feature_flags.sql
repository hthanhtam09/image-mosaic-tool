-- Feature-flags store for the Mosaic admin panel.
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query → Run).
--
-- The app talks to this table through the REST API using the *publishable*
-- (anon) key, so RLS must explicitly allow read + write. ⚠️ This means anyone
-- holding the public key can change these flags directly. That is acceptable
-- for a low-stakes config row; if you need it locked down, switch the server
-- to a secret/service-role key instead and drop the write policies below.

create table if not exists public.app_config (
  id          text primary key,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table public.app_config enable row level security;

drop policy if exists "app_config read"   on public.app_config;
drop policy if exists "app_config insert" on public.app_config;
drop policy if exists "app_config update" on public.app_config;

create policy "app_config read"   on public.app_config for select using (true);
create policy "app_config insert" on public.app_config for insert with check (true);
create policy "app_config update" on public.app_config for update using (true) with check (true);

-- Seed the default flags row (safe to re-run; won't overwrite an existing row).
insert into public.app_config (id, data)
values (
  'feature_flags',
  '{
    "toolEnabled": true,
    "maintenance": false,
    "features": {
      "standardImport": true,
      "objectFocus": true,
      "folderUpload": true,
      "beforeAfter": true,
      "markPractice": true
    },
    "limits": { "patterns": 8, "themes": 10 }
  }'::jsonb
)
on conflict (id) do nothing;

-- Make PostgREST pick up the new table immediately (avoids "schema cache" errors).
notify pgrst, 'reload schema';
