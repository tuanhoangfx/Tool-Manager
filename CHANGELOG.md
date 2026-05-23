# Changelog — Tool Manager (P0020)

## [Unreleased]

## [0.1.0] — 2026-05-23

### Added

- **Notes Supabase CRUD** — `src/features/notes/`, migration SQL, auth gate.
- **Lazy hub screens** + Vite `manualChunks` (app-todo, app-notes, hub-p0004, vendors).
- **Deploy Vercel** — https://tool-manager-zeta.vercel.app
- `docs/SUPABASE-NOTES.md`, `docs/DEPLOY-VERCEL.md`, `.env.example`, `src/hub/app-registry.ts`.

### Changed

- Rebrand → **Tool Manager**; shared `src/lib/supabase.ts` (P0019 re-export).
- Cookie sync screen reads notes from Supabase.

### Pending

- Chạy SQL migration trên Supabase Dashboard.
- Đổi folder `P0020-Tool-Manager` khi không còn process lock.
- Vercel env: `VITE_SUPABASE_*`, `VITE_GITHUB_TOKEN`.

## [0.0.1-design] — prior

### Changed (rebrand)

- **Workspace Hub / Workspace Notes** → **Tool Manager** (UI, manifest, docs).

### Design

- **Layout chốt: V5** (Card Gallery + Drawer), skin P0008 — `docs/DESIGN-DECISION.md`
- Phase 1: Notes production UI theo V5

## [0.0.1-design] — 2026-05-22

### Added

- Fork từ P0004 (`P0020-Workspace-Notes`); P0004 không đổi.
- Tab **Design** mặc định với **5 layout preview** (V1–V5) cho Notes + cookie block mock.
- **Skin 3 — P0008 Seller Center** (mặc định tab Design): clone `globals.css`, Tailwind, `.btn`/`.field`, animations, glass bento, sidebar.
- `src/theme/p0008/*`, `P0008SkinShell`; tab Library/Activity/System vẫn skin P0004 (skin 1).
- `docs/DESIGN-PREVIEW.md`, `.cursor/rules/design-preview-first.mdc`.
- Dev server port **5177**.

### Not included (phase 0)

- Notes CRUD, Supabase, extension cookie sync, share links thật.
