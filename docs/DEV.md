# Chạy UI local — P0020

## Cửa sổ `next-server` — không phải P0020

P0020 dùng **Vite** (port 5177). Cửa sổ tiêu đề `next-server (v14.2.15)` là **P0008** (Next.js), thường do **PM2** `p0008-dev`:

```powershell
pm2 list
pm2 delete p0008-dev
pm2 save --force
```

Xem thêm `Tool/P0008-Sales-Console/docs/DEV.md`.

## Không dùng Launch (tránh cmd riêng)

Cursor **Launch** đã tắt trong `.claude/launch.json`.

## Terminal tích hợp (khuyến nghị)

### Chạy tay

```powershell
corepack pnpm dev
```

Một tab Terminal, `Ctrl+C` để tắt → http://127.0.0.1:5177/

### Task (không tự bật khi mở folder)

**Terminal → Run Task…** → **P0020: Dev (terminal tích hợp)**

## Build (không cần server)

```powershell
corepack pnpm run build
```
