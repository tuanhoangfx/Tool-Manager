export type MockNote = {
  id: string;
  title: string;
  slug: string;
  domain: string;
  sync: string;
  syncTone: "emerald" | "amber" | "rose";
  pinned: boolean;
  updatedAt: string;
  shareEnabled: boolean;
};

export const MOCK_NOTES: MockNote[] = [
  {
    id: "n1",
    title: "Zalo OA — Session",
    slug: "zalo-oa-session",
    domain: ".zalo.me",
    sync: "12 phút trước",
    syncTone: "emerald",
    pinned: true,
    updatedAt: "22/05/2026 10:00",
    shareEnabled: true,
  },
  {
    id: "n2",
    title: "GitHub — API tokens",
    slug: "github-api",
    domain: ".github.com",
    sync: "1 giờ trước",
    syncTone: "emerald",
    pinned: false,
    updatedAt: "21/05/2026 18:40",
    shareEnabled: false,
  },
  {
    id: "n3",
    title: "Shop — Checkout",
    slug: "shop-checkout",
    domain: ".shop.example",
    sync: "Chờ extension",
    syncTone: "amber",
    pinned: false,
    updatedAt: "20/05/2026 09:15",
    shareEnabled: false,
  },
  {
    id: "n4",
    title: "Facebook Ads",
    slug: "fb-ads",
    domain: ".facebook.com",
    sync: "Lỗi sync",
    syncTone: "rose",
    pinned: false,
    updatedAt: "19/05/2026 14:00",
    shareEnabled: false,
  },
];

export const SAMPLE_MD = `# Zalo OA — Session

Ghi chú vận hành cho team support.

## Cookie snapshot
_Tự động mỗi giờ — chỉ đọc_

\`\`\`cookie-json
{ "domain": ".zalo.me", "count": 8, "masked": true }
\`\`\`

## Share
Link: \`infix1.io.vn/notes/share/k7x…\` (có mật khẩu)`;

export const COOKIE_LINES = [
  "zpw_sek = ••••••••",
  "zpsid = ••••••••",
  "_zlang = vn",
  "app.event.zalo.me = ••••••••",
];
