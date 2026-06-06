import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Archive,
  ExternalLink,
  FolderOpen,
  Package,
  Tag,
} from "lucide-react";
import {
  HubToolDetailModal,
  HubToolDetailModalPrimaryAction,
  HubToolDetailSection,
  HUB_TOOL_DETAIL_SCROLL_ROOT,
  HUB_TOOL_DETAIL_SECTIONS_CLASS,
} from "@tool-workspace/hub-ui";
import { compactIconSize } from "../../lib/ui-scale";
import { TocSectionNav } from "../overview/TocSectionNav";
import { EXTENSION_BUILD } from "./extensionBuildInfo";
import { E0001_ICON_URL } from "./extensionBrand";
import { EXTENSION_HEADER_LABEL, EXTENSION_INSTALL_LABEL } from "./extensionInstall";
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

export function CookieExtensionDownloadConfirm({ open, onClose }: Props) {
  const bundled = useExtensionRelease();
  const [preview, setPreview] = useState<ExtensionReleaseInfo>(bundled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const onConfirm = () => {
    if (busy) return;
    setBusy(true);
    void (async () => {
      try {
        const latest = await fetchLatestExtensionRelease();
        await triggerExtensionZipDownload(latest);
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Download failed.");
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <HubToolDetailModal
      open={open}
      onClose={onClose}
      title={EXTENSION_HEADER_LABEL}
      titleId="cookie-extension-download-title"
      headerImageUrl={E0001_ICON_URL}
      shellClassName="hub-header-panel-modal"
      sectionIds={sectionIds}
      scrollRootSelector={HUB_TOOL_DETAIL_SCROLL_ROOT}
      footer={
        <HubToolDetailModalPrimaryAction
          label="Confirm download"
          onClick={onConfirm}
          disabled={busy}
          busy={busy}
        />
      }
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
              <FieldRow icon={FolderOpen} iconClass="text-emerald-300" label="Install">
                {EXTENSION_INSTALL_LABEL}
              </FieldRow>
            </tbody>
          </table>
        </HubToolDetailSection>

        <HubToolDetailSection id={`${ID_PREFIX}install`} title={extensionDownloadSectionTitle("install")}>
          <CookieExtensionInstallSteps />
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
