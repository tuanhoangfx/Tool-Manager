import {
  Boxes,
  LineChart,
  Megaphone,
  ShoppingCart,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Single source of truth for all 5 Sheet Workspace variants. Preview-only — no API. */

export type SyncStatus = "fresh" | "stale" | "syncing" | "error";

export type MockSource = {
  id: string;
  title: string;
  gid: string;
  icon: LucideIcon;
  tone: "cyan" | "sky" | "emerald" | "purple" | "amber" | "rose";
  group: "Bán hàng" | "Vận hành";
  rows: number;
  cols: number;
  /** Freshness 0–100 — 100 = vừa sync, thấp = cũ. */
  fresh: number;
  status: SyncStatus;
  lastSynced: string;
};

export type MockColumn = {
  key: string;
  label: string;
  type: "text" | "num" | "date" | "tag";
  visible: boolean;
};

export type MockLog = {
  id: string;
  source: string;
  status: SyncStatus;
  time: string;
  note: string;
};

export type MockOption = {
  key: string;
  label: string;
  value: string;
  hint: string;
};

export const MOCK = {
  sources: [
    {
      id: "revenue-t6",
      title: "Doanh thu T6",
      gid: "0",
      icon: LineChart,
      tone: "cyan",
      group: "Bán hàng",
      rows: 1240,
      cols: 9,
      fresh: 96,
      status: "fresh",
      lastSynced: "2 phút trước",
    },
    {
      id: "orders-ttus",
      title: "Đơn hàng TikTok US",
      gid: "418827",
      icon: ShoppingCart,
      tone: "sky",
      group: "Bán hàng",
      rows: 8612,
      cols: 14,
      fresh: 60,
      status: "syncing",
      lastSynced: "đang đồng bộ…",
    },
    {
      id: "customers-vip",
      title: "Khách hàng VIP",
      gid: "771204",
      icon: Users,
      tone: "emerald",
      group: "Bán hàng",
      rows: 312,
      cols: 7,
      fresh: 88,
      status: "fresh",
      lastSynced: "11 phút trước",
    },
    {
      id: "inventory",
      title: "Kho hàng",
      gid: "330918",
      icon: Boxes,
      tone: "amber",
      group: "Vận hành",
      rows: 540,
      cols: 8,
      fresh: 28,
      status: "stale",
      lastSynced: "6 giờ trước",
    },
    {
      id: "ads-cost",
      title: "Chi phí Ads",
      gid: "990521",
      icon: Megaphone,
      tone: "rose",
      group: "Vận hành",
      rows: 0,
      cols: 0,
      fresh: 0,
      status: "error",
      lastSynced: "thất bại",
    },
  ] satisfies MockSource[],

  activeId: "revenue-t6",

  /** Header stats — khớp SheetHubChrome thật (sheets / active) + mở rộng rows/cols. */
  stats: { sheets: 5, active: 1, rows: 1240, cols: 9 },

  columns: [
    { key: "date", label: "Ngày", type: "date", visible: true },
    { key: "order", label: "Mã ĐH", type: "text", visible: true },
    { key: "product", label: "Sản phẩm", type: "text", visible: true },
    { key: "qty", label: "SL", type: "num", visible: true },
    { key: "price", label: "Đơn giá", type: "num", visible: true },
    { key: "total", label: "Thành tiền", type: "num", visible: true },
    { key: "channel", label: "Kênh", type: "tag", visible: true },
    { key: "province", label: "Tỉnh", type: "text", visible: false },
    { key: "state", label: "Trạng thái", type: "tag", visible: false },
  ] satisfies MockColumn[],

  /** CSV preview — header + vài dòng cho grid giữa. */
  grid: {
    header: ["Ngày", "Mã ĐH", "Sản phẩm", "SL", "Đơn giá", "Thành tiền", "Kênh"],
    rows: [
      ["18/06", "DH-20481", "Áo thun Cat Dad", "3", "159.000", "477.000", "TikTok"],
      ["18/06", "DH-20480", "Hoodie Nurse Life", "1", "329.000", "329.000", "Shopee"],
      ["18/06", "DH-20479", "Mug Dog Mom", "5", "89.000", "445.000", "TikTok"],
      ["17/06", "DH-20478", "Áo thun Cat Dad", "2", "159.000", "318.000", "Web"],
      ["17/06", "DH-20477", "Tote bag Plant Lady", "4", "119.000", "476.000", "TikTok"],
      ["17/06", "DH-20476", "Hoodie Nurse Life", "1", "329.000", "329.000", "Shopee"],
    ],
  },

  options: [
    { key: "fit", label: "Vừa cột", value: "Cân đều", hint: "equal / weighted / nội dung" },
    { key: "wrap", label: "Xuống dòng", value: "Tắt", hint: "Cell 1 dòng, cắt …" },
    { key: "hidden", label: "Ẩn cột", value: "2 cột", hint: "Tỉnh · Trạng thái" },
    { key: "page", label: "Mỗi trang", value: "50 dòng", hint: "Theo prefs hub" },
    { key: "freeze", label: "Ghim cột", value: "1 cột đầu", hint: "Cuộn ngang vẫn thấy" },
  ] satisfies MockOption[],

  log: [
    { id: "s-9", source: "Doanh thu T6", status: "fresh", time: "09:14:02", note: "1.240 dòng · 9 cột" },
    { id: "s-8", source: "Khách hàng VIP", status: "fresh", time: "09:05:33", note: "312 dòng" },
    { id: "s-7", source: "Đơn hàng TikTok US", status: "syncing", time: "09:14:40", note: "8.612 dòng — 62%" },
    { id: "s-6", source: "Kho hàng", status: "stale", time: "03:11:20", note: "Quá 6 giờ — nên sync lại" },
    { id: "s-5", source: "Chi phí Ads", status: "error", time: "09:12:08", note: "403 — bật 'Anyone with link'" },
    { id: "s-4", source: "Doanh thu T6", status: "fresh", time: "08:44:51", note: "Phát hiện header dòng 2" },
  ] satisfies MockLog[],

  filters: [
    { key: "channel", label: "Kênh", value: "TikTok" },
    { key: "month", label: "Tháng", value: "06/2026" },
  ],
} as const;

export const STATUS_META: Record<SyncStatus, { label: string; cls: string; dot: string }> = {
  fresh: { label: "Mới", cls: "text-emerald-300", dot: "bg-emerald-400" },
  stale: { label: "Cũ", cls: "text-amber-300", dot: "bg-amber-400" },
  syncing: { label: "Đang sync", cls: "text-cyan-300", dot: "bg-cyan-400 swpv-pulse" },
  error: { label: "Lỗi", cls: "text-rose-300", dot: "bg-rose-400" },
};
