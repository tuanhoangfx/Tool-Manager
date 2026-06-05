import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import {
  HubDisplayPrefs,
  Section,
  SectionIcon,
  ToggleRow,
  type HubDisplayPrefsProps,
  type PrefItem,
} from "@tool-workspace/hub-ui";
import { readAppScreen } from "../../lib/app-screen";
import { useOfflineMode } from "../../lib/offlineMode";
import { patchHubListPrefs, readHubListPrefs, subscribeHubListPrefs } from "../../lib/url-prefs";

export type { PrefItem };

type DisplayPrefsProps = Omit<
  HubDisplayPrefsProps,
  "getScreen" | "showNavToggle" | "hideSearchPinOnSystem" | "readPrefs" | "patchPrefs"
> & {
  readPrefs?: HubDisplayPrefsProps["readPrefs"];
  patchPrefs?: HubDisplayPrefsProps["patchPrefs"];
};

function OfflineModeSection() {
  const { offline, toggle: toggleOffline } = useOfflineMode();
  return (
    <Section icon={<SectionIcon icon={WifiOff} className="text-rose-300" />} label="App mode">
      <ToggleRow label="Offline mode (limited features)" on={offline} onChange={toggleOffline} />
    </Section>
  );
}

const HEADER_SETTINGS_PANEL_WIDTH = 420;
const HEADER_SETTINGS_MAX_PANEL_HEIGHT = "min(80vh, 42rem)";

export function DisplayPrefs({
  generalExtras,
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
          <OfflineModeSection />
        </>
      }
      title="Settings"
    />
  );
}
