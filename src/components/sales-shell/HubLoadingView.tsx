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

export function WorkspaceLoadingView({
  screen,
  variant = "full",
}: {
  screen: WorkspaceNavScreen;
  variant?: HubLoadingViewProps["variant"];
}) {
  const preset = WORKSPACE_LOADING_PRESETS[screen as keyof typeof WORKSPACE_LOADING_PRESETS] ?? FALLBACK_LOADER;
  return <HubScreenChunkFallback icon={preset.icon} ariaLabel={preset.ariaLabel} variant={variant} />;
}
