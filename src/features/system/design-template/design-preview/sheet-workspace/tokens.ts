export type VariantToken = {
  num: string;
  id: "V1" | "V2" | "V3" | "V4" | "V5";
  title: string;
  /** One-line idea (lang) explaining the layout DIRECTION. */
  lang: string;
};

/** All 5 keep: chuẩn header Sheet + TOC sources trái + grid giữa + columns/options/log phải — khác nhau ở direction. */
export const VARIANTS: VariantToken[] = [
  {
    num: "V1",
    id: "V1",
    title: "Tri-Pane Grid cổ điển",
    lang: "TOC sources gom nhóm Bán hàng/Vận hành · grid CSV cuộn giữa · cột phải tách đôi Cột hiển thị (trên) + Sync log (dưới). Rail cố định, density power-user.",
  },
  {
    num: "V2",
    id: "V2",
    title: "Source Cards + Inspector tabs",
    lang: "TOC sources dạng thẻ có chip trạng thái sync · grid giữa · cột phải tab segmented Columns / Filters / Sync trong cùng khung inspector. Progressive disclosure.",
  },
  {
    num: "V3",
    id: "V3",
    title: "Icon-Rail + Data Console",
    lang: "TOC thu gọn thành rail icon mỗi source (hover hiện nhãn) · grid giữa kèm stat-bar rows/cols · cột phải console sync streaming kiểu terminal. Hướng monitoring real-time.",
  },
  {
    num: "V4",
    id: "V4",
    title: "Search-first + Column Manager",
    lang: "TOC search-first lọc nguồn nhanh · grid giữa inline · cột phải drawer Column Manager (checkbox + kéo thứ tự) trên + display prefs dưới. Hướng data-grid / quản cột.",
  },
  {
    num: "V5",
    id: "V5",
    title: "Gallery + Sync Timeline",
    lang: "TOC là thẻ source mini có freshness-bar + chip số dòng · grid giữa hero + toolbar lọc · cột phải timeline lịch sử sync dọc + cụm display options nổi. Hướng activity.",
  },
];
