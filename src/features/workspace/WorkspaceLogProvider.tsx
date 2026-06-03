import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { WorkspaceLogEntry } from "./workspace-log-types";

type WorkspaceLogContextValue = {
  logs: WorkspaceLogEntry[];
  addLog: (scope: string, message: string) => void;
};

const WorkspaceLogContext = createContext<WorkspaceLogContextValue | null>(null);

export function WorkspaceLogProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<WorkspaceLogEntry[]>(() => [
    {
      id: `boot-${Date.now()}`,
      at: Date.now(),
      scope: "P0020",
      message: "Data-Box workspace started",
    },
  ]);

  const addLog = useCallback((scope: string, message: string) => {
    setLogs((prev) => [
      {
        id: `${scope}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        at: Date.now(),
        scope,
        message,
      },
      ...prev,
    ].slice(0, 200));
  }, []);

  const value = useMemo(() => ({ logs, addLog }), [addLog, logs]);

  return <WorkspaceLogContext.Provider value={value}>{children}</WorkspaceLogContext.Provider>;
}

export function useWorkspaceLogs() {
  const ctx = useContext(WorkspaceLogContext);
  if (!ctx) {
    return {
      logs: [] as WorkspaceLogEntry[],
      addLog: () => {},
    };
  }
  return ctx;
}
