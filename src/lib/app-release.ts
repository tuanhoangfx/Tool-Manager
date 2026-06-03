import { APP_VERSION } from "./app-meta";
import toolManifest from "../../tool.manifest.json";

function formatHubHeaderDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function normalizeVersion(value?: string) {
  return value?.replace(/^v/i, "") ?? "";
}

type ManifestRelease = {
  latestPublished?: {
    tag?: string;
    publishedAt?: string;
  };
};

/** Build / GitHub release date for Hub-style tab headers. */
export function resolveAppVersionReleaseMeta(): {
  shortLabel: string;
  live: boolean;
} {
  const currentVersion = normalizeVersion(APP_VERSION);
  const latest = (toolManifest as { release?: ManifestRelease }).release?.latestPublished;

  if (normalizeVersion(latest?.tag) === currentVersion && latest?.publishedAt) {
    return {
      shortLabel: formatHubHeaderDate(latest.publishedAt),
      live: true,
    };
  }

  return { shortLabel: "—", live: false };
}
