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
  EXTENSION_UNPACKED_INSTALL_STEPS,
  getExtensionInstallSteps,
  hasChromeWebStoreInstall,
  isChromeWebStoreLive,
  type ExtensionInstallStepId,
} from "./extensionInstall";

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

export function CookieExtensionInstallSteps() {
  const steps = getExtensionInstallSteps();
  return (
    <div className="space-y-3">
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
                key={step.id}
                className="border-b border-white/5 last:border-0 transition-colors hover:bg-white/[.02]"
              >
                <td className="px-2 py-2 text-center font-mono text-[11px] text-indigo-200/90">{index + 1}</td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 font-medium text-[var(--text)]">
                    <Icon size={compactIconSize(12)} className="shrink-0 text-indigo-300/90" aria-hidden />
                    {step.title}
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
      {isChromeWebStoreLive() ? (
        <details className="rounded-lg border border-white/5 bg-white/[.02] px-3 py-2 text-[11px] text-[var(--muted)]">
          <summary className="cursor-pointer font-medium text-[var(--text)]">Fallback: Load unpacked (GitHub ZIP)</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-4">
            {EXTENSION_UNPACKED_INSTALL_STEPS.map((step) => (
              <li key={step.id}>
                <span className="text-[var(--text)]">{step.title}</span>
                {" — "}
                {step.hint}
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </div>
  );
}
