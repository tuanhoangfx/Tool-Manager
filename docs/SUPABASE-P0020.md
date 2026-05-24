# P0020 — Supabase schema (Notes + Cookie bridge)

## Source of truth

1. **`supabase/migrations/`** — timestamped files (`20260523120000_*.sql`, …). Edit only here.
2. **`supabase/APPLY_ALL_P0020_COOKIE_BRIDGE.sql`** — **generated** for one-shot paste in [SQL Editor](https://supabase.com/dashboard/project/yhnqwxejjkfgmjmiquhb/sql/new). Do not edit by hand.

```bash
pnpm generate:apply-all        # rebuild APPLY_ALL from migrations
pnpm generate:apply-all --check # CI: fail if APPLY_ALL is stale
```

## Apply schema

### Option A — Supabase CLI (recommended)

```bash
supabase link --project-ref yhnqwxejjkfgmjmiquhb
supabase db push
```

### Option B — SQL Editor (no CLI)

1. Open SQL Editor.
2. Paste contents of `supabase/APPLY_ALL_P0020_COOKIE_BRIDGE.sql`.
3. Run all.
4. Wait ~30s or reload API schema (Settings → API).

### Option C — Postgres URI (local automation)

```bash
# SUPABASE_DB_URL in .env.local (see tool.manifest.json → supabase.localEnv)
pnpm apply:cookie
```

## Verify

```bash
pnpm verify:cookie-bridge
```

Optional real-note vault probe in `.env.local`:

```env
P0020_PROBE_NOTE_ID=<your-note-uuid>
```

## CI

GitHub Actions workflow `.github/workflows/cookie-bridge.yml` runs:

- `generate:apply-all --check`
- `tsc`, `vitest`
- `verify:cookie-bridge` (needs repo secrets `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)

Optional repo secret **`P0020_PROBE_NOTE_ID`** (note UUID) runs full vault fetch smoke in CI.

Set secrets: GitHub → **tuanhoangfx/Tool-Manager** → Settings → Secrets and variables → Actions.

Local probe id (when you have notes):

```bash
node scripts/pick-probe-note-id.mjs --write-env
```

## Legacy

Old hand-maintained `APPLY_*.sql` files live in `supabase/legacy/` — deprecated.
