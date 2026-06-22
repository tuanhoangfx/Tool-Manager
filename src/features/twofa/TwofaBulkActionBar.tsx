import { CopyMinus, Tags } from "lucide-react";
import {
  HubBulkActionButton,
  HubDirectoryBulkActionRail,
  HubDirectoryCrudBulkActions,
  type HubDirectoryCrudBulkActionsProps,
} from "@tool-workspace/hub-ui";

type Props = Omit<HubDirectoryCrudBulkActionsProps, "onPrimary" | "extra" | "embedded"> & {
  onAdd: () => void;
  onDedupe?: () => void;
  onBulkMeta?: () => void;
};

/** 2FA / Notes folder settings — golden HubDirectoryCrudBulkActions preset. */
export function TwofaBulkActionBar({ onAdd, onDedupe, onBulkMeta, ...rest }: Props) {
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
      {onDedupe ? (
        <HubBulkActionButton
          icon={<CopyMinus size={14} aria-hidden />}
          label="Dedupe"
          title="Remove duplicate accounts (cloud + local, same platform + ID or secret)"
          tone="amber"
          onClick={onDedupe}
        />
      ) : null}
    </HubDirectoryBulkActionRail>
  );
}
