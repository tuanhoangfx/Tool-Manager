# 2FA vault — dedicated Supabase (Phase B + separate project)

## Project

| Field | Value |
|-------|--------|
| Name | czprofess P01 |
| Ref | `zurfouqanjcubgneuctp` |
| URL | `https://zurfouqanjcubgneuctp.supabase.co` |
| Owner | czprofess@gmail.com |

**Not** stored in git: anon key, service role, access tokens, DB password.

## Planes (three Supabase clients)

| Plane | Project | Env vars | Data |
|-------|---------|----------|------|
| Identity | P0004 Hub `fmnrafpzctuhxjaaomzt` | `VITE_HUB_SUPABASE_*` | Users, roles |
| Data Box | `bklxcjrkhrevdcqjscku` | `VITE_SUPABASE_*` | Notes, Cookie |
| **2FA vault** | `zurfouqanjcubgneuctp` | `VITE_TWOFA_SUPABASE_*` | `twofa_accounts` only |

Sign-in UI unchanged: `signInWorkspaceDual` mirrors the same email/password to Hub → Data Box → **2FA vault**.

## Setup

1. **SQL** — Supabase Dashboard → SQL Editor → run  
   `supabase-twofa/migrations/20260603100000_twofa_accounts.sql`

2. **Auth** — disable email confirm for dev, or allow mirror sign-up (same as Data Box).

3. **`.env.local`** (anon from Dashboard or credentials you provide — agent may write gitignored `.env.local`, **anon only**):

```env
VITE_TWOFA_SUPABASE_URL=https://zurfouqanjcubgneuctp.supabase.co
VITE_TWOFA_SUPABASE_ANON_KEY=<anon-public-jwt>
TWOFA_SUPABASE_DB_URL=postgresql://postgres.zurfouqanjcubgneuctp:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

4. **Vercel** — add the two `VITE_TWOFA_*` vars to the Data Box project.

5. **Migrate** (agent / CI): `pnpm twofa:db:apply` — uses `SUPABASE_MANAGEMENT_TOKEN` from `E:\Dev\.env.shared` (no DB password). Alt: `pnpm twofa:db:apply:pg` with `TWOFA_SUPABASE_DB_URL`.

## Phase B sync (client)

- Local-first `localStorage` for instant UI.
- After sign-in: **paginated** pull (`PAGE_SIZE=200`), **delta** via `updated_at` watermark.
- Mutations: upsert/delete to cloud in background; merge by `updated_at`.

## Security

- Never commit **service role**, **sbp_** access tokens, or **sb_secret_** keys.
- Rotate any secret pasted in chat or tickets.
- Client uses **anon + RLS** only; `user_id = auth.uid()`.

## Verify

```powershell
cd E:\Dev\Tool\P0020-Data-Box
pnpm twofa:db:apply   # Management API → project zurfouqanjcubgneuctp
pnpm build
# Sign in → 2FA tab → Cloud vault: Synced (delta)
```

**Applied on project `zurfouqanjcubgneuctp`:** `20260603100000_twofa_accounts.sql` (table `twofa_accounts` + RLS).
