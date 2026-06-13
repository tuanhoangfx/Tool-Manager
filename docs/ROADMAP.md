# Roadmap — P0020-Data-Box

**Cập nhật:** 2026-05-23

## Sprint 1 — Notes production ✅

- [x] Supabase schema + RLS
- [x] Notes CRUD UI
- [x] GitHub https://github.com/tuanhoangfx/Tool-Manager
- [x] Vercel https://tool-manager-zeta.vercel.app + Git integration

## Sprint 2 — Cookie bridge ✅ (MVP)

- [x] Extension `E:\Dev\Extension\E0001-cookie-bridge` (MV3, alarm 60m)
- [x] Web bridge: Cookie sync → Kết nối extension / Sync now
- [ ] Chạy migration share nếu chưa: `20260523140000_notes_share_public.sql`

## Sprint 3 — Share (trong Note) ✅

- [x] `share_token`, `share_password_hash`, public RLS
- [x] `PublicShareScreen` — `?screen=share&token=`
- [x] Share UI trong Note Edit (sidebar Share đã gỡ)

## Tiếp theo

- [ ] Vercel env: `VITE_SUPABASE_*`, `VITE_GITHUB_TOKEN`
- [x] Extension publish Chrome Web Store — [E0001 Cookie Bridge](https://chromewebstore.google.com/detail/e0001-cookie-bridge/kaaadageakdandpobcofplmfbjfjabdk) v1.1.2 (2026-06-11)
- [ ] `share_expires_at` UI + view count RPC
- [x] Đổi folder `P0020-Data-Box` (canonical `Tool/P0020-Data-Box`; stub `P0020-Workspace-Notes` đã xóa 2026-06-05)
