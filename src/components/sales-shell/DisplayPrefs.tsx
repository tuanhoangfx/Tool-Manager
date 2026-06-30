import { useEffect, useState, type ReactNode } from "react";
import {
  HubDisplayPrefs,
  type HubDisplayPrefsProps,
  type PrefItem,
} from "@tool-workspace/hub-ui";
import { readWorkspaceScreenFromLocation } from "../../features/hub/useHubNavigation";
import { patchHubListPrefs, readHubListPrefs, subscribeHubListPrefs } from "../../lib/url-prefs";

export type { PrefItem };

type DisplayPrefsProps = Omit<
  HubDisplayPrefsProps,
  "readPrefs" | "patchPrefs" | "getScreen" | "onLog" | "displayExtras" | "generalExtras"
> & {
  readPrefs?: HubDisplayPrefsProps["readPrefs"];
  patchPrefs?: HubDisplayPrefsProps["patchPrefs"];
  getScreen?: HubDisplayPrefsProps["getScreen"];
  /** @deprecated Prefer `displayExtras`. */
  generalExtras?: ReactNode;
  displayExtras?: ReactNode;
  /** Extra toggles rendered inside App mode (e.g. 2FA mask password). */
  appModeExtras?: ReactNode;
};

function workspaceSettingsScreen(): string {
  const screen = readWorkspaceScreenFromLocation();
  if (screen === "edit" || screen === "share") return "notes";
  return screen;
}

export function DisplayPrefs({
  generalExtras,
  displayExtras,
  appModeExtras,
  readPrefs = readHubListPrefs,
  patchPrefs = patchHubListPrefs,
  getScreen = workspaceSettingsScreen,
  ...props
}: DisplayPrefsProps) {
  const [, setTick] = useState(0);
  useEffect(() => subscribeHubListPrefs(() => setTick((n) => n + 1)), []);

  const toolExtras = displayExtras ?? generalExtras;

  return (
    <HubDisplayPrefs
      {...props}
      readPrefs={readPrefs}
      patchPrefs={patchPrefs}
      getScreen={getScreen}
      onLog={(scope, message) => {
        if (typeof window === "undefined") return;
        window.dispatchEvent(new CustomEvent("hub-app-log", { detail: { scope, message } }));
      }}
      displayExtras={toolExtras}
      title="Settings"
    />
  );
}
