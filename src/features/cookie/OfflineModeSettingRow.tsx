import { useEffect } from "react";
import { SettingRow } from "../../components/SettingRow";
import { getOfflineMode, setOfflineMode, useOfflineMode } from "../../lib/offlineMode";

type Props = {
  onChanged?: (offline: boolean) => void;
};

export function OfflineModeSettingRow({ onChanged }: Props) {
  const { offline, setOfflineMode: setOffline } = useOfflineMode();

  useEffect(() => {
    // Ensure initial state is consistent even if loaded before hook.
    const v = getOfflineMode();
    if (v !== offline) setOffline(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SettingRow
      label="Offline mode"
      desc="Bypass Supabase auth gates when the backend is restricted. Cloud features will be limited."
    >
      <label className="flex items-center gap-2 text-[12px]">
        <input
          type="checkbox"
          checked={offline}
          onChange={(e) => {
            const next = e.target.checked;
            setOfflineMode(next);
            onChanged?.(next);
          }}
        />
        {offline ? "On" : "Off"}
      </label>
    </SettingRow>
  );
}

