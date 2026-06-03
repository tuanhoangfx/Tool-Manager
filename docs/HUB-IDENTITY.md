# Identity policy — P0020 + P0004 Tool Hub

## Principle

| Rule | Meaning |
|------|---------|
| **Sign in UI** | **User ID or email** + password (shared with P0004 Hub). |
| **Sign in backend (P0020)** | **Tool Hub first** (`signInWorkspaceDual` + `@tool-workspace/hub-identity`), then Data Box JWT for notes/cookie RLS using the **same Hub auth email** (including `id@id.hub.x1z10.local` for User ID accounts). |
| **Sign in backend (P0004)** | **Tool Hub only** for Users, roles, tool access. Relay to P0020 does **not** unlock vault data until P0020 completes sign-in. |
| **Sign in (P0004)** | `HubAuthGate` on x1z10 P01 for Hub-only sessions. |
| **Quản lý qua P0004** | Workspace user directory, roles, tool access, and identity DB are **owned and edited only** on Tool Hub. |

## Supabase planes

| Plane | Project | App login | Managed in UI |
|-------|---------|-----------|----------------|
| **Identity** | x1z10 P01 (`fmnrafpzctuhxjaaomzt`) | P0004 only | P0004 → **Users** |
| **Data** | Data Box (`VITE_SUPABASE_URL` — see `docs/DATABOX-MIGRATION.md`) | One form on P0020 (Hub password); technical mirror on Data Box | Notes, Todo, Cookie |

Same person may have accounts on both projects; keep emails aligned after [IDENTITY-MIGRATION](../../P0004-Tool-Hub/docs/IDENTITY-MIGRATION.md).

## P0020 — no Users tab

- Sidebar **Users** removed; use footer **Tool Hub — Users** or open `/users` (legacy path redirects to Hub).
- Sign in on P0020 is still required for Data Box RLS (Notes, Cookie, etc.).

| Environment | Tool Hub Users URL |
|-------------|-------------------|
| Production | https://infi.io.vn/users |
| Dev | http://127.0.0.1:5176/users |

Override hub origin: `VITE_TOOL_HUB_URL` in `.env.local`.

## P0004 — canonical management

- User directory, inline/bulk actions, tool grants: **Users** tab on Tool Hub.
- See [Tool Hub IDENTITY.md](../../P0004-Tool-Hub/docs/IDENTITY.md) and [TOOL-ACCESS.md](../../P0004-Tool-Hub/docs/TOOL-ACCESS.md).

## Extension E0001

- **Cookie Auto (P0020):** `E0001_COOKIE_BRIDGE_AUTH` → Data Box JWT.
- **Tool Hub (P0004):** `E0001_HUB_IDENTITY_AUTH` → identity JWT (extension storage only; not P0020 app login).

## Sign-in flow (P0020 + E0001)

1. User sees the **same login UI** (Welcome / Sign In / Sign Up).
2. Submit → `signInWorkspaceDual`: authenticate on **Tool Hub** (shared user DB with P0004).
3. Then open **Data Box** session for vault/RPC; auto-create Data Box auth user if missing (RLS mirror, not a second registration).
4. Extension receives `E0001_HUB_IDENTITY_AUTH` + `E0001_COOKIE_BRIDGE_AUTH` when signing in from the web app.

If Data Box returns `exceed_egress_quota`, Hub sign-in can still succeed; cookie cloud sync waits until Data Box is restored.
