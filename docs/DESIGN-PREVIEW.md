# P0020 Tool Manager — H1 Unified Sidebar

## Chạy

```powershell
cd E:\Dev\Tool\P0020-Workspace-Notes
corepack pnpm dev:vite
```

**http://127.0.0.1:5177/** — Dashboard + sidebar tương tác.

## Màn hình (`?screen=`)

| Screen | Nội dung |
|--------|----------|
| `dashboard` | Lưới shortcut (mặc định) |
| `library` | P0004 Tool Library (P0008 embed) |
| `activity` | P0004 Activity |
| `system` | P0004 System / Sync |
| `notes` | Notes V5 gallery |
| `edit` | Chỉnh sửa note (`?note=id`) |
| `todo` | Kanban mock (P0019) |
| `twofa` | 2FA mock |
| `cookie` | Cookie sync mock |
| `share` | Share links mock |
| `settings` | Cài đặt mock |

URL cũ `?screen=hub` / `?screen=layouts` → tự chuyển Dashboard.

## Code chính

- `src/features/hub/HubApp.tsx` — shell H1
- `src/theme/p0008/P0008Sidebar.tsx` — navigation
- `src/features/design-preview/screens/` — mock module Apps (đến Sprint 1)
