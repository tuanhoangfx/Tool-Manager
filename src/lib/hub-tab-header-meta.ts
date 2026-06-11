import { Tag } from "lucide-react";
import { formatTabHeaderTimestamp, type TabHeaderMetaItem } from "@tool-workspace/hub-ui";
import { APP_VERSION } from "./app-meta";

export { formatTabHeaderTimestamp };

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
