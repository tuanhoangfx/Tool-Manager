# Changelog

## 2026-06-13 - Cookie extension download modal — Store + GitHub ZIP

- Version: `4.3.30`
- Timestamp: 2026-06-13 (UTC+7)
- Type: Patch
- Product: P0020

### Changes

- Download FAB modal: dual footer (Install from Chrome Web Store + Download ZIP from GitHub).
- Install steps when CWS published: Store → Link → optional GitHub ZIP + Load unpacked dev details.
- Extension build info synced to E0001 v1.1.3.

### Verification

- pending

---
## 2026-06-12 - P0020 version sync

- Version: `4.3.29`
- Timestamp: 2026-06-12 15:01 (UTC+7)
- Type: Patch
- Status: Draft

### Changes

- Align CHANGELOG with package.json v4.3.29.

### Verification

- pending

---
# Changelog - P0020-Data-Box

> **Ship keywords:** `Git P0020` | `Push P0020` | `Release P0020`  
> **Template:** `E:\Dev\Rules\templates\tool-docs\CHANGELOG_ENTRY_TEMPLATE.md`  
> **Script:** `powershell -File E:\Dev\Tool\scripts\ship-product.ps1 -Code P0020 -Keyword Push`

## 2026-06-12 - Hub-UI SSOT consolidation + dead code cleanup

- Version: `4.3.28`
- Type: Patch
- Product: P0020
- Timestamp: 2026-06-12 (UTC+7)
- Status: Verified
- Release: https://databox.infi.io.vn

### Changes

- **hub-ui SSOT:** `deployLabel`, `formatTabHeaderTimestamp`, `SchemaMode` from `@tool-workspace/hub-ui` v0.2.1; vendor full sync.
- **Cleanup:** Removed local `ui-scale`, `hide-boot-loader`, `deploy-label`, `promise-timeout`; boot via `mountHubApp` only.
- **Snapshots:** `sync-workspace-snapshots.cjs` after hub-ui catalog update.

### Verification

- `node Tool/scripts/hub-ui-parity-check.mjs --code P0020`
- `pnpm run deadcode`

---
## 2026-06-11 - Tab-load gate + Cookie virtual + Notes autosave

- Version: `4.3.27`
- Type: Patch
- Product: P0020
- Prompt: Gắn verify:tab-load vào agent-verify-gate; Cookie routes virtual ≥50; Notes autosave tabActive.
- Timestamp: 2026-06-11 13:00 (UTC+7)
- Status: Verified
- Release: https://databox.infi.io.vn

### Changes

- `agent-verify-gate.mjs`: P0020 acceptance item `tab-load-contract` (runs `agent-verify-tab-load.mjs`).
- Cookie: `useCookieRoutesVirtualWindow` + virtual table path in `CookieRoutesDirectoryTable` (threshold 50).
- Notes: debounced autosave chỉ chạy khi `tabActive`.

### Verification

- `node Tool/scripts/agent-verify-tab-load.mjs --code P0020`
- `node Tool/scripts/agent-verify-gate.mjs --code P0020 --json`

## 2026-06-11 - Workspace tab load golden pattern

- Version: `4.3.26`
- Type: Patch
- Product: P0020
- Prompt: Tab perf chuẩn hóa — Todo hub-load cache, Cookie tabActive sâu, tab-load contract gate + bump version.
- Timestamp: 2026-06-11 12:00 (UTC+7)
- Status: Verified
- Release: https://databox.infi.io.vn

### Changes

- Todo: `useCachedSupabaseQuery` → `@dev/hub-load` `createClientCache` via `createTodoQueryCache` (legacy migrate).
- Cookie: gate `useNotes`, `useCookieVaultMap`, note-title sync khi tab ẩn.
- `agent-verify-tab-load.mjs` — static gate cho chunk warm, eager mount, tabActive, virtual window.
- Session warm: todo tasks + cookie schema + 2FA vault; eager mount all tabs; prod SW chunk cache.

### Verification

- `node Tool/scripts/agent-verify-tab-load.mjs --code P0020`
- `node Tool/scripts/check-version-sync.mjs --product-root Tool/P0020-Data-Box`

## 2026-06-10 - 2FA dedupe preview modal

- Version: `4.3.25`
- Type: Patch
- Product: P0020
- Prompt: Dedupe preview modal — hiện số duplicate theo service trước khi xóa.
- Timestamp: 2026-06-10 22:02 (UTC+7)
- Status: Verified
- Release: https://databox.infi.io.vn

### Changes

- `previewTwofaDedupe` / `previewTwofaDedupeCombined`: scan cloud + local trước khi xóa.
- `TwofaDedupePreviewModal`: breakdown theo service (icon + bar + count), confirm trước khi chạy.
- Không có duplicate → toast ngay, không mở modal.

### Verification

- `vitest` twofa — 54/54 pass

## 2026-06-10 - 2FA dedupe cloud + toolbar UX

- Version: `4.3.24`
- Type: Patch
- Product: P0020
- Prompt: Dedupe xuống row 2; icon trực quan; bỏ vault synced badge khi auto sync; cloud dedupe theo identity.
- Timestamp: 2026-06-10 21:55 (UTC+7)
- Status: Verified
- Release: https://databox.infi.io.vn

### Changes

- `dedupeTwofaCloudByIdentity`: tombstone duplicate rows trên Supabase (giữ `updatedAt` mới nhất).
- `dedupeNow`: cloud dedupe → local dedupe → full resync.
- `TwofaBulkActionBar`: Dedupe cạnh Add/Edit/Delete, icon `CopyMinus`.
- `TwofaFilterToolbar`: ẩn badge khi vault ok/idle; chỉ hiện khi syncing, lỗi, hoặc connecting.

### Verification

- `vitest` twofa — 53/53 pass

## 2026-06-10 - 2FA cross-browser count fix (paginated cloud id set)

- Version: `4.3.23`
- Type: Patch
- Product: P0020
- Prompt: Kiểm tra tại sao total 2FA khác nhau giữa browsers dù cùng tài khoản.
- Timestamp: 2026-06-10 21:30 (UTC+7)
- Status: Verified
- Release: https://databox.infi.io.vn

### Changes

- `fetchCloudRowSets`: paginate `id, deleted_at` (Supabase default 1000-row cap caused ~2700 rows to be misclassified as local-only pending).
- `runTwofaCloudSync`: full boot pull is cloud-only (no stale per-browser extras); skip bulk `pushTwofaLocalOnly` on full sync.
- `pushTwofaLocalOnly`: use reconciled snapshot instead of pre-sync local ref.
- `twofa-cloud-sync.test.ts`: regression tests for pending-upload classification.

### Verification

- `vitest` twofa-cloud-sync + twofa-cloud-delta — 5/5 pass

## 2026-06-10 - 2FA search UX + cross-browser vault sync

- Version: `4.3.21`
- Type: Patch
- Product: P0020
- Prompt: Deploy P0020 — bỏ auto Add khi search rỗng; fix realtime sync account giữa browsers (pattern Cookie Auto).
- Timestamp: 2026-06-10 15:30 (UTC+7)
- Status: Verified
- Release: https://databox.infi.io.vn

### Changes

- `TwofaManagerScreen`: không tự mở inline Add khi search không có kết quả; chỉ Add thủ công.
- `useTwofaAccounts`: full pull mỗi boot khi đã auth; reconcile realtime; debounce session sync; `loadDedupedAccounts` scoped đúng user.
- `ensure-twofa-auth` / `prefetch-twofa-auth`: cache session khi restore từ Supabase persistence.
- `TwofaFilterToolbar`: badge Vault idle → "Connecting vault…" + auto-retry full sync sau 10s.
- `scripts/e2e-twofa-realtime.mjs`: E2E insert → count +1 → tombstone → restore.
- `predev`: sync `vendor/hub-ui` qua `sync-hub-ui-vendor.cjs`.

### Verification

- `vitest` 2FA — 50/50 pass
- `node scripts/e2e-twofa-realtime.mjs` — pass
- Browser local: search không auto-add; bulk import OK

## 2026-06-09 - Cookie FAB one-click latest extension download

- Version: `4.3.16`
- Type: Patch
- Product: P0020
- Prompt: Push Cookie Auto + E0001 — Download FAB auto-download latest GitHub ZIP.
- Timestamp: 2026-06-09 18:15 (UTC+7)
- Status: Verified
- Release: https://databox.infi.io.vn

### Changes

- `CookieExtensionFab`: one click → `fetchLatestExtensionRelease` + ZIP download (aligned with header CTA; no confirm modal).
- `extensionBuildInfo` synced to E0001 **v1.1.2** (`downloadVersion` matches GitHub `releases/latest`).

## 2026-06-09 - E0001 Chrome Web Store install + privacy page

- Version: `4.3.16`
- Type: Patch
- Product: P0020
- Prompt: Chrome Web Store link kaaadageakdandpobcofplmfbjfjabdk; Cookie Auto Store install UI.
- Timestamp: 2026-06-09 14:00 (UTC+7)
- Status: Verified
- Release: https://databox.infi.io.vn

### Changes

- Cookie extension: `EXTENSION_CHROME_WEB_STORE_URL`, 2-step Store install + unpacked fallback.
- Header/modal CTA opens Chrome Web Store when published.
- Public privacy page `public/e0001-privacy.html`.

Version: 4.3.15 → 4.3.16

## 2026-06-09 - 2FA Browser code + bulk dual-format deploy

- Version: `4.3.15`
- Type: Patch
- Product: P0020
- Prompt: Browser field 0100/0101; bulk form mới/cũ; post-deploy manifest + smoke contract.
- Timestamp: 2026-06-09 09:00 (UTC+7)
- Status: Verified
- Release: https://databox.infi.io.vn

### Changes

- 2FA: optional `browser` field (4-digit code), table column, cloud sync + Supabase migration.
- Bulk parser: `Browser|Platform|ID|Pass|2FA` alongside legacy `Platform|ID|2FA` formats.
- `post-deploy-manifest.mjs` stamps `latestPublished` v4.3.15 after production verify.
- Browser smoke: `p0020-twofa-bulk-browser` step (paste → preview → Import enabled).

Version: 4.3.14 → 4.3.15

## 2026-06-08 - Deploy manifest sync, CHANGELOG Timestamp gate, zoom default 90%

- Version: `4.3.14`
- Type: Patch
- Product: P0020
- Prompt: latestPublished on Deploy; Timestamp validate; Size default 90% all tools.
- Timestamp: 2026-06-08 15:30 (UTC+7)

### Changes

- Workspace ship: `post-deploy-manifest.mjs` stamps `latestPublished` after smoke pass.
- `check-version-sync` + `auto-commit`: require/stamp CHANGELOG `- Timestamp:` (P0004 golden).
- Hub UI default zoom 90% (`HUB_USER_ZOOM_DEFAULT`, `--hub-user-zoom-pct`).

Version: 4.3.13 → 4.3.14

## 2026-06-08 - Header timestamp parity + viewport fill (P0004 golden)

- Version: `4.3.13`
- Type: Patch
- Product: P0020
- Prompt: Tab header missing `hh:mm dd/mm/yy`; Notes shell gap vs local on production.
- Timestamp: 2026-06-08 15:05 (UTC+7)

### Changes

- `app-release.ts`: CHANGELOG Timestamp + `manifestUpdatedAt` fallback; `formatTabHeaderTimestamp` (`hh:mm dd/mm/yy`) like P0004.
- `data-box-layout.css` + `WorkspaceApp`: `100dvh` min-height so shell fills viewport after deploy.

Version: 4.3.12 → 4.3.13

## 2026-06-08 - Vercel deploy: vendor hub-ui + lockfile sync

- Version: `4.3.12`
- Type: Patch
- Product: P0020
- Prompt: Fix production deploy — restore vendor/hub-ui for standalone Vercel build; sync pnpm-lock.yaml.
- Timestamp: 2026-06-08 14:30 (UTC+7)

### Changes

- `package.json`: `file:./vendor/hub-ui` + `file:./vendor/hub-identity` (replace `workspace:*`).
- `vite.config.ts`: resolve aliases to `vendor/` paths for CI.
- Full `packages/hub-ui` fan-out to `vendor/hub-ui`; lockfile aligned for frozen install.

Version: 4.3.11 → 4.3.12

## 2026-06-07 - Hub header: Log label + center-stats scrollbar

- Version: `4.3.11`
- Type: Patch
- Product: P0020

### Changes

- Shared hub-ui: hide center-stats scrollbar track (P0004 golden parity).

Version: 4.3.10 → 4.3.11

## 2026-06-07 - Cookie modal About + route sort

- Version: `4.3.11`
- Type: Patch
- Product: P0020
- Prompt: Remove redundant Sync label in modal About; Note ID CopyMetaChip; Cookie Auto sort (Edited/Created/Platform/A–Z).
- Status: Draft

### Changes

- `HubRouteAboutSummary`: drop Sync chip; Note ID via `CopyMetaChip` + `Hash` icon (P0004 parity).
- `cookie-list-prefs` + `CookieSortExtras`: URL `csort` — Edited (sync time), Created, Platform, A–Z.
- `CookieAutoSyncTable`: apply `sortCookieAutoRows` after filter (was binding storage order only).

### Verification

- Modal About: only Note ID chip; TM sync id remains on route table/header.
- Settings → Route sort changes card/table order live.

---

## 2026-06-07 - Cookie Detail: restore Sync/Load/permission columns

- Version: `4.3.10`
- Type: Patch
- Product: P0020
- Prompt: Ship Cookie Detail — restore Sync, Loaded, Load/Sync permission columns; horizontal scroll; hub-ui expanded layout.
- Status: Draft

### Changes

- `HubRouteAccessDirectoryTable`: refactor to `HubDataTable` + pager; `columnLayout="expanded"` (Synced · Loaded · Load · Sync · Route · Expires).
- `hub-route-access-table-meta`: expanded vs compact column builders; modal wrap `overflow-x-auto` + `min-width: 44rem`.
- `CookieRouteAccessTable`: wired separate sync/load timestamp + permission icon columns (golden pre-merge layout).

### Verification

- Browser: Cookie Auto → route detail Access — 9 cols visible, horizontal scroll if narrow.
- Kalodata Shared 3: owner + 3 members load without overlap.

---

## 2026-06-07 - Settings: lock F1 hub filter option picker

- Version: `4.3.8`
- Type: Patch
- Product: P0020
- Prompt: Lock F1 — hub-ui filter dropdown; strip Save behavior chrome; purge design template after lock.
- Status: Draft

### Changes

- `settings-option-filter.tsx`: shared `SettingsOptionFilter` wrapper (Design F1 locked).
- `NotesSortExtras`, `NotesSaveBehaviorSettings`: `HubFormFieldLabel` outside; filter trigger value-only + option icon (`triggerFormat="value"`).
- `design-registry.ts`: `SETTINGS_OPTION_PICKER_DESIGN_LOCK = "F1"`.
- Design gate: deleted `settings-segmented/*` preview + CSS; template tab → no active reviews.

### Verification

- Browser: Notes → Settings → General — List sort / Autosave / Version interval open hub filter panel.
- System → Design Template — empty state, lock badge only.

## 2026-06-07 - 2FA: toasts, Dedupe toolbar, edit replace confirm

- Version: `4.3.8`
- Type: Patch
- Product: P0020
- Prompt: Toast Added/Replaced, nút Dedupe toolbar, confirm khi edit trùng identity.
- Status: Draft

### Changes

- `twofa-toast-messages.ts`: toast copy for add, import, dedupe, update.
- `TwofaManagerScreen`: pushToast on save/import/dedupe; edit conflict → `TwofaConfirmDialog`.
- `TwofaFilterToolbar`: **Dedupe** button scans vault and removes duplicates.
- `TwofaConfirmDialog`: optional `danger` + custom icon for non-delete confirms.
- `useTwofaAccounts`: `dedupeNow()` + `add()` returns `{ ok, replaced }`.

### Verification

- `vitest run twofa-upsert-accounts.test.ts`
- Browser: `:5177/twofa` — toast, Dedupe, edit replace confirm

## 2026-06-07 - 2FA: dedupe on import, replace existing entries

- Version: `4.3.7`
- Type: Patch
- Product: P0020
- Prompt: Lọc trùng 2FA — tự động thay thế bằng dữ liệu mới nếu cùng identity (xóa bản cũ).
- Status: Draft

### Changes

- `twofa-identity.ts`, `twofa-upsert-accounts.ts`: identity key `(service, account)` or secret-only; upsert replaces old row.
- `useTwofaAccounts`: `add`/`addMany`/`update` dedupe; load + cloud sync collapse duplicates.
- `twofa-cloud-sync`: handle unique `(user_id, service, account)` conflict on upsert.
- `TwofaAddForm`: bulk import summary shows new vs replaced counts.

### Verification

- `vitest run twofa-upsert-accounts.test.ts`

## 2026-06-07 - 2FA add modal: fixed shell height (Single/Bulk tabs)

- Version: `4.3.6`
- Type: Patch
- Product: P0020
- Prompt: Cố định kích thước modal Add 2FA khi đổi tab Single/Bulk.
- Status: Draft

### Changes

- `twofa-add-form.css`: `--twofa-add-modal-body-h` locks body; TOC bulk slot reserved; panel swap via `display:none`.
- `TwofaAddForm`: both tab panels in DOM; TOC sub-rail placeholder on Single tab.

### Verification

- Browser: `:5177/twofa` — Add modal same size Single ↔ Bulk

## 2026-06-07 - 2FA add modal: restore Single/Bulk tabs

- Version: `4.3.5`
- Type: Patch
- Product: P0020
- Prompt: Quay lại tab Single như cũ (thay vì một trang scroll tất cả section).
- Status: Draft

### Changes

- `TwofaAddForm`: TOC tab Single · Bulk; main đổi theo tab; footer Add account / Import theo tab.
- Bulk tab: sub-TOC scroll-spy Paste · File · Preview (giữ từ bản trước).

### Verification

- Browser: `:5177/twofa` — Add modal tab Single/Bulk

## 2026-06-07 - 2FA add modal: single scroll page (fixed shell)

- Version: `4.3.4`
- Type: Patch
- Product: P0020
- Prompt: Chuẩn modal Add 2FA — cùng một màn, không tách Single/Bulk đổi kích thước.
- Status: Draft

### Changes

- `TwofaAddForm`: bỏ tab Single/Bulk; tất cả section (Credentials · Paste · File · Preview) trên một trang scroll; TOC scroll-spy như Cookie Add route.
- Footer add mode: Cancel · Import · Add account (cố định, không đổi theo tab).
- `twofa-add-toc.ts` + CSS min-height shell cố định.

### Verification

- Browser: `:5177/twofa` — Add modal kích thước ổn định khi TOC jump giữa sections

## 2026-06-07 - 2FA modal: remove hint labels + Hub form fields + auth TOC

- Version: `4.3.3`
- Type: Patch
- Product: P0020
- Prompt: Xóa nhãn giải thích modal 2FA; ok 1 2 3 (HubFormFieldLabel, HubAuthGate TOC, Bulk sections).
- Status: Draft

### Changes

- `TwofaAddForm`: drop subtitle/hint/example paragraphs; `HubFormFieldLabel` + `HubToolDetailSection` (Credentials · Paste · File · Preview); bulk TOC scroll-spy rail.
- `HubAuthGateModal` (hub-ui): Sign In / Sign Up → left `hub-toc-nav`; field labels via `HubFormFieldLabel`; no subtitle/hints.
- `NotesAuthGate`: remove modal subtitle constant.

### Verification

- Browser: `:5177/twofa` Add modal — no hint lines; Bulk sections + TOC spy

## 2026-06-07 - 2FA add modal: Hub UI TOC layout

- Version: `4.3.2`
- Type: Patch
- Product: P0020
- Prompt: Chuẩn hóa nhập 2FA modal theo chuẩn modal chung Hub UI (Header · TOC · main · footer).
- Status: Draft

### Changes

- `TwofaAddForm`: Single/Bulk tabs move to left `hub-toc-nav` TOC rail; main column holds subtitle + form; footer actions unchanged.
- Edit mode stays compact single-column (no TOC); add mode uses `size="detail"` with `HubToolDetailModal` TOC layout.

### Verification

- Browser: `:5177/twofa` — Add accounts modal TOC + tab switch + footer actions

## 2026-06-06 - NotesAuthGate → shared HubAuthGate

- Version: `4.3.1`
- Type: Patch
- Product: P0020
- Prompt: Refactor P0020 NotesAuthGate to shared hub-ui HubAuthGate (option 1 from hub auth shared work).
- Status: Draft

### Changes

- `NotesAuthGate`: thin wrapper around `HubAuthGate` + `extraInlineActions` (Offline mode) and `signInWorkspaceDual` on submit.
- Vendor sync: `hub-identity` (`HubSessionLike` extended), `hub-ui` auth stack including `HubFullUserAccountModal`.
- `pnpm install` refresh after vendor sync (display-prefs modules).

### Verification

- `pnpm build` P0020 — passed (tsc, 106 tests, vite)

## 2026-06-06 - Settings modal: no row hover, focus-visible only

- Version: `4.2.5`
- Type: Patch
- Product: P0020
- Prompt: Remove gray hover on Settings modal checkbox/segmented rows; keep tooltips and keyboard focus ring.
- Commit: `fbeeb10`
- Status: Committed

### Changes

- `ToggleRow` / `TabButton`: no hover background in modal content; `hub-settings-toggle` + `focus-visible` outline.
- `hub-modal.css`: suppress hover on `.hub-tool-detail-section__body` buttons; sync `primitives.tsx` via package canonical in vendor sync.
- Notes Settings: List sort + folder chips without hover chrome.

### Verification

- Pre-commit parity + hub-ui-css-check — passed

## 2026-06-06 - 2FA add hub-modal only + auth-gate CSS in hub-ui

- Version: `4.2.4`
- Type: Patch
- Product: P0020
- Prompt: Remove TwofaAddForm embedded panel; search-no-match opens HubToolDetailModal; move auth-gate form CSS to packages/hub-ui hub-auth-gate.css.
- Commit: `8f9a95e`
- Status: Committed
- Release: (after Release keyword only — GitHub release URL)

### Changes

- `TwofaAddForm`: drop `embedded` variant; always `HubToolDetailModal`; search empty → auto-open modal with prefilled draft.
- `hub-auth-gate.css` canonical in `packages/hub-ui`; P0020 imports vendor copy; delete local `theme/hub-auth.css`.
- Add `auth-inline-btn--ghost` to shared auth-gate CSS.

### Verification

- `pnpm build` — passed
- Browser: `:5177/twofa` — search no-match opens Add account modal; close clears query

### Rollback

```powershell
cd E:\Dev\Tool\P0020-Data-Box
git checkout v4.2.3
```

Version: 4.2.3 → 4.2.4

## 2026-06-06 - HubToolDetailModal standardization across P0020 modals

- Version: `4.2.3`
- Type: Patch
- Product: P0020
- Prompt: Migrate all P0020 modals to golden HubToolDetailModal shell (Settings/Log, Cookie, 2FA, User, Auth); sync hub-ui vendor; prune legacy auth-gate portal CSS.
- Commit: `ae12992`
- Status: Committed
- Release: (after Release keyword only — GitHub release URL)

### Changes

- Settings/Log: `HubUsageLogPanel` + `HubHeaderPanelButton` modal detail with TOC scroll-spy.
- Cookie: Add route, Download FAB, route detail → `HubToolDetailModal` + `sectionIds`.
- 2FA/Notes: Add, Confirm, folder form, User sidebar, NotesAuthGate → compact hub modal shell.
- CSS: remove dead `route-detail-modal-v1`, cookie modal width overrides, auth-gate portal shell (root/backdrop/close).
- Vendor: sync `packages/hub-ui` → P0020 (TOC spy, chart-key-migrate, HubUsageLogPanel).

### Verification

- `pnpm build` — passed (tsc, vitest, vite)
- Browser: `:5177` — User, Settings, Cookie Add/Download, 2FA Add modals smoke pass

### Rollback

```powershell
cd E:\Dev\Tool\P0020-Data-Box
git checkout v4.2.1
```

Version: 4.2.2 → 4.2.3

## 2026-06-06 - 2FA Design V1 lock + hub-ui copy affordance standard

- Version: `4.2.1`
- Type: Minor
- Product: P0020
- Prompt: Lock V1 Platform Mirror; widen Account / narrow Secret; copy check icon beside (no "Copied" label); HubCopyBadge + CopyMetaChip in hub-ui.
- Commit: `88a4c2b`
- Status: Committed
- Release: (after Release keyword only — GitHub release URL)

### Changes

- 2FA table: Design V1 production (`twofa-copy-cells.tsx`) — Account/Password/Secret/Code plain copy + Check 10px beside.
- Column widths: Account 17%, Secret 14%; Secret drops indigo chip border (mono text like V1).
- `HubCopyBadge` + `CopyMetaChip` canonical in `packages/hub-ui`; P0020 re-exports from `@tool-workspace/hub-ui`.
- 2FA charts: service brand icons, Account identity KPI; fill validation secret-only; Design Template cleared (V1 locked).
- Cookie modals: `HubToolDetailModal` + `HubModalFilterField`; vendor hub-ui sync (form fields, keyboard panel).
- `UI_PATTERNS.md`: Copy affordance section; `ui-patterns.catalog.json` adds `HubCopyBadge` to directory composed.

### Verification

- `corepack pnpm build` — passed (tsc, 103 vitest, vite)
- Browser: `http://127.0.0.1:5177/twofa` — V1 cells, copy check beside, no "Copied" label

### Rollback

```powershell
cd E:\Dev\Tool\P0020-Data-Box
git checkout v4.1.5
```

Version: 4.1.7 → 4.2.1

## 2026-06-05 - Filter parity Phase A: faceted counts + inline trailing

- Version: `4.1.5`
- Type: Patch
- Product: P0020

### Changes

- `enrichFilterDefs` re-export via `src/lib/filter-option-counts.ts`.
- Cookie routes, 2FA, Notes, Route Access: faceted option counts on FilterBar dropdowns.
- CookieRouteMembers inline FilterBar: `toolbar`/`row2Actions` → `trailing` (P0004 golden).

Version: 4.1.4 → 4.1.5

## 2026-06-05 - P0020 filters aligned with P0004 Hub golden pattern

- Version: `4.1.4`
- Type: Patch
- Product: P0020
- Prompt: Clone filter style từ P0004 Hub sang toàn bộ P0020.
- Commit: pending
- Status: Draft
- Release: (after Release keyword only — GitHub release URL)

### Changes

- `setupHubUi`: wire `configureFilterIcons` → `badge-registry` (FilterBar icons for Cookie / Notes / 2FA / Access).
- Replace local `HubFilterSingleSelect` with vendor `HubSingleFilterDropdown` in cookie modals.
- Extend `badge-registry` filter keys: `folder`, `service`, `usage`, `role`, `permission`, `note`, `access`.
- `filter-dropdown-ui` + `HubTimeRangeSelect` + `NotesNoteFolderFilter`: P0004 trigger/panel chrome + portal panel.
- `CookieRouteMembers` nested FilterBar → `layout="inline"` (same as P0004 UserAccessModal).

### Verification

- `npm run build` — passed

---

## 2026-06-05 - Cookie Auto — TOC route modals + filter layer fix (P0020)

- Version: `4.1.3`
- Type: Patch
- Product: P0020
- Prompt: Sửa Layer Filter; chuẩn TOC + icon menu như modal Download; xóa Add by Note ID; giảm khoảng cách header/main.
- Commit: pending
- Status: Draft
- Release: (after Release keyword only — GitHub release URL)

### Changes

- `HubFilterSingleSelect`: portal dropdown to `document.body` with fixed position — fixes Access filter clipped inside modal scroll.
- `CookieRouteFormModal`: TOC sidebar + `CookieRouteModalSection` (same layout as extension download modal).
- Add / Share / Edit route modals: section nav with emoji icons; header compact (icon + title only).
- Remove "Add by Note ID" tab and `onJoinByNoteId` join flow from cookie route UI.

### Verification

- `npm run build` — passed

---

## 2026-06-05 - Cookie Auto — Standardize route modals (P0020)

- Version: `4.1.2`
- Type: Patch
- Product: P0020
- Prompt: Chuẩn hóa Modal Add route, Share, Edit theo modal Download (HubModalFrame + nút X viền).
- Commit: pending
- Status: Draft
- Release: (after Release keyword only — GitHub release URL)

### Changes

- `CookieRouteFormModal`: migrate from auth-gate shell to `modal-backdrop--tool-detail` + `HubModalFrame` + centered confirm footer (same as extension download).
- `CookieRouteMembers` Edit access: inline panel → full modal overlay.
- Add route / Share / Edit / Delete route modals inherit shared styling via `CookieRouteFormModal`.

### Verification

- `pnpm -C E:\Dev\Tool\P0020-Data-Box build` — passed

### Rollback

```powershell
cd E:\Dev\Tool\P0020-Data-Box
git checkout v4.1.1
```

---

## 2026-06-05 - Data Box 4.1 — Hub shell + Cookie Auto download (P0020)

- Version: `4.1.1`
- Type: Major
- Product: P0020
- Prompt: Release P0020 — official ship after Deploy verify; hub-ui shell, Cookie download modal, shared edge close.
- Commit: `79784a4`
- Status: Verified
- Release: https://github.com/tuanhoangfx/Tool-Manager/releases/tag/v4.1.1

### Changes

- Major release: unified hub-ui vendor stack, workspace directory screen, Notes/2FA/Cookie tab prefs and header metrics.
- Cookie Auto extension download: ZIP fallback, modal polish, `HubModalFrame` edge close pattern.
- Production verified at https://databox.infi.io.vn after Vercel deploy.

### Verification

- `pnpm build` · Deploy smoke OK · production 200

### Rollback

```powershell
cd E:\Dev\Tool\P0020-Data-Box
git checkout v3.3.1
```

---

## 2026-06-05 - Data Box 3.3 — Hub shell sync + Cookie download modal (P0020)

- Version: `3.3.1`
- Type: Minor
- Product: P0020
- Prompt: Push P0020 — hub-ui vendor sync, Cookie Auto download modal polish, shared modal close, Notes/2FA/workspace shell alignment.
- Commit: `7b6014d`
- Status: Committed
- Release: (after Release keyword only — GitHub release URL)

### Changes

- Cookie Auto: extension download modal — release ZIP fallback when latest has no asset; purple GitHub link; edge close button; footer without divider; confirm download CTA centered with icon animation.
- Hub UI vendor: `HubModalFrame` + `HubModalCloseButton` + `hub-modal.css`; migrate tool-detail modals to shared edge close pattern.
- Workspace shell: Notes/2FA/Cookie tab prefs, directory screen, header metrics, route access skeleton; remove duplicate local hub-ui stubs in favor of `@tool-workspace/hub-ui`.

### Verification

- `pnpm -C E:\Dev\Tool\P0020-Data-Box build` — passed

### Rollback

```powershell
cd E:\Dev\Tool\P0020-Data-Box
git checkout v3.2.4
```

---

## 2026-06-05 - Data Box 3.1.9 — Remove Notes Comfort/Compact toggle (P0020)

- Version: `3.1.9`
- Type: Patch
- Product: P0020
- Prompt: Xóa nhãn Comfort/Compact (không cần thiết)
- Status: Verified
- Release: https://github.com/tuanhoangfx/Tool-Manager/releases/tag/v3.1.9

### Changes

- Gỡ `NotesViewToggle` khỏi toolbar Notes; xóa `NotesViewToggle.tsx`, `NotesDensityExtras.tsx` (không dùng).
- List density vẫn đọc từ `ndens` URL nếu có; mặc định comfort.

---

## 2026-06-05 - Data Box 3.1.8 — Notes sort in Settings + 2FA KPI tab fix (P0020)

- Version: `3.1.8`
- Type: Patch
- Product: P0020
- Prompt: Sort label vào Settings; sửa KPI 2FA nhảy về Notes
- Status: Verified

### Changes

- Bỏ `HubSortLabel` trên toolbar Notes; sort chỉ trong Settings → General (`NotesSortExtras`).
- `patchHubListPrefs` → event `hub-list-prefs-change` (không synthetic `popstate`).
- Notes auto-pick/`navigate` chỉ khi tab Notes active.
- 2FA KPI/charts URL: `2kpi` / `2charts` (tách khỏi Cookie `kpi`).

### Verification

- `pnpm build` · 2FA Settings KPI không đổi tab · Notes sort trong Settings

---

## 2026-06-05 - Data Box 3.1.7 — Notes inbox rail width (P0020)

- Version: `3.1.7`
- Type: Patch
- Product: P0020
- Prompt: Tăng kích thước chiều ngang list inbox Notes
- Status: Verified

### Changes

- `--notes-rail-width: 22rem` (trước `15.5rem`) — inbox list rộng hơn, title/email ít bị cắt.

### Verification

- Notes tab · list inbox ~22rem, editor vẫn flex phần còn lại

---

## 2026-06-05 - Data Box 3.1.6 — Route detail access table load flash (P0020)

- Version: `3.1.6`
- Type: Patch
- Product: P0020
- Prompt: Route Details — bảng user nháy, hiện sau một lúc
- Status: Verified

### Changes

- People & access: skeleton thay vì bảng 1 dòng owner rồi nhảy sang đủ members.
- Chờ xong members + publish status + activity một lần (`accessReady`); bỏ fetch activity lặp khi Realtime SUBSCRIBED.
- Route column không flip Missing → Published khi publish status chưa về.

### Verification

- `pnpm build` · mở Route detail → Access không nháy hàng

---

## 2026-06-05 - Data Box 3.1.5 — 2FA KPI/charts + remove cloud label (P0020)

- Version: `3.1.5`
- Type: Patch
- Product: P0020
- Prompt: 2FA KPI/Charts mặc định như tab khác; xóa nhãn Cloud vault
- Status: Verified

### Changes

- `twofa-display-prefs`: KPI + chart defs (mặc định bật hết); Display prefs tab 2FA có KPI/Charts.
- `twofa-aggregates` + `TwofaManagerScreen`: đẩy KPI/charts lên `WorkspaceDirectoryScreen` (URL `kpi`/`charts`).
- Xóa dòng `Cloud vault: Synced (delta)` trên tab 2FA.

### Verification

- `pnpm build` · `/twofa` shell KPI + charts band

---

## 2026-06-05 - Data Box 3.1.4 — 100% Hub directory stack (P0004)

- Version: `3.1.4`
- Type: Patch
- Product: P0020
- Prompt: Clone 100% spacing/layer Hub — searchbar, KPI, chart, main; xóa layer trùng
- Status: Verified

### Changes

- `WorkspaceDirectoryScreen` = `HubDirectoryScreen` (giống `HubListPage` P0004) — bỏ `HubTabBody` + `HubTabScreenBody` lồng nhau.
- Cookie/2FA: KPI/charts/section rule qua `WorkspaceSearchContext`; body chỉ còn list/table.
- `hub-tab-chrome-stack` + flex gap (không `hub-chrome-sticky-gap`); sync `KpiStrip` 1 hàng + CSS `--hub-kpi-*`.
- `hub-main` scroll như P0004 (`overflow-y-auto`); chỉ Notes giữ `hub-main--notes`.
- Xóa override `.hub-chrome-sticky` / `hub-main--tab` trùng trong `data-box-layout.css`.

### Verification

- `http://127.0.0.1:5177/cookie` · `pnpm build`

---

## 2026-06-05 - Data Box 3.1.3 — esbuild recover + 2FA Hub body

- Version: `3.1.3`
- Type: Patch
- Product: P0020
- Prompt: Sửa lỗi esbuild overlay; ok 1 2 3 (2FA HubTabScreenBody, sales-shell cleanup, dev recover)
- Status: Verified

### Changes

- `dev:recover` + `scripts/dev-recover.cjs` — kill :5177, clear `.vite`, restart (P0004 parity).
- `vite.config`: `optimizeDeps` + `esbuild.target`; bỏ manualChunks notes↔twofa (circular chunk).
- Tab **2FA**: `HubTabScreenBody` + section rule **Accounts**.
- Xóa duplicate `sales-shell/*` (FilterBar, AppTabHeader, KPI, charts…) — chỉ re-export `@tool-workspace/hub-ui`.

### Verification

- `pnpm dev:recover` then `http://127.0.0.1:5177/twofa`
- `corepack pnpm build`

---

## 2026-06-05 - Data Box 3.1.2 — Hub UI chrome parity (P0004)

- Version: `3.1.2`
- Type: Patch
- Product: P0020
- Prompt: Chuẩn hóa header/search/KPI/chart spacing giống tab Hub P0004; dùng chung hub-ui stack
- Status: Verified

### Changes

- `WorkspaceScreenChrome` + `NotesHubChrome`: `HubTabChrome` / `HubTabBody` (golden P0004 stack) thay sticky thủ công + `pt-5`.
- `CookieAutoSyncTable`: `HubTabScreenBody` + `HubTabSectionRule` cho KPI/charts/Routes list.
- `sales-shell/index.ts`: re-export shell từ `@tool-workspace/hub-ui`; sync vendor `hub-shell-layout.css` (`--hub-chrome-content-gap`).
- Toolbar controls: `h-[var(--hub-control-h)]` thay `h-[34px]`.
- Bootstrap: `setupHubUi()` + `configureHubChromePrefs` từ URL (`hpin`/`spin`).

### Verification

- `corepack pnpm build` (P0020-Data-Box)

---

## 2026-06-05 - Data Box 3.1 — cookie routes, access, public share

- Version: `3.1.1`
- Type: Major
- Product: P0020
- Prompt: Release P0004, P0020, E0001 — cookie route modals, member activity, public share
- Commit: `12d7317`
- Status: Verified
- Release: https://github.com/tuanhoangfx/Tool-Manager/releases/tag/v3.1.1

### Changes

- Cookie route Add/Share/Edit modals: P0004 auth-gate shell, field icons, `HubFilterSingleSelect` (search + checkbox) for Note and Access.
- People & access: FilterBar layout, bulk Share/Edit/Delete, Load/Sync columns, realtime activity poll.
- Extension pairing: route activity RPCs use user JWT; migrations for member `synced_at`, nullable `last_load_at`.
- Public share: token URLs render editor without login; share popover Save/Cancel only.
- Notes share 3-level + `share_can_edit`; removed legacy cookie agent/vault UI sections.

### Verification

- `corepack pnpm build`
- `verify-production-smoke.mjs` on databox.infi.io.vn
- Cookie tab: Add route filter dropdown; Route details member Load after extension reload

### Rollback

- Revert to `v2.3.24` and prior Supabase migrations if needed

---

## 2026-06-05 - Public share route + editor shell + share modal Save/Cancel

- Version: `2.3.24`
- Type: Patch
- Product: P0020
- Prompt: Share link không cần login; UI xem riêng; modal share Save/Cancel, không autosave
- Status: Draft

### Changes

- Redirect `/notes?token=…` and legacy URLs → `/?screen=share&token=…`; render `PublicShareScreen` without sidebar/auth gate.
- Public share uses `notes-editor` shell (title + body) like workspace editor.
- Share popover: draft Only me/View/Edit + password; **Save** / **Cancel** only (no auto-save on toggle).

### Verification

- Open `https://databox.infi.io.vn/notes?token=…` in incognito → shared note editor, no Sign in.
- Share menu: change level → Save applies; Cancel reverts.

### Rollback

- Revert commit; share URL helpers in `shareUtils.ts`.

---

## 2026-06-05 - Note share syntax fix + share_can_edit migration applied

- Version: `2.3.23`
- Type: Patch
- Product: P0020
- Prompt: Sửa lỗi Vite `??` với `||`; tự chạy migration share 3 cấp trên Supabase; rule tự apply SQL
- Status: Draft

### Changes

- Fixed `NotesWorkspaceScreen.tsx` slug expression (parens for `??` + `||`) — dev server compiles again.
- Applied `20260605120000_note_share_can_edit.sql` on `bklxcjrkhrevdcqjscku` via Management API (`apply-note-share-can-edit-api.mjs`).
- Workspace rules: agent must run P0020 Supabase migrations when token exists (no Dashboard paste prompt).

### Verification

- `node scripts/apply-note-share-can-edit-api.mjs` → OK
- Reload `http://127.0.0.1:5177/notes`

### Rollback

- `git checkout` previous tag or revert commit; SQL rollback: drop `share_can_edit`, restore prior `note_public_share_get`.

---

## 2026-06-04 - Route Details Load column (E0001 JWT fix)

- Version: `2.3.21`
- Type: Patch
- Product: P0020 + E0001 `0.5.100`
- Prompt: Member Load OK trên extension nhưng People & access Load vẫn `—`
- Status: Draft

### Changes

- Root cause: extension gọi `cookie_route_record_load` bằng **anon JWT** → `auth.uid()` null → bảng `cookie_route_user_activity` trống.
- Hub: fuzzy match email member ↔ activity; SQL `cookie_route_activity_list` domain filter linh hoạt.

---

## 2026-06-04 - Per-user Sync column + SQL applied on Supabase

- Version: `2.3.20`
- Type: Patch
- Product: P0020 (+ E0001 `0.5.98`)
- Prompt: Sync hàng loạt 23:09; User acc không đồng bộ dù Sync cookie OK
- Status: Draft

### Changes

- Applied `APPLY_NOTE_SYNC_TOUCH_FLAG.sql` on project `bklxcjrkhrevdcqjscku` (Management API).
- People & access **Sync** column uses `notes.synced_at`, not vault `updated_at`.
- Realtime refresh on `cookie_route_user_activity` for per-user Sync/Load.

Version: `2.3.19` → `2.3.20`

---

## 2026-06-04 - Stop mass synced_at without manual Sync

- Version: `2.3.19`
- Type: Patch
- Product: P0020 (+ E0001 `0.5.97`)
- Prompt: Vẫn sync hàng loạt dù không thực hiện sync
- Status: Draft

### Changes

- SQL: `note_sync_cookies*` only sets `synced_at` when `p_touch_synced_at = true` (apply `supabase/APPLY_NOTE_SYNC_TOUCH_FLAG.sql`).
- E0001 manual Sync passes `p_touch_synced_at` + `bindingKey` per route.

Version: `2.3.18` → `2.3.19`

---

## 2026-06-04 - Sync time realtime aligned with extension

- Version: `2.3.18`
- Type: Patch
- Product: P0020 (+ E0001 `0.5.96`)
- Prompt: Thời gian sync Cookie Auto vs Extension không đồng bộ realtime; giờ sync đổi đồng loạt
- Status: Draft

### Changes

- Route card/list sync row: `notes.synced_at` only (never vault `updated_at`).
- Notes cookie realtime debounce 800ms → 400ms for faster hub refresh after extension Sync.

Version: `2.3.17` → `2.3.18`

---

## 2026-06-03 - Sync time manual-only + remove Ready badge

- Version: `2.3.17`
- Type: Patch
- Product: P0020 (+ E0001 `0.5.95`)
- Prompt: Giải thích Options Sync; xóa Ready searchbar; confirm sync chỉ từ extension route
- Status: Draft

### Changes

- Route card sync row: only `notes.synced_at` (RPC after manual extension Sync).
- Cookie toolbar: removed **Ready** schema badge from searchbar.
- E0001 popup Synced column: only `pushedAt`; Options “Sync now” shows per-route hint (no bulk).

Version: `2.3.16` → `2.3.17`

---

## 2026-06-03 - Audit: no auto cookie sync from Tool

- Version: `2.3.16`
- Type: Patch
- Product: P0020 (+ E0001 `0.5.94`)
- Prompt: Kiểm tra sync tự động còn sót — user đã yêu cầu tắt hoàn toàn
- Status: Draft

### Changes

- Documented: P0020 realtime chỉ refresh list/vault (read DB); không gửi `SYNC_NOW`.
- E0001: vault metadata no longer overwrites `pushedAt` (fixes false “auto sync” timestamps).

Version: `2.3.15` → `2.3.16`

---

## 2026-06-03 - Fix Kalodata routes sharing one Sync time

- Version: `2.3.15`
- Type: Patch
- Product: P0020 (+ E0001 `0.5.93`)
- Prompt: Tất cả route Kalodata cùng 21:57 dù không thao tác
- Status: Draft

### Changes

- Vault map/lookup: canonical `noteId:.domain` key (`vaultRouteKey` / `lookupVaultRow`) — fixes wrong or shared vault row when DB domain lacks leading dot.
- E0001: per-route status key `noteId:domain` (was noteId-only); migrate legacy status on popup refresh.

Version: `2.3.14` → `2.3.15`

---

## 2026-06-03 - Card sync time matches extension (vault-first)

- Version: `2.3.14`
- Type: Patch
- Product: P0020
- Prompt: Card view Synced khác extension — ví dụ p1z11 19:57 vs 20:09
- Status: Draft

### Changes

- `resolveRouteSyncedDisplayIso`: prefer `note_cookie_vault.updated_at` (E0001 popup cloud leg), fallback `notes.synced_at` when no vault.
- Route card sync row uses resolver (was wrongly preferring newer `notes.synced_at`).

Version: `2.3.13` → `2.3.14`

---

## 2026-06-03 - Cookie timestamp format (hh:mm dd/mm/yy)

- Version: `2.3.13`
- Type: Patch
- Product: P0020
- Prompt: Xóa nhãn Sync gần nhất; chỉ timestamp; đồng nhất `hh:mm dd/mm/yy`
- Status: Draft

### Changes

- Shared `formatTimestampCompact` in `src/lib/format-timestamp.ts`.
- Route card sync row: icon + timestamp only (no label).
- Cookie Auto table, access Load/Publish times use same format.

Version: `2.3.12` → `2.3.13`

---

## 2026-06-03 - Cookie settings trim + route card sync row

- Version: `2.3.12`
- Type: Patch
- Product: P0020
- Prompt: Xóa tab Bridge/Advanced; Realtime UI luôn bật; Route card — Sync gần nhất có icon, dòng riêng
- Status: Draft

### Changes

- Removed Cookie Settings **Bridge** and **Advanced** tabs (`CookieBridgeExtensionSection`, `CookieBridgeAdvancedSection`).
- Realtime UI refresh always on (`notes-realtime-pref`, `cookieBridge` defaults).
- Route **Card** view: dedicated **Sync gần nhất** row with `RefreshCw` icon (`notes.synced_at`, vault fallback).

Version: `2.3.11` → `2.3.12`

---

## 2026-06-04 - Per-user Load time on route (no agent heartbeat)

- Version: `2.3.10`
- Type: Patch
- Product: P0020 (+ E0001 `0.5.90`)
- Prompt: Vẫn ghi nhận thời gian Load gần nhất cho Route từ mỗi user
- Status: Draft

### Changes

- New `cookie_route_user_activity` + RPC `cookie_route_record_load` / `cookie_route_activity_list`.
- Extension records Load on successful vault apply (one upsert per user/route, no 7s poll).
- People & access: **Load** column per user (owner + shared members).
- Cookie Settings: removed **Vault** tab (policy fixed — Sync always snapshot + jar on extension).

Version: `2.3.9` → `2.3.10`

---

## 2026-06-04 - Remove Connected browsers / agent cloud tracking

- Version: `2.3.9`
- Type: Patch
- Product: P0020 (+ E0001 `0.5.89`)
- Prompt: Xóa Connected browsers — không cần, giảm tải DB
- Status: Draft

### Changes

- Removed Connected browsers UI, `useCookieAgents` polling, and remote command queue from Tool.
- E0001: stopped 7s heartbeat upsert to `cookie_bridge_agents` and command poll loop.
- Route detail: About + Access only; Load column in access table shows — (apply time stays extension-local).

Version: `2.3.8` → `2.3.9`

---

## 2026-06-04 - Cookie list Share column + connected browsers

- Version: `2.3.8`
- Type: Patch
- Product: P0020
- Prompt: Chip Shared cột list; Connected browsers luôn hiện, icon state/cột; lọc User
- Status: Draft

### Changes

- List table: **Share** column with `RouteShareChip` (Private / Shared N / Shared to me).
- Route detail: **Connected browsers** always visible in TOC; state/login chips and icon column headers; **User** filter on agents table.
- Access table reuses shared `RdpThLabel` helper.

Version: `2.3.7` → `2.3.8`

---

## 2026-06-04 - Route detail + Cookie Auto stat chips

- Version: `2.3.7`
- Type: Patch
- Product: P0020
- Prompt: Tiêu đề lệch; gộp Health/Vault vào About; chip Synced/cookies/Shared; cột TH có icon
- Status: Draft

### Changes

- Fix section title alignment (`justify-content: flex-start`).
- Single **About** block (vault + health as stat strip + compact 3-col grid).
- **Route stat chips** on cards/list/modal header (Synced, N cookies, Shared N).
- Access table column headers with icons (Hub users style).

Version: `2.3.6` → `2.3.7`

---

## 2026-06-04 - Route detail modal redesign

- Version: `2.3.6`
- Type: Patch
- Product: P0020
- Prompt: Redesign Route Details — header, stack About/Vault, icons, sync/load in access table
- Status: Draft

### Changes

- Route detail: Hub-style header (name, domain, sync/note ID); removed duplicate TOC title and side ID card.
- About + Cloud vault stacked vertically with compact half-line fields.
- People & access: icon permissions, Sync/Load columns; Connected browsers section with clearer purpose copy.

Version: `2.3.5` → `2.3.6`

---

## 2026-06-04 - Cookie schema health probe (false FAIL banner)

- Version: `2.3.5`
- Type: Patch
- Product: P0020
- Prompt: Banner Supabase schema FAIL sync_pass_hash khi DB đã OK
- Status: Draft

### Changes

- `cookieSchemaHealth`: drop `p_updated_by` from vault probe; treat `note not found` as OK; detect `PGRST202` / stale `v_note`.

Version: `2.3.4` → `2.3.5`

---

## 2026-06-04 - Note editor: click anywhere to focus

- Version: `2.3.4`
- Type: Patch
- Product: P0020
- Prompt: Nhận chuột ở bất cứ đâu trong giao diện note (không chỉ vùng có chữ)
- Status: Draft

### Changes

- Editor body: full-height textarea + click on empty panel focuses editor; ResizeObserver keeps min height in sync.

Version: `2.3.3` → `2.3.4`

---

## 2026-06-04 - Fix route chip icon flash on note switch

- Version: `2.3.3`
- Type: Patch
- Product: P0020
- Prompt: Nhãn Route Modal nháy icon cũ khi đổi note Kalodata → Netflix
- Status: Draft

### Changes

- `useNoteCookieRouteLock`: derive routes synchronously from `noteId` (cache/local); async fetch no longer shows previous note's chips.
- Route opener: remount on `noteId`; site icon `key` on `src` to avoid stale image flash.

Version: `2.3.2` → `2.3.3`

---

## 2026-06-04 - Route note editor matches normal note (read-only)

- Version: `2.3.2`
- Type: Patch
- Product: P0020
- Prompt: Note route không bo góc/đổi font — giao diện giống note thường, chỉ khóa nhập
- Status: Draft

### Changes

- Cookie route notes: snapshot in same `notes-editor__textarea` (sans, no cookie panel); `readOnly` only.
- Removed `fm-cookie-panel--locked` full-height monospace list for route notes.

Version: `2.3.1` → `2.3.2`

---

## 2026-06-04 - Notes folders, Tool dialogs, folder tag persistence

- Version: `2.3.1`
- Type: Minor
- Product: P0020
- Prompt: Notes folders (filter, tag, settings); Tool-style confirms/toasts; folder persist + filter UI parity
- Status: Committed

### Changes

- Notes folders: multi-tag, system folders (New, Unorganized, Cookie Auto), FilterBar filter, editor picker, Settings CRUD table.
- `ToolConfirmDialog` + toasts replace browser `confirm`/`alert`; centered confirm layout.
- Folder tags persist across F5 (local-first merge + Supabase flush); shared `filter-dropdown-ui` for header Filter and note picker.
- List rail dots match folder colors; `NotesFolderGlyph` shared across Filter, picker, and settings table.

Version: `2.2.11` → `2.3.1`

---

## 2026-06-04 - Notes folder tags persist + unified filter dropdown UI

- Version: `2.2.11`
- Type: Patch
- Product: P0020
- Prompt: Folder không lưu sau F5; đồng nhất style Filter và bộ chọn Folder
- Status: Draft

### Changes

- Folder tags: merge localStorage with Supabase on load (local wins); flush pending mappings after remote ready.
- Remap local-only folder ids to cloud UUIDs on sync; commit before remote on toggle.
- Shared `filter-dropdown-ui` — FilterBar header folder filter and note folder picker use same trigger, circle, panel.

Version: `2.2.10` → `2.2.11`

---

## 2026-06-04 - Confirm dialog layout alignment

- Version: `2.2.10`
- Type: Patch
- Product: P0020
- Prompt: Các nhãn trong modal xác nhận bị lệch — căn giữa, nút đều nhau
- Status: Draft

### Changes

- `ToolConfirmDialog` / `TwofaConfirmDialog`: centered icon, title, message; equal-width Cancel / Delete row.

Version: `2.2.9` → `2.2.10`

---

## 2026-06-04 - Tool-style confirms and toasts app-wide

- Version: `2.2.9`
- Type: Patch
- Product: P0020
- Prompt: Chuyển toàn bộ thông báo sang Tool style như tab 2FA
- Status: Draft

### Changes

- `ToolConfirmDialog` (auth-gate skin) replaces `window.confirm` for note delete and re-exports 2FA confirm.
- Sign-out errors use toast instead of `window.alert`.
- Notes list/load errors and editor actions use toast; removed duplicate rose banners in editor.

Version: `2.2.8` → `2.2.9`

---

## 2026-06-04 - Notes folders: aligned Filter UI + fix tag + list dots

- Version: `2.2.8`
- Type: Patch
- Product: P0020
- Prompt: Folder cùng dòng tiêu đề bên phải; sửa chọn folder khi ở New; đồng bộ icon/màu Filter + list
- Status: Draft

### Changes

- Folder picker on same row as title (right), FilterBar height/style.
- Fix tagging: batch `setUserNoteFolders`; custom vs automatic rows (New no longer blocks clicks).
- Shared `NotesFolderGlyph` for header Filter, note picker, Settings table.
- List rail dot uses primary folder color.

Version: `2.2.6` → `2.2.8`

---

## 2026-06-04 - Notes folders: tag on editor + Cookie Auto system folder

- Version: `2.2.6`
- Type: Patch
- Product: P0020
- Prompt: Thêm Folder cho Note; folder cố định Cookie Auto cho note có route
- Status: Draft

### Changes

- Toolbar **Folders** picker — tag/untag note without opening Settings.
- System folder **Cookie Auto** (fixed) — notes with Cookie Auto routes auto-tagged; filter + table count include routes.
- Settings Folders: Cookie Auto row marked **System**; cannot rename/delete; user folders still editable.

Version: `2.2.5` → `2.2.6`

---

## 2026-06-04 - Auto relay Tool sessions to E0001 extension

- Version: `2.2.5`
- Type: Patch
- Product: P0020
- Prompt: Kiểm tra sync user từ web (đã login) lên Extension
- Status: Draft

### Changes

- `relayActiveSessionsToExtension`: push Hub identity + Data Box JWT to E0001.
- `useExtensionSessionRelay` on workspace shell (mount + 30m + hub-identity event).
- `onLinkExtension` uses full dual relay (was Data Box only).

Version: `2.2.4` → `2.2.5`

---

## 2026-06-04 - Fewer auth requests on sign-in (rate limit)

- Version: `2.2.4`
- Type: Patch
- Product: P0020
- Prompt: Giảm rate limit — gộp bớt request auth mỗi lần bấm Sign In
- Status: Draft

### Changes

- `signInWorkspaceDual`: Hub then Data Box sequentially; 2FA vault mirror runs in background (not parallel with login).

Version: `2.2.3` → `2.2.4`

---

## 2026-06-04 - Fix blank screen (hub-ui export)

- Version: `2.2.3`
- Type: Patch
- Product: P0020
- Prompt: Blank page at http://127.0.0.1:5177/
- Status: Draft

### Changes

- Export `WorkspaceTabHeader` + `buildVersionMetaItems` from `vendor/hub-ui/src/index.ts` (missing export crashed app on load).

---

## 2026-06-04 - Auth modal aligned with Tool Hub shell

- Version: `2.2.3`
- Type: Patch
- Product: P0020
- Prompt: Chuẩn hóa modal Sign In/Sign Up giống P0004 — Welcome + một dòng subtitle, không hint
- Status: Draft

### Changes

- `NotesAuthGate` modal: title `Welcome to Data Box`, single subtitle (notes/2FA/cookies/tool access), no field hints.
- Inline auth gate: title only (no extra guidance lines).

Version: `2.2.2` → `2.2.3`

---

## 2026-06-04 - Trim auth modal copy

- Version: `2.2.2`
- Type: Patch
- Product: P0020
- Prompt: Bỏ nhãn subtitle và hint Sign In trong modal đăng nhập (không cần thiết)
- Status: Verified
- Release: https://github.com/tuanhoangfx/Tool-Manager/releases/tag/v2.2.2

### Changes

- `NotesAuthGate` modal: remove subtitle under title; remove Sign In hint under User ID field (Sign Up hint kept).

Version: `2.2.1` → `2.2.2`

---

## 2026-06-04 - 2FA tab sign-in gate + User ID hints

- Version: `2.2.0`
- Type: Minor
- Product: P0020
- Prompt: Login CS00786 at databox/twofa still email validation; no User ID hints
- Status: Committed

### Changes

- `TwofaManagerScreen`: require workspace sign-in in shell mode (same pattern as Cookie/Notes), with offline mode on gate.
- `NotesAuthGate`: cookie/2FA/system subtitles and inline copy mention User ID or linked email.
- Sign-in field remains `type="text"` (User ID or email); deploy fixes production HTML5 `@` error.
- `pnpm-lock.yaml` synced for `@tool-workspace/hub-identity` (Vercel frozen-lockfile).

Version: `2.1.9` → `2.2.0`

---

## 2026-06-04 - Extension download modal: P0004 User TOC + table parity

- Version: `2.2.1`
- Type: Patch
- Product: P0020
- Prompt: Match User modal 100% — TOC hover, icons in data/column headers, fewer redundant labels
- Status: Draft

### Changes

- TOC sidebar (`TocSectionNav` + pointer highlight) like `UserAccessModal`.
- Release: kv table with row icons + hover; install: Hub table with icon column headers + row hover.
- Remove compact modal width; section titles emoji-only via TOC helper (no duplicate sub-labels).
- Drop header version badge; add `overview-toc.css` + overview TOC utilities.

Version: `2.2.0` → `2.2.1`

---

## 2026-06-04 - Remove Guide modal; extension download uses Hub User modal shell

- Version: `2.1.9`
- Type: Minor
- Product: P0020
- Prompt: Delete Guide modal (requested earlier); clone P0004 User route-detail modal style 100%
- Status: Draft

### Changes

- Delete `CookieExtensionGuideButton.tsx` and header Guide entry.
- `CookieExtensionDownloadConfirm`: `modal-backdrop--tool-detail` + `modal-shell--tool-detail` + `user-access-modal__header` (same as P0004 `UserAccessModal`).
- Remove custom `cookie-extension-modal.css`; install steps use Hub `DetailSection` pattern.
- Sync `user-access-modal__header-*` rules in `modal.css`.

Version: `2.1.9` → `2.2.0`

---

## 2026-06-04 - Cookie extension download modal (E0001 branding)

- Version: `2.1.9`
- Type: Patch
- Product: P0020
- Prompt: Cookie Auto Extension modal prettier, extension colors, icon install steps
- Status: Draft

### Changes

- Redesign `CookieExtensionDownloadConfirm`: E0001 icon, indigo accent (`#6366f1`), cookie/cyan accents.
- `CookieExtensionInstallSteps`: 6 steps with Lucide icons, numbers, symbols (`chrome://extensions`, `ON`).
- `cookie-extension-modal.css`; `public/icons/e0001-cookie-bridge.svg`.
- FAB gradient aligned to extension accent.

Version: `2.1.8` → `2.1.9`

---

## 2026-06-04 - Cookie FAB inset 3rem

- Version: `2.1.8`
- Type: Patch
- Product: P0020
- Prompt: FAB too far — set bottom 3, right 3
- Status: Draft

### Changes

- `--cookie-fab-inset-bottom/right`: `3rem` (was 6rem / 4rem).

Version: `2.1.7` → `2.1.8`

---

## 2026-06-04 - Cookie FAB: dedupe CSS layer + larger inset

- Version: `2.1.7`
- Type: Patch
- Product: P0020
- Prompt: FAB still too close to corner; check duplicate layers; increase inset more
- Status: Draft

### Changes

- Remove dual class `workspace-fab-stack` + `--cookie` (generic stack was redundant).
- Single `--cookie` layer: `bottom` 6rem, `right` 4rem (CSS vars `--cookie-fab-inset-*`).
- Guide FAB styles separated (`.workspace-fab--guide` only, not fixed dock).

### Verification

- `corepack pnpm run build` — pass

Version: `2.1.6` → `2.1.7`

---

## 2026-06-04 - Cookie FAB inset from viewport corner

- Version: `2.1.6`
- Type: Patch
- Product: P0020
- Prompt: FAB too tight on corner — nudge outward (more margin from edges)
- Status: Draft

### Changes

- `cookie-extension-fab.css`: `bottom` 3.5rem, `right` 2.25rem for Cookie download FAB.

### Verification

- `corepack pnpm run build` — pass

Version: `2.1.5` → `2.1.6`

---

## 2026-06-03 - Cookie FAB size and inset position

- Version: `2.1.5`
- Type: Patch
- Product: P0020
- Prompt: FAB slightly larger; move up-left into lower-right content band (red zone)
- Status: Draft

### Changes

- `cookie-extension-fab.css`: Cookie FAB 2.25rem, `bottom`/`right` inset ~2.75rem / 1.5rem from viewport corner.

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
