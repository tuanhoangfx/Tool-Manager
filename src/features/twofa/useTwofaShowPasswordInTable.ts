import { useEffect, useState } from "react";
import {
  readTwofaShowPasswordInTable,
  TWOFA_TABLE_DISPLAY_CHANGE_EVENT,
} from "./twofa-table-display-prefs";

/** Sync table + detail modal with Display → Show password in table. */
export function useTwofaShowPasswordInTable(): boolean {
  const [show, setShow] = useState(() => readTwofaShowPasswordInTable());
  useEffect(() => {
    const sync = () => setShow(readTwofaShowPasswordInTable());
    window.addEventListener(TWOFA_TABLE_DISPLAY_CHANGE_EVENT, sync);
    return () => window.removeEventListener(TWOFA_TABLE_DISPLAY_CHANGE_EVENT, sync);
  }, []);
  return show;
}
