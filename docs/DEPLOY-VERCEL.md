# P0020-Data-Box — Deploy Vercel

## Project

| Field | Value |
|-------|--------|
| Framework | Vite |
| Build (Vercel) | `pnpm run build:vercel` → `vite build` |
| Build (local gate) | `pnpm build` → `tsc` + vitest + vite |
| Output | `dist` |
| Config | `vercel.json` (SPA rewrites) |
| Port local | 5177 |
| Production | https://databox.infi.io.vn |
| Vercel project | `tool-manager` · team `tuanhoangfxs-projects` |
| GitHub | https://github.com/tuanhoangfx/Tool-Manager · branch `main` |

## Golden deploy flow (AI + human)

Deploy hook **only rebuilds what is already on `origin/main`**. Unpushed local changes never reach production.

```
1. EDIT     — feature/fix in Tool/P0020-Data-Box
2. VERSION  — bump package.json; run ensure-changelog-version-block if needed
3. COMMIT   — pre-commit parity hooks must pass
4. PUSH     — git push origin main  →  Vercel Git integration builds automatically
5. VERIFY   — GitHub commit status: Vercel = success (not failure)
6. SHIP     — optional hook + post-deploy gates (see below)
```

### Full ship (recommended after push)

```powershell
cd E:\Dev\Tool\P0020-Data-Box
pnpm sync:vercel-env              # upsert VITE_* from .env.local (needs VERCEL_TOKEN)
pnpm deploy:vercel:env-ship       # sync → deploy hook → wait TWOFA → wait app version
```

Flags:

| Flag | Effect |
|------|--------|
| `--skip-sync` | Skip env API upsert (hook + waits only) |
| `--skip-wait` | Skip TWOFA anon bundle check |
| `--skip-version-wait` | Skip package.json version probe |

One-shot checks:

```powershell
pnpm verify:prod-twofa-env
node scripts/wait-prod-app-version.mjs
```

### Hook-only (after push already triggered Git build)

```powershell
node scripts/vercel-env-ship.mjs --skip-sync
```

Use when Git push already started a successful Vercel build and you only need to re-alias or re-run post-deploy gates.

## VERCEL_TOKEN

Store in `E:\Dev\.env.shared` (never commit).

| Requirement | Detail |
|-------------|--------|
| Scope | **Full Account** or **`tuanhoangfx's projects`** — copy token exactly (no extra chars) |
| Create | https://vercel.com/account/settings/tokens |
| Name | e.g. `cursor-dev-full-ship-2026` |
| Expiration | 1 year (or No Expiration for automation) |
| Fallback | If REST returns `invalidToken`, run `vercel login` — sync auto-falls back to CLI |

Verify token + env gates:

```powershell
cd E:\Dev\Tool\P0020-Data-Box
node ..\scripts\probe-vercel-rest-token.mjs --product-root .
node scripts/preflight-vercel-env.mjs
node scripts/sync-p0020-vercel-env-api.mjs
node scripts/check-prod-vite-env-bundle.mjs
```

Deploy gate (agent):

```powershell
node ..\scripts\agent-verify-gate.mjs --code P0020 --json --intent deploy
```

Symptoms when token is wrong:

| Symptom | Cause |
|---------|--------|
| `invalidToken: true` / HTTP 403 | Token typo (trailing `!`), expired, or stale `$env:VERCEL_TOKEN` in shell |
| `pnpm sync:vercel-env` fails | Fix `.env.shared` or use `vercel login` (CLI fallback) |
| Shell overrides `.env.shared` | `Remove-Item Env:VERCEL_TOKEN` before sync |
| Deploy hook still works | Hook URL auth is separate from `VERCEL_TOKEN` |

## Env (Production)

| Variable | Required |
|----------|----------|
| `VITE_SUPABASE_URL` | Notes + Cookie vault |
| `VITE_SUPABASE_ANON_KEY` | Notes |
| `VITE_HUB_SUPABASE_URL` | Tool Hub identity |
| `VITE_HUB_SUPABASE_ANON_KEY` | Tool Hub identity |
| `VITE_TWOFA_SUPABASE_URL` | **2FA vault** (`zurfouqanjcubgneuctp`) |
| `VITE_TWOFA_SUPABASE_ANON_KEY` | **2FA vault** anon key |
| `VITE_CHATCENTER_WORKER_URL` | Hub auth worker fallback — prod `https://chathub.infi.io.vn` |
| `VITE_HUB_ADMIN_RECOVER_TOKEN` | Optional recover API |

Local template: `.env.example` → copy to `.env.local`.

`tool.manifest.json` → `vercelEnvValidation` documents required keys, verify scripts, and symptom map for AI ops.

## Post-deploy gates

`deploy:vercel:env-ship` runs in order:

1. **Env sync** — `sync-p0020-vercel-env-api.mjs`
2. **Deploy hook** — `tool.manifest.json` → `vercel.deployHookUrl`
3. **TWOFA bundle** — `wait-prod-twofa-anon-key.mjs`
4. **App version** — `wait-prod-app-version.mjs` polls until `package.json` version appears in prod `index-*.js` (default 5 min)

## Troubleshooting

| Problem | Fix |
|---------|-----|
| UI still shows old version | Hard refresh (Ctrl+Shift+R). Confirm `git push` before hook. Check GitHub Vercel status = success. |
| Vercel build failed | Open deployment URL from GitHub status → Build Logs. Common: `tsc` in `build:vercel` — use `vite build` only on Vercel. |
| Hook “complete” but old code | Hook redeployed previous Git commit — push first, wait for Git build, then hook. |
| `wait-prod-app-version` timeout | Build still running or failed — check Vercel dashboard. |
| Missing `VITE_CHATCENTER_WORKER_URL` in sync | Add to `.env.local`, re-run `pnpm sync:vercel-env`. |

## CLI (alternative)

```powershell
cd E:\Dev\Tool\P0020-Data-Box
corepack pnpm install
corepack pnpm build:vercel
corepack pnpm dlx vercel@latest deploy --prod --yes --scope tuanhoangfxs-projects
```

Requires valid `VERCEL_TOKEN` in environment.

## After deploy

1. Run Supabase migrations on production if schema changed (`pnpm db:migrate:api`).
2. `pnpm sync:workspace` from P0020 to refresh catalog.
3. Browser smoke: Cookie tab version label `vX.Y.Z` matches `package.json`.
