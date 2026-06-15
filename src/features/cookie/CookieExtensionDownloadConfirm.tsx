import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Archive,
  Download,
  ExternalLink,
  Package,
  RefreshCw,
  ShoppingBag,
  Tag,
} from "lucide-react";
import {
  HubToolDetailModal,
  HubToolDetailModalPrimaryAction,
  HubToolDetailModalSecondaryAction,
  HubToolDetailSection,
  HUB_TOOL_DETAIL_SCROLL_ROOT,
  HUB_TOOL_DETAIL_SECTIONS_CLASS,
  compactIconSize,
} from "@tool-workspace/hub-ui";

import { TocSectionNav } from "../overview/TocSectionNav";
import { EXTENSION_BUILD } from "./extensionBuildInfo";
import { E0001_ICON_URL } from "./extensionBrand";
import { EXTENSION_CWS_LISTING_STATUS, type ExtensionCwsListingStatus } from "./extensionCwsBuildInfo";
import {
  EXTENSION_CHROME_WEB_STORE_LABEL,
  EXTENSION_CHROME_WEB_STORE_URL,
  EXTENSION_GITHUB_ZIP_LABEL,
  EXTENSION_HEADER_LABEL,
  getChromeWebStoreListingChipStatus,
  getChromeWebStoreUpdateStatus,
  getExtensionInstallLabel,
  hasChromeWebStoreInstall,
} from "./extensionInstall";
import { CookieExtensionInstallSteps } from "./CookieExtensionInstallSteps";
import { EXTENSION_DOWNLOAD_TOC, extensionDownloadSectionTitle } from "./extension-download-toc";
import { fetchLatestExtensionRelease, type ExtensionReleaseInfo } from "./extensionReleaseApi";
import { triggerExtensionZipDownload } from "./extensionDownload";
import { useExtensionRelease } from "./useExtensionRelease";

const ID_PREFIX = "ext-dl-";

type Props = {
  open: boolean;
  onClose: () => void;
};

function FieldRow({
  icon: Icon,
  iconClass,
  label,
  children,
}: {
  icon: typeof Tag;
  iconClass: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <tr className="border-t border-white/5 first:border-0 transition-colors hover:bg-white/[.02]">
      <th className="w-32 py-2 pr-3 font-medium text-[var(--muted)]">
        <span className="inline-flex items-center gap-1.5">
          <Icon size={compactIconSize(11)} className={iconClass} aria-hidden />
          {label}
        </span>
      </th>
      <td className="py-2 text-[var(--text)]">{children}</td>
    </tr>
  );
}

function CwsListingChip({ status }: { status: ExtensionCwsListingStatus }) {
  if (status === "in_review") {
    return (
      <span
        className="cookie-dl-modal__cws-chip cookie-dl-modal__cws-chip--review"
        title="New version pending Chrome Web Store review"
      >
        <span className="cookie-dl-modal__cws-chip-dot" aria-hidden />
        In review
      </span>
    );
  }
  if (status === "published") {
    return (
      <span
        className="cookie-dl-modal__cws-chip cookie-dl-modal__cws-chip--live"
        title="Extension is live on Chrome Web Store"
      >
        <span className="cookie-dl-modal__cws-chip-dot" aria-hidden />
        Published
      </span>
    );
  }
  return null;
}

export function CookieExtensionDownloadConfirm({ open, onClose }: Props) {
  const bundled = useExtensionRelease();
  const [preview, setPreview] = useState<ExtensionReleaseInfo>(bundled);
  const [zipBusy, setZipBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listingChipStatus = getChromeWebStoreListingChipStatus();
  const updateStatus = getChromeWebStoreUpdateStatus();
  const updateVersion = preview.version || EXTENSION_BUILD.version;

  const sectionIds = useMemo(
    () => EXTENSION_DOWNLOAD_TOC.map(({ id }) => `${ID_PREFIX}${id}`),
    [],
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    setPreview(bundled);
    let cancelled = false;
    void fetchLatestExtensionRelease()
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not refresh release info from GitHub. Using bundled version.");
      });
    return () => {
      cancelled = true;
    };
  }, [bundled, open]);

  const onStoreInstall = () => {
    if (zipBusy || !EXTENSION_CHROME_WEB_STORE_URL) return;
    window.open(EXTENSION_CHROME_WEB_STORE_URL, "_blank", "noopener,noreferrer");
    onClose();
  };

  const onGithubDownload = () => {
    if (zipBusy) return;
    setZipBusy(true);
    void (async () => {
      try {
        const latest = await fetchLatestExtensionRelease();
        await triggerExtensionZipDownload(latest);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Download failed.");
      } finally {
        setZipBusy(false);
      }
    })();
  };

  const footer = hasChromeWebStoreInstall() ? (
    <>
      <HubToolDetailModalSecondaryAction
        label={zipBusy ? "Please wait…" : EXTENSION_GITHUB_ZIP_LABEL}
        onClick={onGithubDownload}
        disabled={zipBusy}
      />
      <HubToolDetailModalPrimaryAction
        label={EXTENSION_CHROME_WEB_STORE_LABEL}
        onClick={onStoreInstall}
        disabled={zipBusy}
        icon={ShoppingBag}
      />
    </>
  ) : (
    <HubToolDetailModalPrimaryAction
      label="Confirm download"
      onClick={onGithubDownload}
      disabled={zipBusy}
      busy={zipBusy}
      icon={Download}
    />
  );

  return (
    <HubToolDetailModal
      open={open}
      onClose={onClose}
      title={EXTENSION_HEADER_LABEL}
      titleId="cookie-extension-download-title"
      headerImageUrl={E0001_ICON_URL}
      sectionIds={sectionIds}
      scrollRootSelector={HUB_TOOL_DETAIL_SCROLL_ROOT}
      footer={footer}
      toc={
        <TocSectionNav
          items={EXTENSION_DOWNLOAD_TOC}
          idPrefix={ID_PREFIX}
          scrollRootSelector={HUB_TOOL_DETAIL_SCROLL_ROOT}
        />
      }
    >
      <div className={HUB_TOOL_DETAIL_SECTIONS_CLASS}>
        <HubToolDetailSection id={`${ID_PREFIX}release`} title={extensionDownloadSectionTitle("release")}>
          <table className="w-full text-left text-xs">
            <tbody>
              <FieldRow icon={Tag} iconClass="text-indigo-300" label="Latest">
                <span className="cookie-dl-modal__latest-row">
                  <span className="font-semibold tabular-nums text-indigo-200">v{preview.version}</span>
                  <a
                    href={preview.releasePage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cookie-dl-modal__latest-link"
                  >
                    <ExternalLink size={13} aria-hidden />
                    <span>Open GitHub release</span>
                  </a>
                </span>
              </FieldRow>
              <FieldRow icon={Archive} iconClass="text-slate-400" label="Bundled">
                <span className="tabular-nums">
                  v{EXTENSION_BUILD.version} · {EXTENSION_BUILD.updated}
                </span>
              </FieldRow>
              <FieldRow icon={Package} iconClass="text-amber-300" label="Package">
                <span className="font-mono text-[11px] break-all">{preview.zipName}</span>
              </FieldRow>
              <FieldRow icon={ShoppingBag} iconClass="text-emerald-300" label="Install">
                {getExtensionInstallLabel()}
              </FieldRow>
              {hasChromeWebStoreInstall() && EXTENSION_CHROME_WEB_STORE_URL ? (
                <>
                  <FieldRow icon={ShoppingBag} iconClass="text-emerald-300" label="Chrome Store">
                    <span className="cookie-dl-modal__store-cell">
                      <CwsListingChip status={listingChipStatus} />
                      <a
                        href={EXTENSION_CHROME_WEB_STORE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cookie-dl-modal__latest-link cookie-dl-modal__store-link"
                      >
                        <ExternalLink size={13} aria-hidden />
                        <span className="font-mono text-[11px] break-all">{EXTENSION_CHROME_WEB_STORE_URL}</span>
                      </a>
                    </span>
                  </FieldRow>
                  <FieldRow icon={RefreshCw} iconClass="text-sky-300" label="Update">
                    <span className="cookie-dl-modal__latest-row">
                      <span className="font-semibold tabular-nums text-sky-200">v{updateVersion}</span>
                      {updateStatus ? (
                        <CwsListingChip status={updateStatus} />
                      ) : EXTENSION_CWS_LISTING_STATUS === "published" ? (
                        <span className="text-[11px] text-emerald-200/90">Live on Store</span>
                      ) : null}
                    </span>
                  </FieldRow>
                </>
              ) : null}
            </tbody>
          </table>
        </HubToolDetailSection>

        <HubToolDetailSection id={`${ID_PREFIX}install`} title={extensionDownloadSectionTitle("install")}>
          <CookieExtensionInstallSteps onDownloadZip={onGithubDownload} zipBusy={zipBusy} />
        </HubToolDetailSection>

        {error ? (
          <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            {error}
          </p>
        ) : null}
      </div>
    </HubToolDetailModal>
  );
}
