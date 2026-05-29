import { useEffect, useState } from "react";
import { EXTENSION_BUILD } from "./extensionBuildInfo";
import { EXTENSION_RELEASE_PAGE, extensionReleaseZipUrl } from "./extensionInstall";
import {
  fetchLatestExtensionRelease,
  getCachedExtensionRelease,
  type ExtensionReleaseInfo,
} from "./extensionReleaseApi";

function bundledFallback(): ExtensionReleaseInfo {
  const version = EXTENSION_BUILD.version;
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
