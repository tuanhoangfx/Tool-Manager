import changelogRaw from "../../CHANGELOG.md?raw";
import { APP_VERSION } from "./app-meta";
import { formatTabHeaderTimestamp } from "./hub-tab-header-meta";
import toolManifest from "../../tool.manifest.json";

function normalizeVersion(value?: string) {
  return value?.replace(/^v/i, "") ?? "";
}

function parseChangelogTimestamp(version: string, changelog = changelogRaw): string | undefined {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const entry = changelog.match(
    new RegExp(`- Version:\\s*\`${escaped}\`[\\s\\S]*?- Timestamp:\\s*([^\\n]+)`, "i"),
  );
  const raw = entry?.[1]?.trim();
  if (!raw) return undefined;
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+\(UTC([+-]\d{1,2})\)$/i);
  if (!match) return raw;
  const [, date, time, offset] = match;
  const sign = offset.startsWith("-") ? "-" : "+";
  const hour = offset.replace(/^[+-]/, "").padStart(2, "0");
  return `${date}T${time}:00${sign}${hour}:00`;
}

type ManifestRelease = {
  latestPublished?: {
    tag?: string;
    publishedAt?: string;
  };
  manifestUpdatedAt?: string;
};

/** ISO timestamp baked into the bundle at Vite build (Vercel deploy time). */
function readBuiltAtIso(): string | undefined {
  const raw = import.meta.env.VITE_APP_BUILT_AT;
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

/** Build / deploy timestamp for Hub-style tab headers (P0004 golden). */
export function resolveAppVersionReleaseMeta(): {
  shortLabel: string;
  live: boolean;
  publishedAt?: string;
} {
  const builtAt = readBuiltAtIso();
  if (builtAt) {
    return {
      shortLabel: formatTabHeaderTimestamp(builtAt),
      live: true,
      publishedAt: builtAt,
    };
  }

  const currentVersion = normalizeVersion(APP_VERSION);
  const manifest = toolManifest as { release?: ManifestRelease; manifestUpdatedAt?: string };
  const latest = manifest.release?.latestPublished;

  if (normalizeVersion(latest?.tag) === currentVersion && latest?.publishedAt) {
    return {
      shortLabel: formatTabHeaderTimestamp(latest.publishedAt),
      live: true,
      publishedAt: latest.publishedAt,
    };
  }

  const changelogTimestamp = parseChangelogTimestamp(currentVersion);
  if (changelogTimestamp) {
    return {
      shortLabel: formatTabHeaderTimestamp(changelogTimestamp),
      live: false,
      publishedAt: changelogTimestamp,
    };
  }

  const manifestUpdatedAt = manifest.manifestUpdatedAt;
  if (manifestUpdatedAt) {
    return {
      shortLabel: formatTabHeaderTimestamp(manifestUpdatedAt),
      live: false,
      publishedAt: manifestUpdatedAt,
    };
  }

  return { shortLabel: "—", live: false };
}
