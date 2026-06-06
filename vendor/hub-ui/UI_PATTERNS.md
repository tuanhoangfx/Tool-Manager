# Hub UI patterns (unified)

**Catalog:** `Tool/schemas/ui-patterns.catalog.json`  
**Clone:** `node Tool/scripts/hub-ui-stack.cjs P00xx <screen>`  
**Agent tab:** Kind **Pattern** (ready goldens only)

**Deferred** (không có row Agent — chuẩn hóa sau): `dashboard`, `inbox-split` → `deferredPatterns[]` trong catalog.

---

## Ready patterns (Agent)

| ID | Layer | Golden |
|----|-------|--------|
| `directory` | screen | P0004/hub-list |
| `document-toc` | screen | P0004/overview-toc |
| `system-panels` | screen | P0004/system |
| `workspace-composer` | screen | P0020/notes |
| `auth-gate` | modal | P0004/auth |
| `user-access-modal` | modal | P0004/users |

**Directory** = card + table via **ViewToggle** (one pattern).  
**System** = Agent table + Quota table inside `panels[]` (not separate rows).

---

## Filter (golden — P0004 Hub)

**Canonical source:** `P0004/vendor/hub-ui` → promoted to `packages/hub-ui` via `node Tool/scripts/sync-hub-ui-vendor.cjs`.

| Layer | Component | When to use |
|-------|-----------|-------------|
| Screen | `HubDirectoryScreen` + `FilterBar layout="hub"` | Directory tabs (Hub, 2FA, Cookie, Notes, System) |
| Dropdown | `HubSingleFilterDropdown` | Single-select in forms/modals |
| Primitives | `HubFilterDropdownTrigger`, `HubFilterDropdownCircle`, `HUB_FILTER_DROPDOWN_*_CLASS` | Custom multi-select pickers (e.g. note folder tagger) |
| Toolbar | `HubTimeRangeSelect`, `HubRowLimitSelect`, `HubResultCount` | FilterBar `toolbar` / `row2Actions` slot |

**Rules**

- Directory screens: **always** `FilterBar layout="hub"` via `HubDirectoryScreen` — never local chip/toolbar CSS.
- Modal / narrow context: `FilterBar layout="inline"` or `HubSingleFilterDropdown`.
- Custom folder/tag pickers: import primitives from `@tool-workspace/hub-ui` only — no per-tool `filter-dropdown-ui` copies.
- Register filter icons once: `configureFilterIcons` in app `setupHubUi()`.

**Exceptions (documented)**

- **P0008** — `app/src/components/table/FilterBar.tsx` fork for Next.js RSC (icon keys as strings). Align visually with golden tokens; do not copy into Vite tools.

**Removed legacy:** `ToolFilterBar` + `.filter-toolbar` / `.chip` CSS (P0004, P0020).

---

## Agent Kind (manifest)

| Kind | Nội dung |
|------|----------|
| **pattern** | Hub UI clone goldens |
| **rule** | Cursor rules |
| **skill** | Cursor skills |
| **command** | Slash commands + `Tool/scripts/hub-ui-*.cjs` |
| **doc** | AGENTS.md, UI_PATTERNS, keyboard doc, hub-load refs |

Đã gộp/bỏ: `contract`+`file`→**doc**, `script`→**command**, `table`/`screen`/`component`→**pattern**.

---

## Related

- `ui-screens.catalog.json` — `defaults` + deferred templates
- Legacy: `UI_TABLES.md`, `UI_COMPONENTS.md`
