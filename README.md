# Tool Manager (P0020)

Fork từ [P0004 GitHub Tool Manager](../P0004-GitHub-Tool-Manager). **P0004 repo gốc giữ nguyên** (catalog-only, port 5176).

**Tool Manager** = P0004 (Library, Activity, System) + Notes + Todo (P0019) + 2FA + Cookie Auto — một shell H1.

**Layout đã chốt:** H1 Unified Sidebar · **Skin:** P0008.

| Sản phẩm | Mã | Port | Vai trò |
|----------|-----|------|---------|
| GitHub Tool Manager | P0004 | 5176 | Catalog / GitHub sync (production) |
| **Tool Manager** | P0020 | 5177 | Hub thống nhất + apps |

## Chạy local

**Giống P0008:** Cursor Launch → **`p0020-dev`** hoặc terminal:

```powershell
cd E:\Dev\Tool\P0020-Workspace-Notes
corepack pnpm install
corepack pnpm dev
```

→ http://127.0.0.1:5177/ · Production: https://tool-manager-zeta.vercel.app

Chi tiết: [docs/DEV.md](docs/DEV.md) · [docs/SUPABASE-NOTES.md](docs/SUPABASE-NOTES.md) · [docs/DEPLOY-VERCEL.md](docs/DEPLOY-VERCEL.md)

| URL | Mô tả |
|-----|--------|
| http://127.0.0.1:5177/ | Dashboard |
| `?screen=library` | Tool Library |
| `?screen=notes` | Notes V5 |

[docs/DESIGN-DECISION.md](docs/DESIGN-DECISION.md)

## Commands

| Lệnh | Mô tả |
|------|--------|
| `corepack pnpm dev:vite` | Dev :5177 |
| `corepack pnpm build` | Production build |
