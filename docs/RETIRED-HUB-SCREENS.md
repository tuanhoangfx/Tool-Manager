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

## URL redirects

Legacy `?screen=` values (`dashboard`, `library`, `activity`, `system`, `settings`, `hub`, `layouts`) redirect to `notes` via `useHubNavigation.ts`.

## Kept

- `CookieSyncScreen.tsx` (cookie feature; path may move to `src/features/cookie/` later)
- `PageHeader.tsx` (shared sub-header inside feature panels)
