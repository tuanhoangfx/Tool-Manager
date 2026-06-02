# Changelog — P0020-Data-Box

## 2026-06-03 - Cookie Auto cloud-first, Notes cookie snapshot, extension UI polish

- Version: `0.1.2`
- Type: Patch
- Product: P0020
- Prompt: Consolidate former [Unreleased] work into a versioned audit entry for review and rollback
- Commit: `9a5c5cf`
- Status: Committed

### Changes

- Rebrand to P0020-Data-Box; Azure Data Box icon (favicon, sidebar, PWA).
- Production domain `databox.infix1.io.vn`; Cookie Auto at `/cookie`; extension ZIP download in header.
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
- Commit: `913fa3e`
- Status: Committed

### Changes

- Notes Hub-style search/filter bar, two-frame workspace, share setup, copy toasts, autosave, folders.
- Supabase migration for synced note folders with local fallback.
- Notes metadata simplified; labels English; P0004 Hub theme alignment.

### Verification

- pending

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
- Commit: `913fa3e`
- Status: Committed

### Changes

- Notes Supabase CRUD, lazy hub screens, Vite manualChunks, Vercel deploy docs.
- Rebrand P0020-Data-Box; shared supabase client; cookie sync reads notes.

### Verification

- https://tool-manager-zeta.vercel.app (legacy)

### Rollback

```powershell
git checkout <initial-release-sha>
```
