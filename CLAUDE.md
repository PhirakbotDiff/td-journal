# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal trading journal / portfolio tracker SPA (React + TypeScript + Vite + Tailwind), backed by Supabase (Postgres + Auth + one Edge Function). `master.txt` has the original product brief — note it describes a localStorage-only app, but the implementation evolved to a real Supabase backend with auth and row-level security instead.

## Commands

This repo has no `node_modules` on the host — dependencies are only ever installed inside the Docker build. Verify changes by rebuilding the Docker image rather than running `npm install` on the host.

```bash
docker compose up --build -d   # build + run at http://localhost:3000 (nginx serving the Vite build)
docker compose logs -f         # tail the running container
docker compose down            # stop it
```

`docker-compose.yml` passes `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` as build args (read from `.env`), so these are baked into the static bundle at **build time** — rebuild the image after changing them, a container restart alone won't pick up new values.

Inside a Node environment (e.g. a container shell, or CI) the package.json scripts are:

```bash
npm run dev          # vite dev server on :3000
npm run build         # tsc -b && vite build
npm run preview       # serve the built dist/ on :3000
npm run lint          # eslint .
npm run test          # vitest run (single pass)
npm run test:watch    # vitest watch mode
npx vitest run src/lib/calculations.test.ts   # single test file
npx vitest run -t "winRate"                   # single test by name
```

Test files live next to the code they test (`src/lib/calculations.test.ts`); `vitest.config.ts` only picks up `src/**/*.test.ts` and forces `TZ=UTC` so date-based calculations are deterministic.

## Architecture

### Data layer: Supabase, not localStorage

Despite the original brief, all trade/account data lives in Supabase Postgres (`supabase/schema.sql`), gated by row-level security policies scoped to `auth.uid()`. There is no custom backend API — the client talks to Supabase directly via `src/lib/supabaseClient.ts`.

- `supabase/schema.sql` is the canonical schema for a **fresh** project.
- `supabase/migrations/000N_*.sql` are incremental, idempotent migrations for upgrading an existing project (new columns, backfills). When changing the schema: update `schema.sql` for new installs *and* add a new numbered migration for existing ones.
- `supabase/functions/xau-price/` is a Deno Edge Function that proxies the Twelve Data API to fetch the XAU/USD spot price, keeping `TWELVE_DATA_API_KEY` server-side. It requires a signed-in Supabase session (default JWT verification). Deploy with `supabase functions deploy xau-price` + `supabase secrets set TWELVE_DATA_API_KEY=...`.

### State: three Zustand stores

- `useAuthStore` — Supabase session/user, `init()` wires `onAuthStateChange`.
- `useAccountStore` — multi-account support (`kind: 'cent' | 'fund'`); auto-creates a default account for new users; remembers the last-selected account per user in `localStorage`.
- `useTradeStore` — trades for the *current* account only; every mutation re-resolves the signed-in user and `currentAccountId` from the other stores rather than trusting stale props.

`App.tsx` is the orchestrator, not routing guards: it watches auth state, then cascades `fetchAccounts()` → `fetchTrades(currentAccountId)`, showing full-screen loading/error states until data is ready. The effect is keyed on `userId` (not the whole `session` object) specifically so a silent token refresh doesn't re-trigger a full reload — don't change that back to keying on `session` without reading the comment in `App.tsx`.

### DB row ↔ app model mapping

The DB uses `snake_case`; app code uses `camelCase`. `src/lib/tradeMapper.ts` and `src/lib/accountMapper.ts` are the only places that should know about column names — `rowToTrade`/`tradeToRow` etc. Partial updates are built by only including defined keys, so these mappers double as the "patch" builders for Supabase `.update()` calls.

### Trade math is centralized and pure

`src/lib/calculations.ts` holds every derived metric (P&L, R-multiple, win rate, equity curve, per-symbol/per-month aggregates) as pure functions over `Trade[]`. This is the one place with real unit test coverage (`calculations.test.ts`) — add new stats here, not inline in page components, so they stay testable.

A trade's P&L depends on `pointValue` (currency per point of price movement, per unit of quantity) — this is 1 for plain instruments like shares, but e.g. 10 for a gold mini lot. `src/lib/instruments.ts` encodes the XAU convention; `tradeStatus()` determines open/closed from whether `exitPrice`/`exitDate` are set, and unrealized P&L for open trades uses the manually-entered `currentPrice`.

### Routing & layout

React Router, with every page lazy-loaded and routed under a single `Layout` (`Sidebar` + `TopBar` + `Outlet`). There's no per-route code splitting beyond `lazy()` + `Suspense`; unauthenticated users only ever see the `Login` route (enforced in `App.tsx`, not via a route guard component).

### UI conventions

- Dark theme only (`index.css` forces `color-scheme: dark`; Tailwind's `darkMode: 'class'` is set up but unused as a toggle).
- Shared card styling lives in `src/index.css` as `.surface` / `.surface-interactive` (gradient surface + inset highlight) and `.section-title` — reuse these for new cards instead of repeating `border/bg/shadow` utility strings.
- `profit` / `loss` are custom Tailwind colors (`tailwind.config.js`); use them instead of raw green/red for any P&L-colored text.
- Page-entrance animation pattern: wrap sections in `animate-fade-in-up` and stagger via inline `style={{ animationDelay: '...ms' }}` (see `Dashboard.tsx`).
- Icons are `lucide-react`; conditional classes use `clsx`.
