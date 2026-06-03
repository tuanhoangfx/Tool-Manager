# P0020-Data-Box

Unified data workspace: Notes, 2FA, Cookie Auto (+ System). Shell từ P0004 Tool Hub; skin P0008.

| Sản phẩm | Mã | Port | Vai trò |
|----------|-----|------|---------|
| Tool Hub | P0004 | 5176 | Catalog / GitHub sync |
| **P0020-Data-Box** | P0020 | 5177 | Data workspace + apps |

Todo/task board: tích hợp qua **P0021-AutoVideo-Studio** (project riêng).

## Chạy local

```powershell
cd E:\Dev\Tool\P0020-Data-Box
corepack pnpm install
corepack pnpm dev
```

→ http://127.0.0.1:5177/ · Production: https://databox.infi.io.vn · Cookie: https://databox.infi.io.vn/cookie

Chi tiết: [docs/DEV.md](docs/DEV.md) · [docs/SUPABASE-NOTES.md](docs/SUPABASE-NOTES.md) · [docs/DEPLOY-VERCEL.md](docs/DEPLOY-VERCEL.md)

| URL | Mô tả |
|-----|--------|
| http://127.0.0.1:5177/ | Dashboard |
| `?screen=library` | Tool Library |
| `?screen=notes` | Notes |

## Commands

| Lệnh | Mô tả |
|------|--------|
| `corepack pnpm dev:vite` | Dev :5177 |
| `corepack pnpm build` | Production build |
