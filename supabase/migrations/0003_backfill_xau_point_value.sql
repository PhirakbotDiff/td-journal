-- Run this once in your Supabase project's SQL Editor.
-- Backfills Point Value = 10 on existing gold (XAU) trades that still have
-- the pre-feature default of 1, so their P&L reflects the $10/point mini
-- lot convention without you having to edit each one by hand.
--
-- Only touches trades still at the default (point_value = 1) — any XAU
-- trade you've already customized to a different value is left alone.
-- Safe to re-run.

update public.trades
set point_value = 10
where symbol ilike 'xau%'
  and point_value = 1;
