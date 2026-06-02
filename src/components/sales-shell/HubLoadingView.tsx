import { useEffect } from "react";
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
import { ensureHubTabLoaderRoot, HUB_TAB_LOADER_ROOT_ID } from "./HubLoaderRoot";

export type HubLoadingViewProps = {
  icon: LucideIcon;
  ariaLabel: string;
  variant?: "full" | "overlay" | "skeleton";
};

function getLoaderRoot() {
  if (typeof document === "undefined") return null;
  return document.getElementById(HUB_TAB_LOADER_ROOT_ID) ?? ensureHubTabLoaderRoot();
}

function HubLoaderOrb({ Icon }: { Icon: LucideIcon }) {
  const iconSize = compactIconSize(20);
  const gaugeSize = compactIconSize(14);
  return (
    <div className="hub-loader-orb" aria-hidden>
      <span className="hub-loader-orb__ring" />
      <span className="hub-loader-orb__ring hub-loader-orb__ring--dash" />
      <span className="hub-loader-orb__ring hub-loader-orb__ring--inner" />
      <span className="hub-loader-orb__glow" />
      <span className="hub-loader-orb__icon-box">
        <Icon size={iconSize} className="text-indigo-300" strokeWidth={1.75} />
      </span>
      <Gauge size={gaugeSize} className="hub-loader-orb__gauge" strokeWidth={2} aria-hidden />
    </div>
  );
}

function HubTabLoaderFill({ Icon, ariaLabel, dim = false }: { Icon: LucideIcon; ariaLabel: string; dim?: boolean }) {
  useEffect(() => {
    return () => {
      const root = document.getElementById(HUB_TAB_LOADER_ROOT_ID);
      if (root) root.replaceChildren();
    };
  }, []);

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
} as const satisfies Partial<Record<WorkspaceNavScreen, { icon: LucideIcon; ariaLabel: string }>>;

const FALLBACK_LOADER = { icon: Gauge, ariaLabel: "Loading" } as const;

export function WorkspaceLoadingView({
  screen,
  variant = "full",
}: {
  screen: WorkspaceNavScreen;
  variant?: HubLoadingViewProps["variant"];
}) {
  const preset = WORKSPACE_LOADING_PRESETS[screen as keyof typeof WORKSPACE_LOADING_PRESETS] ?? FALLBACK_LOADER;
  return <HubLoadingView icon={preset.icon} ariaLabel={preset.ariaLabel} variant={variant} />;
}
