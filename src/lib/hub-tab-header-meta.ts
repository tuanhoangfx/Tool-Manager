import { Tag } from "lucide-react";
import type { TabHeaderMetaItem } from "@tool-workspace/hub-ui";
import { APP_VERSION } from "./app-meta";

/** Header release line — `14:32 05/06/26` (local time). Golden P0004 Hub. */
export function formatTabHeaderTimestamp(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${hh}:${mm} ${dd}/${mo}/${yy}`;
}

/** Left rail meta — `v4.x · hh:mm dd/mm/yy` (P0004 Hub parity). */
export function buildVersionMetaItems(releaseTimestamp: string, live?: boolean): TabHeaderMetaItem[] {
  return [
    {
      icon: Tag,
      value: `v${APP_VERSION} · ${releaseTimestamp}`,
      live,
    },
  ];
}
