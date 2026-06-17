import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Table2 } from "lucide-react";
import { HubSplitWorkspaceScreen, useHubChromePrefs, WorkspaceTabHeader } from "@tool-workspace/hub-ui";
import { readHubListPrefs, subscribeHubListPrefs } from "../../lib/url-prefs";
import { hubTabHeaderChromeProps } from "../../lib/hub-tab-header-chrome";
import { workspaceVersionLine } from "../workspace/workspace-tab-header-meta";
import { WorkspaceHeaderActions } from "../workspace/WorkspaceHeaderActions";
import { DEFAULT_SHEET_HEADER_STAT_KEYS } from "./sheet-display-prefs";
import type { SheetSource } from "./sheet-sources";

type Props = {
  sources: SheetSource[];
  active: SheetSource | null;
  children: ReactNode;
};

/** HubSplitWorkspaceScreen — Sheet tab header only (no global FilterBar). */
export function SheetHubChrome({ sources, active, children }: Props) {
  const [hubPrefs, setHubPrefs] = useState(readHubListPrefs);
  const chromePrefs = useHubChromePrefs();
  const version = useMemo(() => workspaceVersionLine(), []);

  useEffect(() => subscribeHubListPrefs(() => setHubPrefs(readHubListPrefs())), []);

  const visHeaderStats = hubPrefs.headerStats ?? DEFAULT_SHEET_HEADER_STAT_KEYS;
  const headerChrome = hubTabHeaderChromeProps(false, chromePrefs);

  return (
    <HubSplitWorkspaceScreen
      bodyClassName="sheet-workspace__body flex min-h-0 flex-1 overflow-hidden"
      header={
        <WorkspaceTabHeader
          ariaLabel="Sheet header"
          titleIcon={Table2}
          titleIconClass="text-cyan-300"
          title="Sheet"
          versionLine={version.line}
          versionLive={version.live}
          centerStats={[
            visHeaderStats.has("sheet-total")
              ? {
                  key: "sheet-total",
                  icon: Table2,
                  label: "sheets",
                  value: sources.length,
                  toneClass: "text-cyan-200",
                }
              : null,
            visHeaderStats.has("sheet-active")
              ? {
                  key: "sheet-active",
                  icon: Table2,
                  label: "active",
                  value: active ? 1 : 0,
                  toneClass: "text-indigo-200",
                }
              : null,
          ].filter((stat): stat is NonNullable<typeof stat> => stat !== null)}
          actions={<WorkspaceHeaderActions screen="sheet" />}
          pinSticky={headerChrome.pinSticky}
          dividerBelow={headerChrome.dividerBelow}
          embedded={headerChrome.embedded}
        />
      }
    >
      {children}
    </HubSplitWorkspaceScreen>
  );
}
