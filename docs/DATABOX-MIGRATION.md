# Data Box — migrate to a new Supabase project

Use this when the old project (`yhnqwxejjkfgmjmiquhb`) is restricted and you created a **new** Supabase project.

**Current Data Box (2026-05):** `bklxcjrkhrevdcqjscku` — enzobyczp P01. Retired refs: `ibkunxxrhqluvzocqlyt`, `gnxmjfayqmjgtzebzghv`.

**What moves:** schema + RPC + RLS (from `supabase/migrations/`).  
**What does not move automatically:** rows from the old DB (notes, cookies, vault) unless you have a separate dump.

**Unchanged:** Tool Hub identity (`VITE_HUB_SUPABASE_*` on P0004 / P0020) — Users & roles stay on `fmnrafpzctuhxjaaomzt`.

## 1. New project checklist (Dashboard)

1. Create project → note **project ref** and region.
2. **Authentication → Providers → Email** — enable Email (password).
3. **Authentication → URL configuration** — add site URL / redirect URLs you use (local + production). Step-by-step: [DATABOX-AUTH-SETUP.md](./DATABOX-AUTH-SETUP.md).
4. **Project Settings → API** — copy **Project URL** and **anon public** key.

## 2. Local env (P0020)

Edit `Tool/P0020-Workspace-Notes/.env.local`:

```env
VITE_SUPABASE_URL=https://<NEW_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<new-anon-key>

# Transaction pooler URI (real password, not placeholder)
SUPABASE_DB_URL=postgresql://postgres.<NEW_REF>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

Keep existing `VITE_HUB_SUPABASE_*` as-is.

Sync manifests + extension:

```bash
cd Tool/P0020-Workspace-Notes
pnpm db:sync-manifest
pnpm sync:e0001-databox
```

## 3. Apply migrations

```bash
pnpm db:migrate
pnpm verify:cookie
```

Or paste each file in **SQL Editor** in timestamp order under `supabase/migrations/` (see `RUN_ALL_P0020_NOTES.sql` for the list).

## 4. First users on the new Data Box

`signInWorkspaceDual` signs in **Hub** then **Data Box** with the same email/password.

| Case | Action |
|------|--------|
| New Data Box, existing Hub user | **Sign up** once on P0020 (creates `auth.users` on Data Box) or Hub admin creates user — email must match Hub. |
| Brand-new user | Sign up on P0020 (both planes) or create on Hub then sign up on Data Box. |

Old notes/cookies **will not appear** unless you restore a SQL dump with matching `auth.users` UUIDs.

## 5. Production & extension

| Target | Variables / files |
|--------|-------------------|
| Vercel (databox) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| E0001 extension | `pnpm sync:e0001-databox` then reload extension in Chrome |
| P0019 Todo embed | Uses P0020 env — no separate change |

## 6. Smoke test

1. `pnpm dev` → Sign in (no egress error on Data Box).
2. Create a note → save → reload.
3. Cookie tab → schema banner green after `verify:cookie`.
4. Extension sign-in from popup (dual session).

## 7. Optional: import old data later

If Supabase Support or an old backup provides a `.sql` dump:

1. Restore only after migrations ran on the new project.
2. Prefer full dump including `auth` schema so `user_id` FKs stay valid.
3. Otherwise import `public` tables only and re-map users manually.

## Scripts reference

| Command | Purpose |
|---------|---------|
| `pnpm db:sync-manifest` | Update `tool.manifest.json` from `VITE_SUPABASE_URL` |
| `pnpm db:migrate` | Run all `supabase/migrations/*.sql` via `SUPABASE_DB_URL` |
| `pnpm db:url:clipboard` | Paste pooler URI into `.env.local` |
| `pnpm verify:cookie` | RPC/schema health check |
| `pnpm sync:e0001-databox` | Push Data Box keys to E0001 |
