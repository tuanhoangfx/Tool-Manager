import { CopyMinus, Pencil, Plus, Trash2 } from "lucide-react";

type Props = {
  hasSelection: boolean;
  selectedCount: number;
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDedupe?: () => void;
};

/** P0004 Users row2 bulk actions — shared Hub button skin. */
export function TwofaBulkActionBar({
  hasSelection,
  selectedCount,
  onAdd,
  onEdit,
  onDelete,
  onDedupe,
}: Props) {
  const editEnabled = hasSelection && selectedCount === 1;
  const deleteEnabled = hasSelection;

  return (
    <div className="hub-bulk-action-bar">
      <button type="button" onClick={onAdd} className="hub-bulk-action-btn hub-bulk-action-btn--add">
        <Plus size={14} aria-hidden />
        Add
      </button>
      <button
        type="button"
        disabled={!editEnabled}
        onClick={onEdit}
        title={hasSelection && selectedCount > 1 ? "Select one account to edit" : "Edit selected account"}
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
        title={hasSelection ? "Delete selected accounts" : "Select accounts to delete"}
        className="hub-bulk-action-btn hub-bulk-action-btn--delete"
      >
        <Trash2 size={14} aria-hidden />
        Delete
      </button>
      {onDedupe ? (
        <button
          type="button"
          onClick={onDedupe}
          title="Remove duplicate accounts (cloud + local, same platform + ID or secret)"
          className="hub-bulk-action-btn hub-bulk-action-btn--dedupe"
        >
          <CopyMinus size={14} aria-hidden />
          Dedupe
        </button>
      ) : null}
    </div>
  );
}
