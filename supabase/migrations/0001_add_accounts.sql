-- Run this once in your Supabase project's SQL Editor if you have an existing
-- deployment (i.e. you already ran the old schema.sql before multi-account
-- support existed). It migrates your single implicit account per user into
-- an explicit "Default Account" (kind = 'fund') and scopes trades to it.
--
-- Safe to re-run: every step checks for existing state before acting.

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('cent', 'fund')),
  currency text not null default 'USD',
  starting_capital numeric not null default 10000,
  risk_per_trade_percent numeric not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists accounts_user_id_idx on public.accounts (user_id);

alter table public.accounts enable row level security;

drop policy if exists "Accounts are selectable by their owner" on public.accounts;
create policy "Accounts are selectable by their owner"
  on public.accounts for select
  using (auth.uid() = user_id);

drop policy if exists "Accounts are insertable by their owner" on public.accounts;
create policy "Accounts are insertable by their owner"
  on public.accounts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Accounts are updatable by their owner" on public.accounts;
create policy "Accounts are updatable by their owner"
  on public.accounts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Accounts are deletable by their owner" on public.accounts;
create policy "Accounts are deletable by their owner"
  on public.accounts for delete
  using (auth.uid() = user_id);

-- One default "fund" account per user who has settings and/or trades,
-- carrying over their existing currency/capital/risk if a settings row exists.
insert into public.accounts (user_id, name, kind, currency, starting_capital, risk_per_trade_percent)
select
  u.user_id,
  'Default Account',
  'fund',
  coalesce(s.currency, 'USD'),
  coalesce(s.starting_capital, 10000),
  coalesce(s.risk_per_trade_percent, 1)
from (
  select user_id from public.settings
  union
  select user_id from public.trades
) u
left join public.settings s on s.user_id = u.user_id
where not exists (
  select 1 from public.accounts a where a.user_id = u.user_id
);

-- Add account_id to trades (nullable first so we can backfill).
alter table public.trades add column if not exists account_id uuid references public.accounts (id) on delete cascade;

update public.trades t
set account_id = a.id
from public.accounts a
where t.account_id is null
  and a.user_id = t.user_id
  and a.name = 'Default Account';

alter table public.trades alter column account_id set not null;

create index if not exists trades_account_id_idx on public.trades (account_id);

drop table if exists public.settings;
