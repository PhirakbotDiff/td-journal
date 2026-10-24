-- Run this once in your Supabase project's SQL Editor (Project > SQL Editor > New query).
-- This is the schema for a FRESH install. If you already have data from before
-- multi-account support, run migrations/0001_add_accounts.sql instead.
-- Safe to re-run: every statement is idempotent.

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

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  symbol text not null,
  direction text not null check (direction in ('long', 'short')),
  entry_price numeric not null,
  exit_price numeric,
  quantity numeric not null,
  entry_date timestamptz not null,
  exit_date timestamptz,
  fees numeric not null default 0,
  notes text not null default '',
  tags text[] not null default '{}',
  stop_loss numeric,
  current_price numeric,
  point_value numeric not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists trades_user_id_idx on public.trades (user_id);
create index if not exists trades_account_id_idx on public.trades (account_id);

alter table public.trades enable row level security;

drop policy if exists "Trades are selectable by their owner" on public.trades;
create policy "Trades are selectable by their owner"
  on public.trades for select
  using (auth.uid() = user_id);

drop policy if exists "Trades are insertable by their owner" on public.trades;
create policy "Trades are insertable by their owner"
  on public.trades for insert
  with check (auth.uid() = user_id);

drop policy if exists "Trades are updatable by their owner" on public.trades;
create policy "Trades are updatable by their owner"
  on public.trades for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Trades are deletable by their owner" on public.trades;
create policy "Trades are deletable by their owner"
  on public.trades for delete
  using (auth.uid() = user_id);
