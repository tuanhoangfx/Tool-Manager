# Supabase — Notes (P0020-Data-Box)

## Migration

1. Mở [Supabase Dashboard](https://supabase.com/dashboard) → project **yhnqwxejjkfgmjmiquhb** (cùng Todo P0019).
2. **SQL Editor** → dán và chạy file:

`supabase/migrations/20260523120000_tool_manager_notes.sql`

3. Share (Sprint 3): `supabase/migrations/20260523140000_notes_share_public.sql`

4. Kiểm tra: Table Editor → bảng `notes` + RLS enabled.

## Env local

```env
VITE_SUPABASE_URL=https://yhnqwxejjkfgmjmiquhb.supabase.co
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
| `cookie_snapshot` | JSON array (extension Sprint 2) |
| `sync_status` | `manual` \| `synced` \| `pending` \| `error` |
| `pinned`, `share_enabled`, `share_token` | UI V5 |

RLS: mỗi user chỉ CRUD row `user_id = auth.uid()`.
