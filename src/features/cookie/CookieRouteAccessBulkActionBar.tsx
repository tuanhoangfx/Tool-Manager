import { HubDirectoryCrudBulkActions } from "@tool-workspace/hub-ui";

type Props = {
  hasSelection: boolean;
  selectedCount: number;
  canManage: boolean;
  shareBusy: boolean;
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

/** Cookie route access modal — Share / Edit / Revoke via golden bulk rail. */
export function CookieRouteAccessBulkActionBar({
  hasSelection,
  selectedCount,
  canManage,
  shareBusy,
  onAdd,
  onEdit,
  onDelete,
}: Props) {
  const editEnabled = canManage && hasSelection && selectedCount === 1;
  const deleteEnabled = canManage && hasSelection;

  return (
    <HubDirectoryCrudBulkActions
      hasSelection={hasSelection}
      selectedCount={selectedCount}
      onPrimary={onAdd}
      onEdit={onEdit}
      onDelete={onDelete}
      primaryLabel="Share"
      primaryTitle={canManage ? "Share access by User ID or email" : "Owner or manager only"}
      primaryDisabled={!canManage || shareBusy}
      editDisabled={!editEnabled}
      deleteDisabled={!deleteEnabled}
      editTitle="Edit access (Load or Sync)"
      editTitleWhenMulti="Select one member to edit"
      editTitleWhenNone={canManage ? "Select members to edit" : "Owner or manager only"}
      deleteTitle="Revoke access for selected members"
      deleteTitleWhenNone={canManage ? "Select members to revoke" : "Owner or manager only"}
    />
  );
}
