# P0020 Tool Manager — H1 Unified Sidebar

## Chạy

```powershell
cd E:\Dev\Tool\P0020-Workspace-Notes
corepack pnpm dev:vite
```

**http://127.0.0.1:5177/** — Workspace sidebar tương tác.

## Màn hình (`?screen=`)

| Screen | Nội dung |
|--------|----------|
| `dashboard` | Lưới shortcut (mặc định) |
| `library` | P0004 Tool Library (P0008 embed) |
| `activity` | P0004 Activity |
| `system` | System / Design Template |
| `notes` | Notes V5 gallery |
| `edit` | Chỉnh sửa note (`?note=id`) |
| `todo` | Kanban mock (P0019) |
| `twofa` | 2FA mock |
| `cookie` | Cookie Auto production screen |
| `share` | Share links mock |
| `settings` | Cài đặt mock |

Cookie Auto design template:

`http://127.0.0.1:5177/?screen=system&stab=template&dtpl=cookie-sync`

See `docs/DESIGN-PREVIEW-cookie-sync.md` for the five UI variants.

## Code chính

- `src/features/hub/HubApp.tsx` — shell H1
- `src/theme/p0008/P0008Sidebar.tsx` — navigation
- `src/features/design-preview/screens/` — mock module Apps (đến Sprint 1)
