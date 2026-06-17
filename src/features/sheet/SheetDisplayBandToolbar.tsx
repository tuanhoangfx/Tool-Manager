import { HubDirectoryDisplayPanel } from "@tool-workspace/hub-ui";
import { useWorkspaceDisplayPanelConfig } from "../workspace/workspace-display-panel-config";
import { SheetGridColumnWidthsResetAction } from "./SheetGridColumnWidthsResetAction";
import { SheetTableDisplaySettings } from "./SheetTableDisplaySettings";
import type { SheetColumnFit, SheetGridColumnPrefs, SheetTextAlign } from "./sheet-grid-prefs";

/** Sheet search-bar Display — header stats + table columns/wrap. */
export function SheetDisplayBandToolbar({
  sheetId,
  headers,
  hidden,
  onToggleColumn,
  wrap,
  onWrapChange,
  columnFit,
  onColumnFitChange,
  textAlign,
  onTextAlignChange,
  onResetColumnWidths,
}: {
  sheetId: string | null;
  headers: string[];
  hidden: Set<number>;
  onToggleColumn: (index: number) => void;
  wrap: boolean;
  onWrapChange: (wrap: boolean) => void;
  columnFit: SheetColumnFit;
  onColumnFitChange: (next: SheetColumnFit) => void;
  textAlign: SheetTextAlign;
  onTextAlignChange: (next: SheetTextAlign) => void;
  onResetColumnWidths: (next: SheetGridColumnPrefs) => void;
}) {
  const base = useWorkspaceDisplayPanelConfig({ screen: "sheet" });
  if (!base) return null;

  return (
    <HubDirectoryDisplayPanel
      {...base}
      tablePanel={
        <SheetTableDisplaySettings
          headers={headers}
          hidden={hidden}
          onToggle={onToggleColumn}
          wrap={wrap}
          onWrapChange={onWrapChange}
          columnFit={columnFit}
          onColumnFitChange={onColumnFitChange}
          textAlign={textAlign}
          onTextAlignChange={onTextAlignChange}
        />
      }
      tableSectionActions={
        <SheetGridColumnWidthsResetAction sheetId={sheetId} onReset={onResetColumnWidths} />
      }
      tableActiveCount={hidden.size}
    />
  );
}
