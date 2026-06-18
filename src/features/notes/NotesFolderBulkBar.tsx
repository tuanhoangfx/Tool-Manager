import { HubDirectoryCrudBulkActions, type HubDirectoryCrudBulkActionsProps } from "@tool-workspace/hub-ui";

type Props = Omit<HubDirectoryCrudBulkActionsProps, "onPrimary" | "extra"> & {
  onAdd: () => void;
  embedded?: boolean;
};

/** Notes folder directory — golden HubDirectoryCrudBulkActions preset (filter row 2). */
export function NotesFolderBulkBar({ onAdd, embedded, ...rest }: Props) {
  return (
    <HubDirectoryCrudBulkActions
      {...rest}
      embedded={embedded}
      onPrimary={onAdd}
      primaryLabel="Add folder"
      primaryTitle="Create a new folder"
      editTitle="Rename or recolor folder"
      editTitleWhenMulti="Select one folder to edit"
      editTitleWhenNone="Select folders to edit"
      deleteTitle="Delete selected folders"
      deleteTitleWhenNone="Select folders to delete"
    />
  );
}
