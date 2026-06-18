import {
  HubDirectoryCrudBulkActions,
  type HubDirectoryCrudBulkActionsProps,
} from "@tool-workspace/hub-ui";

type Props = Omit<HubDirectoryCrudBulkActionsProps, "onPrimary" | "extra"> & {
  onAdd: () => void;
  onDedupe?: () => void;
};

/** 2FA / Notes folder settings — golden HubDirectoryCrudBulkActions preset. */
export function TwofaBulkActionBar({ onAdd, onDedupe, ...rest }: Props) {
  return (
    <HubDirectoryCrudBulkActions
      {...rest}
      onPrimary={onAdd}
      editTitle="Edit selected"
      editTitleWhenMulti="Select one item to edit"
      editTitleWhenNone="Select items to edit"
      deleteTitle="Delete selected"
      deleteTitleWhenNone="Select items to delete"
      extra={
        onDedupe
          ? {
              label: "Dedupe",
              title: "Remove duplicate accounts (cloud + local, same platform + ID or secret)",
              onClick: onDedupe,
            }
          : undefined
      }
    />
  );
}
