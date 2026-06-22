import type { TabHeaderMetaItem } from "../../components/sales-shell";
import { resolveAppVersionReleaseMeta } from "../../lib/app-release";
import { APP_VERSION } from "../../lib/app-meta";
import { buildVersionMetaItems } from "../../lib/hub-tab-header-meta";

/** P0020: version meta for WorkspaceTabHeader. */
export function buildWorkspaceVersionMetaItems(extra: TabHeaderMetaItem[] = []): TabHeaderMetaItem[] {
  const release = resolveAppVersionReleaseMeta();
  return [...buildVersionMetaItems(release.publishedAt, release.live), ...extra];
}

export function workspaceVersionLine(): {
  line: string;
  publishedAt?: string;
  live: boolean;
} {
  const release = resolveAppVersionReleaseMeta();
  return {
    line: `v${APP_VERSION}`,
    publishedAt: release.publishedAt,
    live: release.live,
  };
}
