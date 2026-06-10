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

## Version history (`note_versions`)

Autosave vẫn ghi thẳng `notes`. Snapshot chỉ qua RPC (không hook autosave 3s):

| Client trigger | `source` | Ghi chú |
|----------------|----------|---------|
| Bấm **Save** | `save` | Hash dedup — không tạo nếu trùng bản cuối |
| Chuyển note | `session` | Hash dedup |
| Mỗi **15 / 30 / 60 phút** edit (Settings) | `interval` | Hash dedup + RPC interval gate theo setting |
| **Restore** | `restore` | Backup trước khi ghi đè |

| RPC | Mục đích |
|-----|----------|
| `note_create_version_if_changed` | Tạo snapshot khi hash đổi; `source`: `session` \| `interval` \| `restore` \| `save` |
| `note_versions_list` | List snapshot theo note |
| `note_version_get` | Chi tiết 1 snapshot |
| `note_version_restore` | Backup hiện tại (`restore`) rồi ghi đè note |

Retention (auto): tối đa **50** snapshot non-manual / note; xóa auto cũ hơn **90 ngày**.

Apply migration:

```bash
pnpm db:apply:note-versions
pnpm db:apply:note-version-save
pnpm db:apply:note-version-digest
pnpm verify:note-version   # hoặc pnpm verify:cookie (gồm cả cookie + version)
```

Storage ước lượng: ~4 KB/snapshot → 1 000 note × 30 version ≈ **120 MB** (thực tế thấp hơn nhờ session + hash dedup).

**Auto interval:** Settings → General → **Version history** — `15` / `30` / `60` min (`localStorage` key `p0020:notes-version-interval-minutes`).

## Todo / Tasks (Kanban)

```bash
pnpm db:migrate
pnpm verify:todo
```

| Bảng | Mô tả |
|------|--------|
| `tasks` | Kanban 4 cột; cột `assignees` jsonb |
| `projects`, `project_members` | Scope manager All Tasks |
| `profiles` | Sync từ `auth.users` (trigger `on_auth_user_created`) |

Demo seed: projects **General**, **Client Work** — mọi profile được gán project **General**.

Health check: RPC `todo_schema_health()` (gọi qua `pnpm verify:todo`).
