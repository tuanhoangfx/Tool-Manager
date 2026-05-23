# Roadmap — Tool Manager (P0020)

**Cập nhật:** 2026-05-23

## Sprint 1 — Notes production ✅

- [x] Supabase schema + RLS
- [x] Notes CRUD UI
- [x] GitHub https://github.com/tuanhoangfx/Tool-Manager
- [x] Vercel https://tool-manager-zeta.vercel.app + Git integration

## Sprint 2 — Cookie bridge ✅ (MVP)

- [x] Extension `E:\Dev\Extension\P0020-cookie-bridge` (MV3, alarm 60m)
- [x] Web bridge: Cookie sync → Kết nối extension / Sync now
- [ ] Chạy migration share nếu chưa: `20260523140000_notes_share_public.sql`

## Sprint 3 — Share (trong Note) ✅

- [x] `share_token`, `share_password_hash`, public RLS
- [x] `PublicShareScreen` — `?screen=share&token=`
- [x] Share UI trong Note Edit (sidebar Share đã gỡ)

## Tiếp theo

- [ ] Vercel env: `VITE_SUPABASE_*`, `VITE_GITHUB_TOKEN`
- [ ] Extension publish Chrome Web Store (optional)
- [ ] `share_expires_at` UI + view count RPC
- [ ] Đổi folder `P0020-Tool-Manager`
