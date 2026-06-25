# Account vault — platform icon registry

SSOT: `twofa-platform-icons.registry.json` · resolver: `twofa-platform-icon.ts` · UI: `TwofaPlatformIcon.tsx`

## Icon shell (display mode)

| Shell | When to use | White tile | `brightness(0)` |
|-------|-------------|------------|-----------------|
| **`bare`** (default) | App icons / colored PNG — Binance, Adobe, Augment, CapCut, … | No | No |
| **`tile`** | Dark mono mark on dark UI — GitHub octocat | Yes | No |
| **`darkInk`** | White mono SVG on transparent — Vercel triangle | Yes | Yes |

**Do not** apply `brightness(0)` to colored logos — they become black blobs on the tile.

**Baked-in background:** Many favicons already include the brand’s colored square (Adobe red A, CapCut app icon). Use **`bare`** — we do **not** add a second white Hub tile on top.

### Registry fields

```json
{
  "label": "Binance",
  "match": "binance",
  "source": { "type": "local", "src": "/assets/brand-icons/binance.png" }
}
```

Optional override:

```json
{ "shell": "tile" }
```

Legacy: `"darkInk": true` → same as `"shell": "darkInk"`.

### Auto rules (when `shell` omitted)

1. `darkInk: true` → `darkInk`
2. `/assets/brand-icons/*.{png,ico}` → `bare`
3. `/icons/github.svg` → `tile`
4. `/icons/vercel.svg` → `darkInk`
5. Else → `bare`

### Sync

`pnpm sync:twofa-icons` downloads favicon PNGs (original colors). New entries default to **bare**.
