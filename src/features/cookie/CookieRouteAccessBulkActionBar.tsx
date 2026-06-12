import { Pencil, Plus, Trash2 } from "lucide-react";

type Props = {
  hasSelection: boolean;
  selectedCount: number;
  canManage: boolean;
  shareBusy: boolean;
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

/** P0004 Users row-2 bulk actions — Share / Edit / Revoke access. */
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
    <div className="hub-bulk-action-bar">
      <button
        type="button"
        disabled={!canManage || shareBusy}
        onClick={onAdd}
        title={canManage ? "Share access by User ID or email" : "Owner or manager only"}
        className="hub-bulk-action-btn hub-bulk-action-btn--add"
      >
        <Plus size={14} aria-hidden />
        Share
      </button>
      <button
        type="button"
        disabled={!editEnabled}
        onClick={onEdit}
        title={
          !canManage
            ? "Owner or manager only"
            : selectedCount > 1
              ? "Select one member to edit"
              : "Edit access (Load or Sync)"
        }
        className="hub-bulk-action-btn hub-bulk-action-btn--edit"
      >
        <Pencil size={14} aria-hidden />
        Edit
        {hasSelection ? <span className="hub-bulk-action-count">{selectedCount}</span> : null}
      </button>
      <button
        type="button"
        disabled={!deleteEnabled}
        onClick={onDelete}
        title={canManage ? "Revoke access for selected members" : "Owner or manager only"}
        className="hub-bulk-action-btn hub-bulk-action-btn--delete"
      >
        <Trash2 size={14} aria-hidden />
        Delete
      </button>
    </div>
  );
}
