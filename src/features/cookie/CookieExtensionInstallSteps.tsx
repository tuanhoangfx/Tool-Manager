import {
  Archive,
  Download,
  FolderOpen,
  Link2,
  Puzzle,
  ShoppingBag,
  ToggleRight,
  type LucideIcon,
} from "lucide-react";
import { compactIconSize } from "@tool-workspace/hub-ui";
import {
  EXTENSION_CHROME_WEB_STORE_URL,
  EXTENSION_STORE_INSTALL_STEPS,
  EXTENSION_UNPACKED_INSTALL_STEPS,
  hasChromeWebStoreInstall,
  type ExtensionInstallStep,
  type ExtensionInstallStepId,
} from "./extensionInstall";

type Props = {
  onDownloadZip?: () => void;
  zipBusy?: boolean;
};

const STEP_ICONS: Record<ExtensionInstallStepId, LucideIcon> = {
  store: ShoppingBag,
  download: Download,
  extract: Archive,
  chrome: Puzzle,
  devmode: ToggleRight,
  unpacked: FolderOpen,
  link: Link2,
};

function ThLabel({ icon: Icon, tone, children }: { icon: LucideIcon; tone: string; children: string }) {
  return (
    <span className="hub-users-th-label">
      <Icon size={compactIconSize(12)} className={`hub-users-th-icon ${tone}`} aria-hidden />
      <span className="hub-users-th-text">{children}</span>
    </span>
  );
}

function InstallStepsTable({
  steps,
  title,
  storeLink,
  onDownloadZip,
  zipBusy,
}: {
  steps: ExtensionInstallStep[];
  title: string;
  storeLink?: boolean;
  onDownloadZip?: () => void;
  zipBusy?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">{title}</p>
      <div className="overflow-x-auto rounded-lg border border-white/5 bg-black/10">
        <table className="w-full min-w-[420px] border-collapse text-left text-[12px]">
          <thead>
            <tr className="border-b border-white/5 bg-white/[.02] text-[10px] font-medium text-[var(--muted)]">
              <th className="w-10 px-2 py-2 text-center font-medium">#</th>
              <th className="px-3 py-2 font-medium">
                <ThLabel icon={Puzzle} tone="hub-users-th-icon--name">
                  Step
                </ThLabel>
              </th>
              <th className="px-3 py-2 font-medium">
                <ThLabel icon={Link2} tone="hub-users-th-icon--email">
                  Detail
                </ThLabel>
              </th>
            </tr>
          </thead>
          <tbody>
            {steps.map((step, index) => {
              const Icon = STEP_ICONS[step.id];
              return (
                <tr
                  key={`${title}-${step.id}`}
                  className="border-b border-white/5 last:border-0 transition-colors hover:bg-white/[.02]"
                >
                  <td className="px-2 py-2 text-center font-mono text-[11px] text-indigo-200/90">{index + 1}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5 font-medium text-[var(--text)]">
                      <Icon size={compactIconSize(12)} className="shrink-0 text-indigo-300/90" aria-hidden />
                      {storeLink && step.id === "store" ? (
                        <a
                          href={EXTENSION_CHROME_WEB_STORE_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-200 underline decoration-emerald-400/40 underline-offset-2 hover:text-emerald-100"
                        >
                          {step.title}
                        </a>
                      ) : step.id === "download" && onDownloadZip ? (
                        <button
                          type="button"
                          className="text-violet-200 underline decoration-violet-400/40 underline-offset-2 hover:text-violet-100"
                          onClick={onDownloadZip}
                          disabled={zipBusy}
                        >
                          {zipBusy ? "Downloading…" : step.title}
                        </button>
                      ) : (
                        step.title
                      )}
                      {step.symbol ? (
                        <code className="max-w-[10rem] truncate rounded border border-cyan-400/25 bg-cyan-500/10 px-1 py-0.5 font-mono text-[10px] text-cyan-200">
                          {step.symbol}
                        </code>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[var(--muted)]">{step.hint}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CookieExtensionInstallSteps({ onDownloadZip, zipBusy = false }: Props) {
  const showStore = hasChromeWebStoreInstall();

  return (
    <div className="space-y-4">
      {showStore ? (
        <InstallStepsTable
          title="Chrome Web Store"
          steps={EXTENSION_STORE_INSTALL_STEPS}
          storeLink
        />
      ) : null}
      <InstallStepsTable
        title={showStore ? "GitHub ZIP — Load unpacked" : "Load unpacked (GitHub ZIP)"}
        steps={EXTENSION_UNPACKED_INSTALL_STEPS}
        onDownloadZip={onDownloadZip}
        zipBusy={zipBusy}
      />
    </div>
  );
}
