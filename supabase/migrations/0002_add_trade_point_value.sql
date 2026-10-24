-- Run this once in your Supabase project's SQL Editor.
-- Adds a per-trade "point value" ($ gained per point move, per unit of
-- quantity) so instruments traded in lots (gold, forex, futures) can be
-- scored correctly instead of assuming 1 unit of quantity = $1 per point
-- (which is only true for things like individual shares).
--
-- Existing trades default to 1 (their P&L is unchanged by this migration).
-- If you want a past gold trade to reflect a $10/point mini lot, open it in
-- the Trade Journal and set its Point Value to 10 manually.
--
-- Safe to re-run.

alter table public.trades add column if not exists point_value numeric not null default 1;
