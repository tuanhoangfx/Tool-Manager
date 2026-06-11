import { HubSearchField } from "@tool-workspace/hub-ui";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  shortcutScope?: string;
};

/** Todo modal search — delegates to shared HubSearchField. */
export function TodoHubSearchInput({ value, onChange, placeholder, className, shortcutScope }: Props) {
  return (
    <HubSearchField
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      shortcutScope={shortcutScope}
      showShortcutHint={false}
    />
  );
}
