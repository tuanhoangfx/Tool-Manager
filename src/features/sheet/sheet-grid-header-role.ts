import type { HubTableColumnRole } from "@tool-workspace/hub-ui";

const HEADER_ROLE_BY_LABEL: Record<string, HubTableColumnRole> = {
  category: "category",
  platform: "scope",
  hyperlink: "url",
  link: "links",
  url: "url",
  feature: "tools",
  question: "notes",
  answer: "notes",
  status: "status",
  service: "service",
  import: "created",
  sheet: "name",
  name: "name",
  title: "name",
  date: "created",
  created: "created",
  updated: "updated",
  sync: "sync",
  type: "type",
};

/** Map dynamic CSV header labels to HubTableColumnHeader semantic roles (P0004 golden). */
export function resolveSheetGridHeaderRole(label: string): HubTableColumnRole {
  const key = label.trim().toLowerCase();
  if (HEADER_ROLE_BY_LABEL[key]) return HEADER_ROLE_BY_LABEL[key]!;
  if (key.includes("platform")) return "scope";
  if (key.includes("category")) return "category";
  if (key.includes("hyper") || key.includes("link") || key.includes("url")) return "url";
  if (key.includes("feature")) return "tools";
  if (key.includes("question") || key.includes("answer")) return "notes";
  if (key.includes("date") || key.includes("time") || key.includes("import")) return "created";
  if (key.includes("status")) return "status";
  return "name";
}
