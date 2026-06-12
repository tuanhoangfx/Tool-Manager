import type { LucideIcon } from "lucide-react";
import { ClipboardList, Cookie, FileText, Gauge, KeyRound, Settings2 } from "lucide-react";
import {
  HubLoadingView as HubLoadingViewBase,
  HubScreenChunkFallback,
  type HubLoadingViewProps,
} from "@tool-workspace/hub-ui";
import type { WorkspaceNavScreen } from "../../lib/workspace-screen";

export type { HubLoadingViewProps };

export function HubLoadingView(props: HubLoadingViewProps) {
  return <HubLoadingViewBase {...props} />;
}

export const WORKSPACE_LOADING_PRESETS = {
  notes: { icon: FileText, ariaLabel: "Loading notes" },
  todo: { icon: ClipboardList, ariaLabel: "Loading todo" },
  twofa: { icon: KeyRound, ariaLabel: "Loading 2FA" },
  cookie: { icon: Cookie, ariaLabel: "Loading cookie auto" },
  system: { icon: Settings2, ariaLabel: "Loading system" },
} as const satisfies Partial<Record<WorkspaceNavScreen, { icon: LucideIcon; ariaLabel: string }>>;

const FALLBACK_LOADER = { icon: Gauge, ariaLabel: "Loading" } as const;

/** P0016 `ConsoleLoadingView` parity — Suspense chunk fallback with Hub orb loader. */
export function WorkspaceLoadingView({
  screen,
  variant = "overlay",
  enabled = true,
  portaled = true,
}: {
  screen: WorkspaceNavScreen;
  variant?: HubLoadingViewProps["variant"];
  /** When false, hidden eager-mounted tabs must not portal over the active screen. */
  enabled?: boolean;
  /** Main-pane portal center (P0004). Use false only for nested panels. */
  portaled?: boolean;
}) {
  const preset = WORKSPACE_LOADING_PRESETS[screen as keyof typeof WORKSPACE_LOADING_PRESETS] ?? FALLBACK_LOADER;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <HubScreenChunkFallback
        icon={preset.icon}
        ariaLabel={preset.ariaLabel}
        variant={variant}
        enabled={enabled}
        portaled={portaled}
      />
    </div>
  );
}

/** Directory tab initial fetch — portaled orb centered in main pane. */
export function WorkspacePaneLoading({
  screen,
  enabled = true,
}: {
  screen: WorkspaceNavScreen;
  enabled?: boolean;
}) {
  const preset = WORKSPACE_LOADING_PRESETS[screen as keyof typeof WORKSPACE_LOADING_PRESETS] ?? FALLBACK_LOADER;
  return (
    <HubLoadingView
      icon={preset.icon}
      ariaLabel={preset.ariaLabel}
      variant="overlay"
      enabled={enabled}
    />
  );
}
