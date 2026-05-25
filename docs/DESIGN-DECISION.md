# Design decision — P0020 Tool Manager

**Cập nhật:** 2026-05-25

## Đã chốt

| Hạng mục | Lựa chọn | Ghi chú |
|----------|----------|---------|
| **Hub layout** | **H1 — Unified Sidebar** | Một sidebar: P0004 + Apps; main đổi theo mục chọn |
| **Notes UI** | **V5 — Card Gallery + Drawer** | Layout trong module Notes |
| **Skin** | **P0008 Seller Center** | Toàn app, kể cả P0004 nhúng |
| **Cookie Auto Web UI** | **P0004 Hub table + modal** | Table view giống Hub; Add/Edit/Delete qua modal; source lock hiển thị bằng badge |

## Phạm vi sản phẩm

```
P0020 Tool Manager (H1)
├── Sidebar
│   ├── Dashboard
│   ├── P0004 — Library · Activity · System
│   ├── Apps — Notes · Todo · 2FA · Cookie · Share
│   └── System — Cài đặt
└── Main — nội dung module (không reload)
```

## Sprint tiếp theo

| Module | Trạng thái |
|--------|------------|
| **Notes** | Mock V5 → Supabase CRUD (Sprint 1) |
| **Todo** | P0019 100% — `App.tsx` + toàn bộ `src/features/todo/p0019/` (sync: `pnpm sync:p0019`) |
| **2FA** | TOTP client — `otpauth`, localStorage (`src/features/twofa`) |
| **Cookie Auto** | Extension MV3 hourly → note |
| **Share** | Sprint 3 — link + mật khẩu |

## Đã xóa (không còn trong repo)

- Hub layout review H2–H5, Notes V1–V4 archive
- `AppDesignPreview`, `LegacyP0004App`, skin 9router entry
