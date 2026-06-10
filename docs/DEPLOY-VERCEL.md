# P0020-Data-Box — Deploy Vercel

## Project

| Field | Value |
|-------|--------|
| Framework | Vite |
| Build | `corepack pnpm build` |
| Output | `dist` |
| Config | `vercel.json` (SPA rewrites) |
| Port local | 5177 |

## Env (Production)

| Variable | Required |
|----------|----------|
| `VITE_SUPABASE_URL` | Notes + (optional shared) |
| `VITE_SUPABASE_ANON_KEY` | Notes |
| `VITE_HUB_SUPABASE_URL` | Tool Hub identity |
| `VITE_HUB_SUPABASE_ANON_KEY` | Tool Hub identity |
| `VITE_TWOFA_SUPABASE_URL` | **2FA vault** (`zurfouqanjcubgneuctp`) — required for cloud sync |
| `VITE_TWOFA_SUPABASE_ANON_KEY` | **2FA vault** anon key |
| `VITE_GITHUB_TOKEN` | Library refresh (read-only) |

Sync from `.env.local` (requires `VERCEL_TOKEN` in `E:\Dev\.env.shared`):

```powershell
cd E:\Dev\Tool\P0020-Data-Box
pnpm sync:vercel-env              # API upsert all VITE_* keys
pnpm deploy:vercel:env-ship       # sync → deploy hook → wait TWOFA anon in bundle
pnpm verify:prod-twofa-env        # one-shot check (exit 1 if anon missing)
```

Legacy CLI: `node ../scripts/supabase-sync-vercel.mjs` (needs `vercel login`).

`tool.manifest.json` → `vercelEnvValidation` documents required keys, verify scripts, and symptom map for AI ops.
Post-deploy gate: `verify-production-smoke.mjs` runs `verify-vercel-env-bundle.mjs` when manifest has `vercelEnvValidation.checks`.

## CLI

```powershell
cd E:\Dev\Tool\P0020-Data-Box
corepack pnpm install
corepack pnpm build
corepack pnpm dlx vercel@latest deploy --prod --yes --scope tuanhoangfxs-projects
```

Hoặc dùng MCP **deploy_to_vercel** từ Cursor (project root = P0020).

## GitHub

Repo: **https://github.com/tuanhoangfx/Tool-Manager** (branch `main`).

Vercel Git integration: đã connect (`vercel git connect`).

## Sau deploy

1. Chạy migration Notes trên Supabase production (nếu dùng project riêng).
2. `pnpm sync:workspace` từ P0020 để cập nhật catalog.
3. Thêm entry P0020 vào `workspace-catalog.json` (P0004 hub).
