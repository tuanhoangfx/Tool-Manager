# P0020 Tool Manager — Deploy Vercel

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
| `VITE_GITHUB_TOKEN` | Library refresh (read-only) |

## CLI

```powershell
cd E:\Dev\Tool\P0020-Workspace-Notes
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
