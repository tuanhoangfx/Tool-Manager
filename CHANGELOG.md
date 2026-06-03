# Changelog - P0020-Data-Box

> **Ship keywords:** `Git P0020` | `Push P0020` | `Release P0020`  
> **Template:** `E:\Dev\Rules\templates\tool-docs\CHANGELOG_ENTRY_TEMPLATE.md`  
> **Script:** `powershell -File E:\Dev\Tool\scripts\ship-product.ps1 -Code P0020 -Keyword Push`

## 2026-06-03 - Cookie routes: default filters All + shared route visibility

- Version: `1.1.1`
- Type: Major
- Product: P0020
- Prompt: Release P0020 — shared cookie routes visible; Hub default time range All
- Commit: `21fe0ce`
- Status: Verified
- Release: https://github.com/tuanhoangfx/Tool-Manager/releases/tag/v1.1.1

### Changes

- Hub time range default is **All** (was 30 days) when URL has no `range` param — Notes, Cookie Auto, 2FA.
- Cookie route list uses cloud `routeUpdatedAt` for time filter so shared/member routes are not hidden.

### Verification

- `vitest run` cookie-route-activity + cookieRoutesRepository — pass

---

## 2026-06-03 - Git P0020: release standardization and Data-Box path

- Version: `0.2.1`
- Type: Minor
- Product: P0020
- Prompt: Git P0020 after Push; bump Minor tier and sync release pipeline
- Commit: `762bdfb`
- Status: Verified
- Release: https://github.com/tuanhoangfx/Tool-Manager/releases/tag/v0.2.1

### Changes

- Minor version bump for ship keyword Git P0020 (release standardization complete).
- Canonical folder `P0020-Data-Box`; Hub registry and docs paths updated.

### Verification

- `corepack pnpm build` — pass
- Tag `v0.1.4` on commit `01d981c`

### Rollback

```powershell
git checkout v0.1.4
```

---

## 2026-06-03 - Vendor hub-load/hub-ui for standalone Vercel build

- Version: `0.1.4`
- Type: Patch
- Product: P0020
- Prompt: Fix Vercel deploy ENOENT on monorepo file: deps; standardize release pipeline
- Commit: `55b1b38`
- Status: Committed

### Changes

- Vendor `@dev/hub-load` and `@tool-workspace/hub-ui` under `vendor/` for GitHub/Vercel standalone clone.
- Update `package.json`, Vite/TS paths, CSS import; exclude `vendor/**` from Vitest.
- Gitignore `supabase/_*` migration scratch files.

### Verification

- `corepack pnpm build` — pass
- Vercel: `tool-manager` production deploy after push

### Rollback

```powershell
git revert <sha>
```

---

## 2026-06-03 - Cookie Auto cloud-first, Notes cookie snapshot, extension UI polish

- Version: `0.1.2`
- Type: Patch
- Product: P0020
- Prompt: Consolidate former [Unreleased] work into a versioned audit entry for review and rollback
- Commit: `9a5c5cf`
- Status: Committed

### Changes

- Rebrand to P0020-Data-Box; Azure Data Box icon (favicon, sidebar, PWA).
- Production domain `databox.infi.io.vn`; Cookie Auto at `/cookie`; extension ZIP download in header.
- Cookie cloud-first: routes write to `cookie_bridge_routes`; removed manual Pull/Push cloud UI.
- Extension relay global; popup loads routes via Supabase RPC with user JWT.
- Route owner in detail/access; realtime vault sync; Notes workspace shows cookie snapshot above editor.
- Route cards: green selector, Copy Note ID, share toolbar, brand icons (Kalodata/Surfshark), Hub-style filters.
- Extension popup iterations v0.5.49–v0.5.60 (tab lock, progress overlay, compact table, column alignment).

### Verification

- `corepack pnpm build` — pass (2026-06-03)
- Browser: http://127.0.0.1:5177/?screen=cookie

### Rollback

```powershell
cd E:\Dev\Tool\P0020-Data-Box
git checkout v0.1.1
# after commit: git revert 9a5c5cf
```

---

## 2026-05-25 - Notes workspace Hub filters

- Version: `0.1.1`
- Type: Patch
- Product: P0020
- Prompt: Notes Hub-style search/filter and folder management
- Commit: `15b41b1`
- Status: Committed

### Changes

- Notes Hub-style search/filter bar, two-frame workspace, share setup, copy toasts, autosave, folders.
- Supabase migration for synced note folders with local fallback.
- Notes metadata simplified; labels English; P0004 Hub theme alignment.

### Verification

- Tag `v0.1.1` @ `15b41b1` (2026-05-25)

### Rollback

```powershell
git checkout v0.1.0
```

---

## 2026-05-23 - Notes Supabase CRUD and Vercel deploy

- Version: `0.1.0`
- Type: Minor
- Product: P0020
- Prompt: Initial Notes CRUD and deploy baseline
- Commit: `9f217da`
- Status: Committed

### Changes

- Notes Supabase CRUD, lazy hub screens, Vite manualChunks, Vercel deploy docs.
- Rebrand P0020-Data-Box; shared supabase client; cookie sync reads notes.

### Verification

- https://tool-manager-zeta.vercel.app (legacy)

### Rollback

```powershell
git checkout 9f217da
```
