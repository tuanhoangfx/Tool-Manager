# Changelog — Tool Manager (P0020)

## [Unreleased]

### Fixed

- Cookie Auto route owner is shown in Route Detail/Access and extension metadata; owner can `Sync now` by default when Source is unset.
- Cookie route/vault realtime now refreshes cloud routes across linked browser profiles, and Notes Workspace shows the cookie snapshot above the markdown editor.
- Cookie Auto is now cloud-first: Add/Edit route writes `cookie_bridge_routes` immediately, and manual `Pull routes` / `Push cloud` UI paths were removed.
- Workspace now mounts the extension relay globally so the popup can request the current Tool session and route cache before rendering.
- Extension relay now sends session only; route data is loaded by the extension from Supabase RPC as the source of truth.
- Extension route RPCs now use the Tool user's JWT so `auth.uid()` matches Web P0020.
- Extension popup no longer refresh-loops on route-pull timestamps and route selection now works by clicking the full row.
- Cookie route cards now have a compact green circular selector and Copy Note ID action; route sharing can be managed from toolbar or Access tab.
- Route cards now show share state, cleaner site branding icons, and fewer technical labels; Route bridge is compacted into an icon-only action.
- Extension build metadata updated to v0.5.49 for continuous tab lock during Load cookies navigation/reload.

## [0.1.1] — 2026-05-25

### Added

- Notes Hub-style search/filter bar, two-frame notes workspace, share setup panel, copy toasts, autosave, and folder management.
- Supabase migration for synced note folders with local fallback when migration is not applied yet.

### Changed

- Notes metadata/header simplified to ID and update time; cookie sync IDs stay internal.
- Notes labels normalized to English and editor styling aligned with the P0004 Hub theme.

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
- Initial design preview docs and `.cursor/rules/design-preview-first.mdc` (preview docs removed after production lock).
- Dev server port **5177**.

### Not included (phase 0)

- Notes CRUD, Supabase, extension cookie sync, share links thật.
