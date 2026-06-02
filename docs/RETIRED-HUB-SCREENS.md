# Retired screens (P0020 shell rebuild)

Removed when migrating to **P0004 Tool Hub shell** with tabs: Notes, Todo, 2FA, Cookie Auto only.

## Deleted source files

- `src/features/hub/P0004LibraryScreen.tsx`
- `src/features/hub/P0004ActivityScreen.tsx`
- `src/features/hub/P0004SystemScreen.tsx`
- `src/features/hub/InteractiveDashboard.tsx`
- `src/theme/p0008/P0008Sidebar.tsx` (replaced by `WorkspaceSidebar`)
- Mock / duplicate under `src/features/design-preview/screens/`:
  - `NotesGalleryScreen.tsx`, `NoteEditScreen.tsx` (production: `src/features/notes/`)
  - `SettingsScreen.tsx`, `ShareLinksScreen.tsx`, `TodoScreen.tsx`, `TwofaScreen.tsx`

### Users (moved to Tool Hub P0004)

- `src/features/users/UserManagementScreen.tsx`
- `src/features/users/userManagementRepository.ts`
- `src/features/hub/HubManagedUsersScreen.tsx`
- `src/lib/open-tool-hub-sign-in.ts` (popup sign-in; P0020 uses in-app modal + `signInWorkspaceDual`)

### Legacy hub shell (unused barrel)

- `src/features/index.ts`, `src/features/hub/HubApp.tsx`
- `src/features/activity/ActivityTab.tsx`
- `src/features/store/*` (StoreTab, ToolCard, TableView, DetailModal)
- `src/features/system/SystemTab.tsx` (replaced by `SystemDesignTemplateScreen`)
- `src/hub/app-registry.ts`
- `src/components/sales-shell/Sidebar.tsx` (`SalesSidebar`; use `WorkspaceSidebar`)
- `src/styles/hub-library.css`, `src/theme/p0008/hub-p0004-embed.css` (never imported)

## URL redirects

Legacy `?screen=` values (`dashboard`, `library`, `activity`, `system`, `settings`, `hub`, `layouts`) redirect to `notes` via `useHubNavigation.ts`.

`/users` and `?screen=users` redirect to **Tool Hub** `/users` (`toolHubUsersUrl()` in `useHubNavigation.ts`).

## Kept

- `CookieSyncScreen.tsx` (cookie feature; path may move to `src/features/cookie/` later)
- `PageHeader.tsx` (shared sub-header inside feature panels)
