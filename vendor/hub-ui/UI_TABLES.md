# Hub UI table goldens

Seven **table** patterns for clone parity (Agent tab → Kind **Table**): five directory-style goldens + Agent meta-table + logs; plus one **card-only** exception (Channels).  
Screen shell: template `directory` in [UI_TEMPLATES.md](./UI_TEMPLATES.md).

**Catalog (machine):** `Tool/schemas/ui-tables.catalog.json`  
**Package table API:** `HubDataTable`, `HubTableEmptyRow`, CSS `hub-users-table.css`

---

## Golden tables (7)

| ID | Name | Golden | Skin | Status |
|----|------|--------|------|--------|
| `users-directory` | Users directory | P0004/users | `hub-users-table` | ready |
| `hub-tools-directory` | Hub tools directory | P0004/hub-list | `hub-users-table` | ready |
| `agent-context` | Agent context table | P0004/system/agent | `hub-users-table` | ready |
| `supabase-quota` | Supabase quota projects | P0004/system/supabase-quota | `hub-users-table` (wide) | ready |
| `bots-directory` | Bots directory | P0006/bots | `hub-users-table` | ready |
| `groups-directory` | Groups directory | P0006/groups | `HubDataTable` | ready |
| `logs-activity` | Worker activity log | P0006/logs | `HubDataTable` | ready |

### Exception (not a table golden)

| ID | Note |
|----|------|
| `channels-card-only` | P0006/channels — card grid only, no `hub-users-table` |

---

## Clone rules

**Do**

- Import `@tool-workspace/hub-ui/styles/hub-users-table.css` in app `styles.css`.
- Prefer `HubDataTable` + column defs (see P0006 Groups).
- Match row height / header from Users (:5176) when pixel-checking.

**Do not**

- Ad-hoc `<table className="w-full …">` for directory screens (Supabase quota is the known drift).
- Fork `ViewToggle` locally — use package export.

**Verify**

```bash
node E:/Dev/Tool/scripts/hub-ui-parity-check.mjs --code P0006 --screen groups --template directory
```

Side-by-side: P0004 Users (:5176) vs target screen.

---

## Related

- `packages/hub-ui/README.md` § HubDataTable
- `Tool/P0004-Tool-Hub/public/rules/workspace-design-standard.md` § Table blueprint
- Agent manifest: `pnpm agent:manifest` → kind `table` rows
