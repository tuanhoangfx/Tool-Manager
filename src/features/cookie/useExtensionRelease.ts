import { useEffect, useState } from "react";
import { EXTENSION_BUILD } from "./extensionBuildInfo";
import { EXTENSION_RELEASE_PAGE, extensionReleaseZipUrl, getExtensionDownloadVersion } from "./extensionInstall";
import {
  fetchLatestExtensionRelease,
  getCachedExtensionRelease,
  type ExtensionReleaseInfo,
} from "./extensionReleaseApi";

function bundledFallback(): ExtensionReleaseInfo {
  const version = getExtensionDownloadVersion();
  const zipName = `E0001-cookie-bridge-v${version}.zip`;
  return {
    version,
    releasePage: EXTENSION_RELEASE_PAGE,
    zipUrl: extensionReleaseZipUrl(version),
    zipName,
  };
}

/** Resolves latest extension release links/version from GitHub (with bundled fallback). */
export function useExtensionRelease(): ExtensionReleaseInfo {
  const [info, setInfo] = useState<ExtensionReleaseInfo>(
    () => getCachedExtensionRelease() ?? bundledFallback(),
  );

  useEffect(() => {
    let cancelled = false;
    void fetchLatestExtensionRelease().then((data) => {
      if (!cancelled) setInfo(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return info;
}

export function useExtensionDisplayVersion(): string {
  const release = useExtensionRelease();
  const dev = EXTENSION_BUILD.version;
  if (release.version && release.version !== dev) return `${release.version} (dev ${dev})`;
  return release.version || dev;
}
