import { useEffect, useState, type ReactNode } from "react";
import { ArrowDownWideNarrow, WifiOff } from "lucide-react";
import {
  HubDisplayPrefs,
  HubToolDetailSection,
  ToggleRow,
  type HubDisplayPrefsProps,
  type HubTocNavItem,
  type PrefItem,
} from "@tool-workspace/hub-ui";
import { readAppScreen } from "../../lib/app-screen";
import { useOfflineMode } from "../../lib/offlineMode";
import { patchHubListPrefs, readHubListPrefs, subscribeHubListPrefs } from "../../lib/url-prefs";
import { compactIconSize } from "../../lib/ui-scale";

export type { PrefItem };

type DisplayPrefsProps = Omit<
  HubDisplayPrefsProps,
  "getScreen" | "showNavToggle" | "hideSearchPinOnSystem" | "readPrefs" | "patchPrefs"
> & {
  readPrefs?: HubDisplayPrefsProps["readPrefs"];
  patchPrefs?: HubDisplayPrefsProps["patchPrefs"];
  generalSectionToc?: HubTocNavItem[];
  /** Extra toggles rendered inside App mode (e.g. 2FA mask password). */
  appModeExtras?: ReactNode;
};

function OfflineModeSection({ extras }: { extras?: ReactNode }) {
  const { offline, toggle: toggleOffline } = useOfflineMode();
  return (
    <HubToolDetailSection
      id="settings-app-mode"
      title="App mode"
      icon={<WifiOff size={compactIconSize(11)} className="text-rose-300" />}
    >
      <ToggleRow label="Offline mode (limited features)" on={offline} onChange={toggleOffline} />
      {extras}
    </HubToolDetailSection>
  );
}

const HEADER_SETTINGS_PANEL_WIDTH = 420;
const HEADER_SETTINGS_MAX_PANEL_HEIGHT = "min(80vh, 42rem)";

export function DisplayPrefs({
  generalExtras,
  generalSectionToc,
  appModeExtras,
  readPrefs = readHubListPrefs,
  patchPrefs = patchHubListPrefs,
  panelWidth = HEADER_SETTINGS_PANEL_WIDTH,
  maxPanelHeight = HEADER_SETTINGS_MAX_PANEL_HEIGHT,
  ...props
}: DisplayPrefsProps) {
  const [, setTick] = useState(0);
  useEffect(() => subscribeHubListPrefs(() => setTick((n) => n + 1)), []);

  return (
    <HubDisplayPrefs
      panelWidth={panelWidth}
      maxPanelHeight={maxPanelHeight}
      {...props}
      showNavToggle={false}
      hideSearchPinOnSystem
      filtersFromUrl={props.filtersFromUrl ?? true}
      readPrefs={readPrefs}
      patchPrefs={patchPrefs}
      prefsChangeEvent="hub-list-prefs-change"
      getScreen={() => readAppScreen()}
      generalExtras={
        <>
          {generalExtras}
          <OfflineModeSection extras={appModeExtras} />
        </>
      }
      generalSectionToc={
        generalSectionToc ??
        (generalExtras
          ? [
              {
                id: "settings-list-sort",
                label: "List sort",
                icon: <ArrowDownWideNarrow size={compactIconSize(11)} className="text-sky-300" />,
              },
              {
                id: "settings-app-mode",
                label: "App mode",
                icon: <WifiOff size={compactIconSize(11)} className="text-rose-300" />,
              },
            ]
          : [
              {
                id: "settings-app-mode",
                label: "App mode",
                icon: <WifiOff size={compactIconSize(11)} className="text-rose-300" />,
              },
            ])
      }
      title="Settings"
    />
  );
}
