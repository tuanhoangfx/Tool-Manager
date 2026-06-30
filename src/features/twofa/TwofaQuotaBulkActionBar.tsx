import { CopyMinus, Monitor, RefreshCw, Tags, Upload } from "lucide-react";
import {
  HubBulkActionButton,
  HubDirectoryBulkActionRail,
  HubDirectoryCrudBulkActions,
  type HubDirectoryCrudBulkActionsProps,
} from "@tool-workspace/hub-ui";

type Props = Omit<HubDirectoryCrudBulkActionsProps, "onPrimary" | "extra" | "embedded"> & {
  onAdd: () => void;
  onSyncCockpit: () => void;
  onRefreshProbe: () => void;
  onStealthTest: () => void;
  onImportBackup: () => void;
  onBulkMeta?: () => void;
  syncing?: boolean;
  probing?: boolean;
};

/** Quota sub-view — Services shell + Cockpit / probe / stealth actions only. */
export function TwofaQuotaBulkActionBar({
  onAdd,
  onSyncCockpit,
  onRefreshProbe,
  onStealthTest,
  onImportBackup,
  onBulkMeta,
  syncing = false,
  probing = false,
  ...rest
}: Props) {
  const bulkMetaEnabled = Boolean(onBulkMeta && rest.hasSelection && rest.selectedCount > 1);

  return (
    <HubDirectoryBulkActionRail>
      <HubDirectoryCrudBulkActions {...rest} onPrimary={onAdd} embedded />
      {onBulkMeta ? (
        <HubBulkActionButton
          icon={<Tags size={14} aria-hidden />}
          label="Meta"
          title={
            bulkMetaEnabled
              ? "Edit status or note for selected accounts"
              : "Select 2+ accounts to edit status or note"
          }
          tone="sky"
          disabled={!bulkMetaEnabled}
          selectedCount={bulkMetaEnabled ? rest.selectedCount : undefined}
          onClick={onBulkMeta}
        />
      ) : null}
      <HubBulkActionButton
        icon={<Upload size={14} aria-hidden />}
        label={syncing ? "Syncing…" : "Sync Cockpit"}
        title="Import Cursor + Gemini accounts from Cockpit only"
        tone="sky"
        disabled={syncing}
        onClick={onSyncCockpit}
      />
      <HubBulkActionButton
        icon={<RefreshCw size={14} aria-hidden />}
        label={probing ? "Probing…" : "Refresh live"}
        title="Probe live quota for selected or visible enrolled accounts"
        tone="amber"
        disabled={probing || !rest.hasSelection}
        selectedCount={rest.hasSelection ? rest.selectedCount : undefined}
        onClick={onRefreshProbe}
      />
      <HubBulkActionButton
        icon={<Monitor size={14} aria-hidden />}
        label="Stealth test"
        title="Open Cursor login in P0003 Stealth profile (0012 / 0021 / 0069)"
        tone="amber"
        onClick={onStealthTest}
      />
      <HubBulkActionButton
        icon={<CopyMinus size={14} aria-hidden />}
        label="Backup JSON"
        title="Import Cockpit backup JSON (Cursor + Gemini only)"
        tone="sky"
        onClick={onImportBackup}
      />
    </HubDirectoryBulkActionRail>
  );
}
