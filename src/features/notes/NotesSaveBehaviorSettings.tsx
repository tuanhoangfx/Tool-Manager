import { useEffect, useState } from "react";
import { History, Save } from "lucide-react";
import { SettingsOptionFilter } from "../../lib/settings-option-filter";
import {
  NOTES_AUTOSAVE_OPTIONS,
  NOTES_AUTOSAVE_PREFS_CHANGE_EVENT,
  notesAutosaveLabel,
  readNotesAutosaveSeconds,
  writeNotesAutosaveSeconds,
  type NotesAutosaveSeconds,
} from "./notes-autosave-prefs";
import {
  NOTES_VERSION_INTERVAL_OPTIONS,
  NOTES_VERSION_PREFS_CHANGE_EVENT,
  notesVersionIntervalLabel,
  readNotesVersionIntervalMinutes,
  writeNotesVersionIntervalMinutes,
  type NotesVersionIntervalMinutes,
} from "./notes-version-prefs";

/** Notes Settings — autosave + version snapshots (F1: title + filter per section header). */
export function NotesSaveBehaviorSettings() {
  const [autosaveSec, setAutosaveSec] = useState(() => readNotesAutosaveSeconds());
  const [versionMin, setVersionMin] = useState(() => readNotesVersionIntervalMinutes());

  useEffect(() => {
    const syncAutosave = () => setAutosaveSec(readNotesAutosaveSeconds());
    const syncVersion = () => setVersionMin(readNotesVersionIntervalMinutes());
    window.addEventListener(NOTES_AUTOSAVE_PREFS_CHANGE_EVENT, syncAutosave);
    window.addEventListener(NOTES_VERSION_PREFS_CHANGE_EVENT, syncVersion);
    return () => {
      window.removeEventListener(NOTES_AUTOSAVE_PREFS_CHANGE_EVENT, syncAutosave);
      window.removeEventListener(NOTES_VERSION_PREFS_CHANGE_EVENT, syncVersion);
    };
  }, []);

  return (
    <>
      <SettingsOptionFilter
        filterKey="notes-autosave-delay"
        title="Autosave delay"
        icon={Save}
        iconClassName="text-emerald-300"
        options={NOTES_AUTOSAVE_OPTIONS}
        value={autosaveSec}
        onChange={(next) => {
          writeNotesAutosaveSeconds(next);
          setAutosaveSec(next);
        }}
        formatLabel={notesAutosaveLabel}
      />
      <SettingsOptionFilter
        filterKey="notes-version-interval"
        title="Version snapshot interval"
        icon={History}
        iconClassName="text-indigo-300"
        options={NOTES_VERSION_INTERVAL_OPTIONS}
        value={versionMin}
        onChange={(next) => {
          writeNotesVersionIntervalMinutes(next);
          setVersionMin(next);
        }}
        formatLabel={notesVersionIntervalLabel}
      />
    </>
  );
}

export function useNotesAutosaveDebounceMs() {
  const [ms, setMs] = useState(() => readNotesAutosaveSeconds() * 1000);

  useEffect(() => {
    const sync = () => setMs(readNotesAutosaveSeconds() * 1000);
    window.addEventListener(NOTES_AUTOSAVE_PREFS_CHANGE_EVENT, sync);
    return () => window.removeEventListener(NOTES_AUTOSAVE_PREFS_CHANGE_EVENT, sync);
  }, []);

  return ms;
}

export function useNotesVersionIntervalMinutes() {
  const [minutes, setMinutes] = useState(() => readNotesVersionIntervalMinutes());

  useEffect(() => {
    const sync = () => setMinutes(readNotesVersionIntervalMinutes());
    window.addEventListener(NOTES_VERSION_PREFS_CHANGE_EVENT, sync);
    return () => window.removeEventListener(NOTES_VERSION_PREFS_CHANGE_EVENT, sync);
  }, []);

  return minutes;
}
