import { buildVersionMetaItems as hubBuildVersionMetaItems } from "@tool-workspace/hub-ui";
import { APP_VERSION } from "./app-meta";

export { formatTabHeaderTimestamp } from "@tool-workspace/hub-ui";

/** Left rail meta — `vX.Y.Z · [activity timestamp]` (hub-ui SSOT). */
export function buildVersionMetaItems(publishedAt?: string | null, live?: boolean) {
  return hubBuildVersionMetaItems(APP_VERSION, publishedAt ?? undefined, live);
}
