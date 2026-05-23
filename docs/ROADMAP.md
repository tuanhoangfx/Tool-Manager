# Roadmap — Tool Manager (P0020)

**Cập nhật:** 2026-05-23

## Sprint 1 — Notes production ✅

- [x] Supabase schema + RLS (`supabase/migrations/20260523120000_tool_manager_notes.sql`)
- [x] `src/lib/supabase.ts` + `src/features/notes/*` CRUD
- [x] Gallery + Edit screens (V5 layout)
- [ ] **Bạn:** chạy migration trên Supabase Dashboard (xem `docs/SUPABASE-NOTES.md`)

## Sprint 2 — Cookie bridge

- [ ] Extension MV3 `P0020-cookie-bridge`
- [ ] Ghi `cookie_snapshot` + `sync_status` từ extension
- [ ] Log sync 24h (thay mock)

## Sprint 3 — Share links

- [ ] `share_token` + password gate
- [ ] `ShareLinksScreen` production

## Ops ✅ / pending

- [x] Vite `manualChunks` + lazy hub screens (`src/hub/app-registry.ts`)
- [x] `docs/DEPLOY-VERCEL.md`, `.env.example`
- [ ] Vercel project `tool-manager` — deploy: `vercel deploy --name tool-manager`
- [ ] Đổi folder `P0020-Tool-Manager` (đóng process đang lock folder trước)
- [ ] Git init + push `tuanhoangfx/Workspace-Notes` hoặc `Tool-Manager`

## Phân tách với P0004

| | P0004 | P0020 |
|---|-------|-------|
| Tên | GitHub Tool Manager | Tool Manager |
| Port | 5176 | 5177 |
| Production | infix1.io.vn | tool-manager.vercel.app (sau deploy) |
