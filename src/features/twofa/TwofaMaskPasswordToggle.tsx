import { useEffect, useState } from "react";
import { ToggleRow } from "@tool-workspace/hub-ui";
import {
  readTwofaMaskPasswordInTable,
  TWOFA_TABLE_DISPLAY_CHANGE_EVENT,
  writeTwofaMaskPasswordInTable,
} from "./twofa-table-display-prefs";

const MASK_PASSWORD_TOOLTIP = "Shows •••• in the table — click still copies plain text.";

/** App mode toggle — mask password column values in 2FA table. */
export function TwofaMaskPasswordToggle() {
  const [maskPassword, setMaskPassword] = useState(() => readTwofaMaskPasswordInTable());

  useEffect(() => {
    const sync = () => setMaskPassword(readTwofaMaskPasswordInTable());
    window.addEventListener(TWOFA_TABLE_DISPLAY_CHANGE_EVENT, sync);
    return () => window.removeEventListener(TWOFA_TABLE_DISPLAY_CHANGE_EVENT, sync);
  }, []);

  return (
    <div title={MASK_PASSWORD_TOOLTIP}>
      <ToggleRow
        label="Mask password in table"
        on={maskPassword}
        onChange={() => {
          const next = !maskPassword;
          writeTwofaMaskPasswordInTable(next);
          setMaskPassword(next);
        }}
      />
    </div>
  );
}
