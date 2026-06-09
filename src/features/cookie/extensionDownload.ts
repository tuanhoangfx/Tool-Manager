import {
  clearExtensionReleaseCache,
  fetchLatestExtensionRelease,
  type ExtensionReleaseInfo,
} from "./extensionReleaseApi";

/** Download extension ZIP (GitHub release asset). Retries nearest release if URL 404. */
export async function triggerExtensionZipDownload(
  info?: ExtensionReleaseInfo,
): Promise<ExtensionReleaseInfo> {
  let release = info ?? (await fetchLatestExtensionRelease());

  const tryDownload = async (target: ExtensionReleaseInfo): Promise<boolean> => {
    const res = await fetch(target.zipUrl, { cache: "no-store" });
    if (!res.ok) return false;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = target.zipName;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  };

  if (await tryDownload(release).catch(() => false)) return release;

  clearExtensionReleaseCache();
  const retry = await fetchLatestExtensionRelease();
  if (retry.zipUrl !== release.zipUrl && (await tryDownload(retry).catch(() => false))) {
    return retry;
  }

  window.open(retry.zipUrl, "_blank", "noopener,noreferrer");
  return retry;
}
