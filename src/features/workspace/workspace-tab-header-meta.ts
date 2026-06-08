import type { TabHeaderMetaItem } from "../../components/sales-shell";
import { resolveAppVersionReleaseMeta } from "../../lib/app-release";
import { buildVersionMetaItems } from "../../lib/hub-tab-header-meta";

/** P0020: version line + optional extra meta for WorkspaceTabHeader. */
export function buildWorkspaceVersionMetaItems(extra: TabHeaderMetaItem[] = []): TabHeaderMetaItem[] {
  const release = resolveAppVersionReleaseMeta();
  return [...buildVersionMetaItems(release.shortLabel, release.live), ...extra];
}

export function workspaceVersionLine(): { line: string; live: boolean } {
  const release = resolveAppVersionReleaseMeta();
  const [meta] = buildVersionMetaItems(release.shortLabel, release.live);
  return { line: meta?.value ?? release.shortLabel, live: release.live };
}
