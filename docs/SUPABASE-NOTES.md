# Supabase — Notes (P0020-Data-Box)

## New project / migrate

See **[DATABOX-MIGRATION.md](./DATABOX-MIGRATION.md)** (full checklist).

Quick path:

```bash
# .env.local → VITE_SUPABASE_* + SUPABASE_DB_URL
pnpm db:sync-manifest
pnpm db:migrate
pnpm verify:cookie
pnpm sync:e0001-databox
```

## Env local

```env
VITE_SUPABASE_URL=https://<your-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Xem `.env.example`. Build Vercel: thêm cùng biến trong Project Settings → Environment Variables.

## Auth

Notes dùng **Supabase Auth** (email/password). Đăng nhập tại màn Notes hoặc Todo (cùng session).

## Schema tóm tắt

| Cột | Mô tả |
|-----|--------|
| `title`, `slug`, `domain` | Metadata note |
| `body_md` | Nội dung markdown |
| `cookie_snapshot` | JSON array (extension Sprint 2); loaded on single-note open, not on list refresh |
| `sync_status` | `manual` \| `synced` \| `pending` \| `error` |
| `pinned`, `share_enabled`, `share_token` | UI V5 |

RLS: mỗi user chỉ CRUD row `user_id = auth.uid()`.
