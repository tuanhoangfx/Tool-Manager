# Changelog - P0020-Data-Box

> **Ship keywords:** `Git P0020` | `Push P0020` | `Release P0020`  
> **Template:** `E:\Dev\Rules\templates\tool-docs\CHANGELOG_ENTRY_TEMPLATE.md`  
> **Script:** `powershell -File E:\Dev\Tool\scripts\ship-product.ps1 -Code P0020 -Keyword Push`

## 2026-06-03 - Release: Notes sync, 2FA cloud vault, Cookie FAB chrome

- Version: `3.1.1`
- Type: Major
- Product: P0020
- Prompt: Release Vercel — Notes đồng bộ cùng tài khoản Supabase + batch 2.1.x
- Commit: `f9ab6d1`
- Status: Committed

### Changes

- Notes: list cache scoped by `user_id`; focus/visibility pull from Supabase; Realtime UI toggle wired to Cookie settings; realtime INSERT/UPDATE/DELETE on `notes`.
- 2FA: dedicated Supabase vault project, cloud delta sync, `twofa_accounts` migrations.
- Cookie: extension FAB dock/inset, Hub auth-gate modals on route dialogs, default 25-row limit, row-limit control in chrome.
- Workspace: dual sign-in mirrors Hub → Data Box → 2FA vault.

### Verification

- `corepack pnpm run build` — pending (Release pipeline)
- Production smoke — pending

Version: `2.1.8` → `3.1.1`

---

## 2026-06-03 - Cookie FAB inset fix (+0.5rem)

- Version: `2.1.8`
- Type: Patch
- Product: P0020
- Prompt: FAB vẫn sát lề — căn trái/lên thêm 0.5rem
- Status: Draft

### Changes

- `cookie-extension-fab.css`: `.workspace-fab-stack` was overriding `--cookie` (0.65rem won); use `.workspace-fab-stack.workspace-fab-stack--cookie` at `right`/`bottom` **10.5rem**.

Version: `2.1.7` → `2.1.8`

---

## 2026-06-03 - Cookie FAB 10rem inset + Hub auth-gate modals

- Version: `2.1.7`
- Type: Patch
- Product: P0020
- Prompt: FAB lệch trái/lên 10rem; Add/Share/Edit/Delete modals theo theme User tab (P0004)
- Status: Draft

### Changes

- `cookie-extension-fab.css`: FAB `right` / `bottom` → `10rem`.
- `CookieAutoSyncTable.tsx`: `CookieRouteModal` → `auth-gate-root` / `auth-gate-modal` (Add, Share, Edit, Delete).

Version: `2.1.6` → `2.1.7`

---

## 2026-06-03 - Cookie FAB inset (away from edges)

- Version: `2.1.6`
- Type: Patch
- Product: P0020
- Prompt: Move download FAB further into content (less flush to right/bottom edges)
- Status: Draft

### Changes

- `cookie-extension-fab.css`: FAB inset `right` 2.5rem, `bottom` 2.25rem.

Version: `2.1.5` → `2.1.6`

---

## 2026-06-03 - Cookie FAB size and content-zone position

- Version: `2.1.5`
- Type: Patch
- Product: P0020
- Prompt: FAB slightly larger; dock in bottom-right content area (not screen edge)
- Status: Draft

### Changes

- Cookie download FAB: 36px, icon 16px; `right/bottom` inset 1.5rem / 1.25rem (hub-main padding zone).

### Verification

- `corepack pnpm run build` — pass

Version: `2.1.4` → `2.1.5`

---

## 2026-06-03 - Default 25 rows + Cookie FAB viewport dock

- Version: `2.1.4`
- Type: Patch
- Product: P0020
- Prompt: Default row limit 25; Cookie extension FAB smaller, viewport-fixed with glow
- Status: Draft

### Changes

- `DEFAULT_HUB_ROW_LIMIT` = 25 (`url-prefs`, `HubRowLimitSelect`).
- `CookieExtensionFab`: portal to `document.body`, fixed bottom-right, compact + pulse; only when Cookie tab active.

### Verification

- `corepack pnpm run build` — pass

Version: `2.1.3` → `2.1.4`

---

## 2026-06-03 - 2FA table perf + Hub row limit control

- Version: `2.1.3`
- Type: Patch
- Product: P0020
- Prompt: Fix lag with ~1000 rows; clone P0004 Hub row limit selector (25–500)
- Status: Draft

### Changes

- `HubRowLimitSelect` on 2FA toolbar (same as P0004 Hub); table renders `slice(0, limit)` only.
- Memoized table rows; debounced `localStorage` save; TOTP cells update on tick without re-rendering full vault.

### Verification

- `corepack pnpm run build` — pass

Version: `2.1.2` → `2.1.3`

---

## 2026-06-03 - 2FA dedicated Supabase (czprofess P01) + Phase B sync

- Version: `2.1.2`
- Type: Patch
- Product: P0020
- Prompt: Wire 2FA vault to project zurfouqanjcubgneuctp (B + separate project); Hub login mirror
- Status: Draft

### Changes

- `supabase-twofa/migrations/20260603100000_twofa_accounts.sql` — RLS `twofa_accounts`.
- Client: `VITE_TWOFA_SUPABASE_*`, `signInWorkspaceDual` → `authenticateTwofaVault`, delta/paginated `twofa-cloud-sync`.
- Docs: `docs/TWOFA-SUPABASE.md`; `tool.manifest.json` → `supabase.twofaVault`.

### Verification

- Apply SQL on project `zurfouqanjcubgneuctp`, set `.env.local` anon key, `pnpm build`, sign-in → 2FA cloud sync.

Version: `2.1.1` → `2.1.2`

---

## 2026-06-03 - Release: https://github.com/tuanhoangfx/Tool-Manager/releases/tag/v2.1.1

- Version: `2.1.1`
- Type: Major
- Product: P0020
- Prompt: Release P0020 — ship 2FA Users-style table, Add/bulk flows, Cookie-parity icons, hub tab chrome
- Commit: `e9acd17`
- Status: Verified

### Changes

- 2FA: P0004 Hub users table skin, bulk add/edit/delete, auth-gate Add modal + embedded search-miss form, platform brand icons, Chrome autofill guard, readable chips/typography.
- Workspace: Hub-style tab headers, Cookie extension FAB + download confirm, shared hub-ui vendor shell.
- Cookie: default filters All, shared route visibility, cloud-first sync polish.

### Verification

- `corepack pnpm run build` — pass
- Production smoke via `ship-product.ps1 -Keyword Release`

Version: `1.1.20` → `2.1.1`

---

## 2026-06-03 - 2FA table typography (readable chips)

- Version: `1.1.20`
- Type: Patch
- Product: P0020
- Prompt: Default font info; slightly larger table text, account badge, and TOTP code chip
- Status: Draft

### Changes

- `hub-users-table.css` (`--twofa`): body 13px, headers 12px, service title 13px, muted dates 11px, period label 12px.
- `TwofaAccountsTable`: account/secret/password chips 10px + padding; code chip 11px semibold; chip icons 11px.

### Verification

- `corepack pnpm run build` — pass

Version: `1.1.19` → `1.1.20`

---

## 2026-06-03 - 2FA Add form: disable Chrome autofill

- Version: `1.1.19`
- Type: Patch
- Product: P0020
- Prompt: Stop Chrome prefilling ID/Password on Add accounts modal
- Status: Draft

### Changes

- `TwofaAddForm`: `autocomplete=off` form, non-login field names, masked text password (not `type=password`), `readOnly` until focus on add.

### Verification

- `corepack pnpm run build` — pass

---

## 2026-06-03 - 2FA platform icon size (Cookie parity)

- Version: `1.1.18`
- Type: Patch
- Product: P0020
- Prompt: Shrink Service icons to match Cookie tab (h-4 w-4)
- Status: Draft

### Changes

- `TwofaPlatformIcon`: 16px like Cookie route table; `referrerPolicy` + `onError` fallback.

### Verification

- `corepack pnpm run build` — pass

---

## 2026-06-03 - 2FA embedded Add form + platform brand icons

- Version: `1.1.17`
- Type: Patch
- Product: P0020
- Prompt: Show Add form in main area (not modal) on search miss; platform icons (Gmail→Google, ChatGPT, …)
- Status: Draft

### Changes

- `TwofaAddForm` embedded in content when search has no rows (same auth-gate form as modal).
- `twofa-platform-icons.registry.json` + `TwofaPlatformIcon` in Service column (replaces KeyRound marker).

### Verification

- `corepack pnpm run build` — pass

---

## 2026-06-03 - 2FA search no-match uses Add modal (no custom inline UI)

- Version: `1.1.16`
- Type: Patch
- Product: P0020
- Prompt: Keep same Add modal form centered when search has no match; remove redesigned inline panel
- Status: Draft

### Changes

- Search with no rows auto-opens `TwofaAddModal` (prefilled); removed `TwofaInlineSingleForm`.

### Verification

- `corepack pnpm run build` — pass

---

## 2026-06-03 - 2FA in-app delete confirm + inline search add

- Version: `1.1.15`
- Type: Patch
- Product: P0020
- Prompt: Replace Chrome confirm; show Single add form in main UI when search has no match
- Status: Draft

### Changes

- `TwofaConfirmDialog` (auth-gate skin) replaces `window.confirm` on bulk delete.
- `TwofaInlineSingleForm` when search returns no rows — prefilled Platform/ID/secret panel + Bulk link.

### Verification

- `corepack pnpm run build` — pass

---

## 2026-06-03 - 2FA Password field + bulk Pass format

- Version: `1.1.14`
- Type: Patch
- Product: P0020
- Prompt: Add Password field; bulk `Platform|ID|2FA` and `Platform|ID|Pass|2FA`
- Status: Draft

### Changes

- Optional `password` on account (form, table column, localStorage).
- Bulk parser: 3-field and 4-field lines; headers for both formats.

### Verification

- `corepack pnpm run build` — pass

---

## 2026-06-03 - 2FA Add modal → P0004 auth-gate pattern

- Version: `1.1.13`
- Type: Patch
- Product: P0020
- Prompt: Unify Add account modal with P0004 Tool Hub modal standard
- Status: Draft

### Changes

- `TwofaAddModal`: `auth-gate-modal` (same as P0004 `HubAuthGate` / Notes sign-in), not `modal-shell--form` (no CSS in P0004).
- Import `theme/hub-auth.css` in `styles.css` (was missing in P0020).

### Note

- `@tool-workspace/hub-ui` has no `HubFormModal`; P0004 compact forms use `hub-auth.css`.

### Verification

- `corepack pnpm run build` — pass

---

## 2026-06-03 - 2FA modal Hub form + select column colgroup

- Version: `1.1.12`
- Type: Patch
- Product: P0020
- Prompt: Fix Add modal; checkbox column width like P0004 Users (/hub-ui)
- Status: Draft

### Changes

- `TwofaAddModal`: portal + `modal-shell--form`, `btn` footer, bulk Import enabled when pasted/file (not gray placeholder).
- Table: `colgroup` + 36px select column; 2FA column % sum 100% (no extra width on checkbox col).

### Verification

- `corepack pnpm run build` — pass

---

## 2026-06-03 - 2FA bulk add modal + checkbox column fix

- Version: `1.1.11`
- Type: Patch
- Product: P0020
- Prompt: Narrow checkbox column like Users tab; add single/bulk (paste Platform|ID|2FA or Excel)
- Status: Draft

### Changes

- `TwofaAddModal`: Single + Bulk tabs; paste `Platform|ID|2FA` or import `.xlsx/.csv`; `addMany` + `parse-twofa-bulk`.
- Checkbox column: `th`/`td` select padding override (matches P0004 Users 36px).
- Toolbar Add opens modal (no inline form in shell).

### Verification

- `corepack pnpm run build` — pass

---

## 2026-06-03 - 2FA compact checkbox + Hub bulk button tokens

- Version: `1.1.10`
- Type: Patch
- Product: P0020
- Prompt: Narrow checkbox column; standardize Add/Edit/Delete like P0004 Hub controls
- Status: Draft

### Changes

- `.theme-hub`: `--hub-control-h` and related tokens (P0004 parity).
- `hub-bulk-actions.css` + `TwofaBulkActionBar` uses `hub-bulk-action-btn` variants.
- 2FA table select column 28px, 14px checkboxes.

### Verification

- `corepack pnpm run build` — pass

---

## 2026-06-03 - 2FA Users-style table + bulk actions

- Version: `1.1.9`
- Type: Patch
- Product: P0020
- Prompt: Clone P0004 Users tab for 2FA — checkboxes, Add/Edit/Delete on search bar, Created column, orange Code badge
- Status: Draft

### Changes

- Row checkboxes + select-all; bulk Add/Edit/Delete on search row right (`filterToolbar`, P0004 button sizing).
- Removed Actions column; added Created; Code badge amber; Account header icon Mail.

### Verification

- `corepack pnpm run build` — pass

---

## 2026-06-03 - 2FA account copy badge

- Version: `1.1.8`
- Type: Patch
- Product: P0020
- Prompt: Remove @ prefix on account; account as copyable badge
- Status: Draft

### Changes

- Account cell: `CopyMetaChip` (sky/cyan pill), no `@` prefix; click to copy email/account.

### Verification

- `corepack pnpm run build` — pass

---

## 2026-06-03 - 2FA table header column alignment

- Version: `1.1.7`
- Type: Patch
- Product: P0020
- Prompt: Align column headers with left/center body cells (Account, Secret, Code)
- Status: Draft

### Changes

- Left columns: `hub-users-th-btn--align-start` on header (matches td `text-align: left`).
- Center columns (Time, Last used, Actions): headers stay centered.

### Verification

- `corepack pnpm run build` — pass

---

## 2026-06-03 - 2FA badges full text + inline period

- Version: `1.1.6`
- Type: Patch
- Product: P0020
- Prompt: Show full Secret/Code; period dot then bold time on one line
- Status: Draft

### Changes

- Secret/Code chips: no truncate; wider columns; `!max-w-none` on copy badges.
- Time: horizontal dot + bold `Ns` (single row).

### Verification

- `corepack pnpm run build` — pass

---

## 2026-06-03 - 2FA table columns prefs + period dot

- Version: `1.1.5`
- Type: Patch
- Product: P0020
- Prompt: Display prefs hide Secret column; brighter Code badge; compact secret/code; Time dot animation 30/20/10s
- Status: Draft

### Changes

- Settings → Table: toggle 2FA columns (Secret optional; Service/Code/Actions required).
- Code badge: `CopyMetaChip` cyan (matches Secret pill style, smaller).
- Time: colored dot (cyan → amber → rose pulse), no progress bar.

### Verification

- `corepack pnpm run build` — pass

### Rollback

- Revert `twofa-table-prefs`, `TwofaTableColumnsSettings`, `TwofaAccountsTable`, `hub-users-table.css`.

---

## 2026-06-03 - 2FA table: secret column + Hub copy badges

- Version: `1.1.4`
- Type: Patch
- Product: P0020
- Prompt: No uppercase column titles; 100% P0004 Users table style; secret column with note-ID copy badge
- Status: Draft

### Changes

- `hub-users-table.css`: full P0004 sync; 2FA uses `hub-users-table--twofa` (sentence-case headers).
- 2FA: Secret column — full Base32 via `CopyMetaChip` (same pattern as note ID); Code via `HubCopyBadge` (Users ID style).
- Shared `CopyMetaChip`, `HubCopyBadge`; `NoteEditorMetaStrip` imports shared chip.

### Verification

- `corepack pnpm run build` — pass

### Rollback

- Revert `TwofaAccountsTable.tsx`, `hub-users-table.css`, shared badge components.

---

## 2026-06-03 - hub-ui WorkspaceTabHeader + Cookie FAB confirm

- Version: `1.1.3`
- Type: Patch
- Product: P0020
- Prompt: Export WorkspaceTabHeader to hub-ui; smaller FAB; extension confirm before download
- Status: Draft

### Changes

- `@tool-workspace/hub-ui`: `WorkspaceTabHeader`, `buildVersionMetaItems`; sync script copies from P0020 to P0004 vendor.
- Cookie FAB: 40px, bottom-right; Download opens confirm sheet (version, ZIP, install steps) before fetch.
- Guide FAB uses `CircleHelp` icon.

### Verification

- `corepack pnpm run build` — pass

---

## 2026-06-03 - Hub-style tab headers + Cookie extension FAB

- Version: `1.1.2`
- Type: Patch
- Product: P0020
- Prompt: Standardize all tab headers like P0004 Hub; move Download Cookie to right FAB
- Status: Draft

### Changes

- Shared header chrome: tab title, session, `vX.Y.Z · release date`, center stats, Log + Settings.
- `WorkspaceHeaderActions`, `WorkspaceLogProvider`, `buildWorkspaceVersionMetaItems` (P0004 Hub pattern).
- Cookie Auto: header stats (routes / agents / vault); Download + Guide as floating round buttons (right edge).

### Verification

- `corepack pnpm run build` — pass

---

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
