import type { ReactNode } from "react";
import { useMemo } from "react";
import { translations } from "@/todo/translations";
import type { ColorScheme } from "@/todo/context/SettingsContext";
import { SettingsContext } from "@/todo/context/SettingsContext";
import type { Task } from "@/todo/types";
import { useLocalStorage } from "@/todo/hooks/useLocalStorage";

type Props = { children: ReactNode };

/** Todo tab settings — theme scoped to todo board (no nested ToastProvider). */
export function TodoSettingsProvider({ children }: Props) {
  const [theme, setTheme] = useLocalStorage<"light" | "dark">("todo_theme", "dark");
  const [rawColorScheme, setRawColorScheme] = useLocalStorage<ColorScheme | "ocean">(
    "todo_colorScheme",
    "sky",
  );
  const [language, setLanguage] = useLocalStorage<keyof typeof translations>("todo_language", "en");
  const [defaultDueDateOffset, setDefaultDueDateOffset] = useLocalStorage<number>(
    "taskDefaults_dueDateOffset",
    0,
  );
  const [defaultPriority, setDefaultPriority] = useLocalStorage<Task["priority"]>(
    "taskDefaults_priority",
    "medium",
  );
  const [timezone, setTimezone] = useLocalStorage<string>("timezone", "Asia/Ho_Chi_Minh");

  const colorScheme = rawColorScheme === "ocean" ? "amethyst" : (rawColorScheme as ColorScheme);
  const setColorScheme = (scheme: ColorScheme) => setRawColorScheme(scheme);
  const t = translations[language];

  const settingsValue = useMemo(
    () => ({
      theme,
      setTheme,
      colorScheme,
      setColorScheme,
      language,
      setLanguage,
      t,
      defaultDueDateOffset,
      setDefaultDueDateOffset,
      defaultPriority,
      setDefaultPriority,
      timezone,
      setTimezone,
    }),
    [
      theme,
      setTheme,
      colorScheme,
      setColorScheme,
      language,
      setLanguage,
      t,
      defaultDueDateOffset,
      setDefaultDueDateOffset,
      defaultPriority,
      setDefaultPriority,
      timezone,
      setTimezone,
    ],
  );

  return <SettingsContext.Provider value={settingsValue}>{children}</SettingsContext.Provider>;
}
