import { fetchLatestExtensionRelease, type ExtensionReleaseInfo } from "./extensionReleaseApi";

/** Download extension ZIP (GitHub release asset). Opens tab if fetch/CORS fails. */
export async function triggerExtensionZipDownload(
  info?: ExtensionReleaseInfo,
): Promise<ExtensionReleaseInfo> {
  const release = info ?? (await fetchLatestExtensionRelease());
  try {
    const res = await fetch(release.zipUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = release.zipName;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  } catch {
    window.open(release.zipUrl, "_blank", "noopener,noreferrer");
  }
  return release;
}
