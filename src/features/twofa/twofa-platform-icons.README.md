# Account vault — platform icon registry

**SSOT moved to hub-ui:** `packages/hub-ui/src/lib/hub-brand-icons.registry.json`

- Resolver (P0020): `twofa-platform-icon.ts` → `resolveHubBrandIconByMatch()` from `@tool-workspace/hub-ui`
- UI: `TwofaPlatformIcon.tsx`
- Sync: `node ../../scripts/sync-hub-brand-icons.mjs --code P0020` (alias: `pnpm sync:twofa-icons`)

## Icon shell (display mode)

| Shell | When to use | White tile | `brightness(0)` |
|-------|-------------|------------|-----------------|
| **`bare`** (default) | App icons / colored PNG — Binance, Adobe, Augment, CapCut, … | No | No |
| **`tile`** | Dark mono mark on dark UI — GitHub octocat | Yes | No |
| **`darkInk`** | White mono SVG on transparent — Vercel triangle | Yes | Yes |

**Do not** apply `brightness(0)` to colored logos — they become black blobs on the tile.

### Sync

`pnpm sync:twofa-icons` downloads favicon PNGs (original colors). New entries go in **hub-ui** registry.
