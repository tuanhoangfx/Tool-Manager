import { KeyRound } from "lucide-react";
import { SettingsSubsection, buildSemanticTocIcon } from "@tool-workspace/hub-ui";
import { TwofaShowPasswordToggle } from "./TwofaMaskPasswordToggle";
import { TwofaTableColumnsSettings } from "./TwofaTableColumnsSettings";

/** 2FA Display panel — password visibility + table column toggles. */
export function TwofaTableDisplaySettings() {
  return (
    <div className="twofa-table-display-settings space-y-3">
      <SettingsSubsection label="Password" icon={<KeyRound size={12} className="text-amber-300" aria-hidden />}>
        <TwofaShowPasswordToggle />
      </SettingsSubsection>
      <SettingsSubsection label="Columns" icon={buildSemanticTocIcon("settings.table")}>
        <TwofaTableColumnsSettings />
      </SettingsSubsection>
    </div>
  );
}
