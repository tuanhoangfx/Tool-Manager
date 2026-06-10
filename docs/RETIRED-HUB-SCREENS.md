# Retired screens (P0020 shell rebuild)

Removed when migrating to **P0004 Tool Hub shell** with tabs: Notes, Todo, 2FA, Cookie Auto only.

**Note (2026-06):** Tab **Todo** revived — Kanban logic from P0019, Hub-UI shell.

## Deleted source files

### Hub / library era (P0004 copy)

- `src/features/hub/P0004LibraryScreen.tsx`
- `src/features/hub/P0004ActivityScreen.tsx`
- `src/features/hub/P0004SystemScreen.tsx`
- `src/features/hub/InteractiveDashboard.tsx`
- `src/theme/p0008/P0008Sidebar.tsx` (replaced by `WorkspaceSidebar`)
- `src/features/index.ts`, `src/features/hub/HubApp.tsx`
- `src/features/activity/ActivityTab.tsx`
- `src/features/store/*` (StoreTab, ToolCard, TableView, DetailModal)
- `src/features/system/SystemTab.tsx` (replaced by `SystemDesignTemplateScreen`)
- `src/hub/app-registry.ts`
- `src/components/sales-shell/Sidebar.tsx` (`SalesSidebar`; use `WorkspaceSidebar`)

### design-preview folder (removed 2026-06-10)

Entire `src/features/design-preview/` retired after consolidation:

- `screens/CookieSyncScreen.tsx` → **`src/features/cookie/CookieSyncScreen.tsx`**
- `screens/PageHeader.tsx` → **`src/components/PageHeader.tsx`**
- `design-nav.ts` (`readNoteIdFromUrl`) → **`src/lib/note-url.ts`**
- Legacy mocks (deleted earlier): `NotesGalleryScreen`, `NoteEditScreen`, `SettingsScreen`, `ShareLinksScreen`, `TodoScreen`, `TwofaScreen`

### Notes legacy (replaced by `NotesWorkspaceScreen`)

- `src/features/notes/NotesGalleryScreen.tsx`
- `src/features/notes/NoteEditScreen.tsx`
- `src/features/notes/index.ts` (barrel — no consumers)
- `src/features/notes/notes-egress.ts` (dead re-export shim)

### P0004 library components (`src/components/` — 2026-06-10 dead-code pass)

- `index.ts` barrel +: `TagRow`, `StackTagIcon`, `ThemeToggle`, `DriftHint`, `HealthBar`, `Tooltip`, `EmptyState`, `FileListBlock`, `InfoItem`, `Metric`, `SideNavButton`, `AppSettingsButton`, `AppSettingsBack`, `StatusBadge`, `RegionFlagBadge`, `SettingRow`

### P0004 hooks (`src/hooks/` — duplicate of hub-ui)

- `useAppView`, `useSessionState`, `useTheme`, `useUrlState`, `usePageSessionSeconds`, `index.ts`

### Cookie dead code (2026-06-10)

- `CookieExtensionHeaderLink.tsx`, `cookie-extension-header-cta.css` (header CTA never mounted; use Download FAB)
- `OfflineModeSettingRow`, `CookieRouteAccessTableSkeleton`, `cookieRouteDetailTable`, `StorageRecommendations`, `cookieCloudRoutes`

### Workspace / overview shims

- `WorkspaceScreenChrome.tsx` (alias → `WorkspaceDirectoryScreen`)
- `workspace-log-types.ts`
- `overview/use-toc-section-spy.ts`, `overview/toc-section-highlight-context.tsx` (hub-ui re-exports)
- `system-hub/system-prefs.ts`

### Lib / CSS orphans

- `lib/tool-launch.ts`, `lib/app-screen.ts`, `lib/changelog-parser.ts`, `lib/tooltips.ts`
- `styles/activity-tab.css`, `activity.css`, `library.css`, `running-badge.css`, `sync-hub.css`, `tool-card.css`
- `theme/9router-globals.css` (tokens remain via `base.css` → `9router-tokens.css`)
- `styles/hub-library.css`, `theme/p0008/hub-p0004-embed.css` (never imported)

### Users (moved to Tool Hub P0004)

- `src/features/users/UserManagementScreen.tsx`
- `src/features/users/userManagementRepository.ts`
- `src/features/hub/HubManagedUsersScreen.tsx`
- `src/lib/open-tool-hub-sign-in.ts` (popup sign-in; P0020 uses in-app modal + `signInWorkspaceDual`)

## URL redirects

Legacy `?screen=` values (`dashboard`, `library`, `activity`, `system`, `settings`, `hub`, `layouts`) redirect to `notes` via `useHubNavigation.ts`.

`/users` and `?screen=users` redirect to **Tool Hub** `/users` (`toolHubUsersUrl()` in `useHubNavigation.ts`).

### Knip pass (2026-06-10) — additional orphans

- `lib/supabase-region.ts`, `lib/thesvg.ts`, `lib/workspace-databox-auth.ts`, `types/workspace-catalog.ts`
- `components/sales-shell/FilterBar.tsx` (hub-ui re-export; use `sales-shell/index.ts`)
- `features/hub/hub-prefs.ts`
- `notes/NotesNewNoteButton.tsx`, `notes/useExtensionAuthHeartbeat.ts`
- `twofa/TwofaRevealField.tsx`
- Todo P0019 leftovers: `ActivityTicker`, `FilterBar`, `SessionInfo`, `SettingsController`, `TodoFilterSticky`, `usePermission`, `UserMenu`, `EmployeeTaskView`, `TaskDefaultsModal`, `common/{AnimatedNumber,AssigneeSelect,Button,Dropdown,Tabs}`
- Empty stub `todo/components/EmployeeDashboard.tsx` (0 bytes; real impl at `dashboard/employee/EmployeeDashboard.tsx`)

## Dead-code gate

`pnpm run deadcode` (knip) — also runs at end of `pnpm run lint`. Config: `knip.json`.

Todo module uses **relative imports** only (no `@/todo/*` alias — removed from `tsconfig` / `vite` for knip).

## `src/features/hub/` (kept — not empty)

Navigation hooks still live here; do not delete the folder:

- `useHubNavigation.ts` — legacy `?screen=` redirects + workspace tab routing
- `useHubIdentityRelay.ts` — identity relay to Tool Hub

## Production paths (do not recreate retired files)

| Feature | Canonical path |
|---------|------------------|
| Cookie Auto tab | `src/features/cookie/CookieSyncScreen.tsx` |
| Extension download | `CookieExtensionFab` → `CookieExtensionDownloadConfirm` modal |
| Notes workspace | `src/features/notes/NotesWorkspaceScreen.tsx` |
| Sub-header in panels | `src/components/PageHeader.tsx` |
| Note deep-link `?note=` | `src/lib/note-url.ts` |
