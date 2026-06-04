/** Note link share levels: private, read-only view, or editable via share token. */
export type NoteShareAccess = "private" | "view" | "edit";

export function shareAccessFromRow(row: {
  share_enabled: boolean;
  share_can_edit?: boolean | null;
}): NoteShareAccess {
  if (!row.share_enabled) return "private";
  return row.share_can_edit ? "edit" : "view";
}

export function shareFlagsFromAccess(access: NoteShareAccess): {
  share_enabled: boolean;
  share_can_edit: boolean;
} {
  switch (access) {
    case "edit":
      return { share_enabled: true, share_can_edit: true };
    case "view":
      return { share_enabled: true, share_can_edit: false };
    default:
      return { share_enabled: false, share_can_edit: false };
  }
}

export function shareAccessLabel(access: NoteShareAccess): string {
  switch (access) {
    case "edit":
      return "Edit link";
    case "view":
      return "View link";
    default:
      return "Only me";
  }
}
