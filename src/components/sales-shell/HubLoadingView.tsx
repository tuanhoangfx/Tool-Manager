import { createPortal } from "react-dom";
import {
  Cookie,
  FileText,
  Gauge,
  KeyRound,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import type { WorkspaceNavScreen } from "../../lib/workspace-screen";
import { compactIconSize } from "../../lib/ui-scale";
import { HUB_TAB_LOADER_ROOT_ID } from "./HubLoaderRoot";

export type HubLoadingViewProps = {
  icon: LucideIcon;
  ariaLabel: string;
  variant?: "full" | "overlay" | "skeleton";
};

function getLoaderRoot() {
  if (typeof document === "undefined") return null;
  return document.getElementById(HUB_TAB_LOADER_ROOT_ID);
}

function HubLoaderOrb({ Icon }: { Icon: LucideIcon }) {
  return (
    <div className="relative mx-auto flex h-24 w-24 shrink-0 items-center justify-center" aria-hidden>
      <span className="absolute inset-0 rounded-full border border-indigo-400/20" />
      <span className="absolute inset-1 rounded-full border border-dashed border-cyan-400/25 anim-spin [animation-duration:12s]" />
      <span className="absolute inset-3 rounded-full border border-indigo-500/30 anim-spin [animation-duration:6s] [animation-direction:reverse]" />
      <span className="absolute inset-5 rounded-full bg-indigo-500/10 shadow-[0_0_24px_rgba(99,102,241,0.35)]" />
      <span className="absolute h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500/20 to-cyan-500/10 blur-md" />
      <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-400/35 bg-[var(--panel)] shadow-[0_0_20px_rgba(99,102,241,0.25)]">
        <Icon size={compactIconSize(20)} className="text-indigo-300" strokeWidth={1.75} />
      </div>
      <Gauge
        size={compactIconSize(14)}
        className="absolute -right-0.5 -top-0.5 text-cyan-300/90 anim-spin [animation-duration:3s]"
        strokeWidth={2}
      />
    </div>
  );
}

function HubTabLoaderFill({ Icon, ariaLabel, dim = false }: { Icon: LucideIcon; ariaLabel: string; dim?: boolean }) {
  const node = (
    <div
      className={`hub-tab-loader-fill${dim ? " hub-tab-loader-fill--dim" : ""}`}
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
    >
      <HubLoaderOrb Icon={Icon} />
    </div>
  );

  const root = getLoaderRoot();
  if (root) return createPortal(node, root);
  return node;
}

export function HubLoadingView({ icon: Icon, ariaLabel, variant = "full" }: HubLoadingViewProps) {
  return <HubTabLoaderFill Icon={Icon} ariaLabel={ariaLabel} dim={variant === "overlay"} />;
}

export const WORKSPACE_LOADING_PRESETS = {
  notes: { icon: FileText, ariaLabel: "Loading notes" },
  twofa: { icon: KeyRound, ariaLabel: "Loading 2FA" },
  cookie: { icon: Cookie, ariaLabel: "Loading cookie auto" },
  system: { icon: Settings2, ariaLabel: "Loading system" },
} as const satisfies Record<WorkspaceNavScreen, { icon: LucideIcon; ariaLabel: string }>;

export function WorkspaceLoadingView({
  screen,
  variant = "full",
}: {
  screen: WorkspaceNavScreen;
  variant?: HubLoadingViewProps["variant"];
}) {
  const preset = WORKSPACE_LOADING_PRESETS[screen];
  return <HubLoadingView icon={preset.icon} ariaLabel={preset.ariaLabel} variant={variant} />;
}
