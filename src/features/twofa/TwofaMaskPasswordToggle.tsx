import { useEffect, useState } from "react";
import { ToggleRow } from "@tool-workspace/hub-ui";
import {
  readTwofaShowPasswordInTable,
  TWOFA_TABLE_DISPLAY_CHANGE_EVENT,
  writeTwofaShowPasswordInTable,
} from "./twofa-table-display-prefs";

const SHOW_PASSWORD_TOOLTIP =
  "Plain text in the password column and detail modal. Off shows •••• in the table (copy still works).";

/** Display setting — show or mask password in table and detail modal. */
export function TwofaShowPasswordToggle() {
  const [showPassword, setShowPassword] = useState(() => readTwofaShowPasswordInTable());

  useEffect(() => {
    const sync = () => setShowPassword(readTwofaShowPasswordInTable());
    window.addEventListener(TWOFA_TABLE_DISPLAY_CHANGE_EVENT, sync);
    return () => window.removeEventListener(TWOFA_TABLE_DISPLAY_CHANGE_EVENT, sync);
  }, []);

  return (
    <div title={SHOW_PASSWORD_TOOLTIP}>
      <ToggleRow
        label="Show password in table"
        on={showPassword}
        onChange={() => {
          const next = !showPassword;
          writeTwofaShowPasswordInTable(next);
          setShowPassword(next);
        }}
      />
    </div>
  );
}

/** @deprecated use TwofaShowPasswordToggle */
export const TwofaMaskPasswordToggle = TwofaShowPasswordToggle;
