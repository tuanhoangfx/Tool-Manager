import { buildVersionMetaItems as buildVersionMetaItemsBase } from "@tool-workspace/hub-ui";
import type { TabHeaderMetaItem } from "../../components/sales-shell";
import { APP_VERSION } from "../../lib/app-meta";
import { resolveAppVersionReleaseMeta } from "../../lib/app-release";

/** P0020: version line + optional extra meta for WorkspaceTabHeader. */
export function buildWorkspaceVersionMetaItems(extra: TabHeaderMetaItem[] = []): TabHeaderMetaItem[] {
  const release = resolveAppVersionReleaseMeta();
  return buildVersionMetaItemsBase(`v${APP_VERSION} · ${release.shortLabel}`, release.live, extra);
}

export function workspaceVersionLine(): { line: string; live: boolean } {
  const release = resolveAppVersionReleaseMeta();
  return { line: `v${APP_VERSION} · ${release.shortLabel}`, live: release.live };
}
