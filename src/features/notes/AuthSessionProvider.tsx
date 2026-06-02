import { createContext, useContext, type ReactNode } from "react";
import { useNotesAuthState, type NotesAuthState } from "./useNotesAuthState";

const AuthSessionContext = createContext<NotesAuthState | null>(null);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const value = useNotesAuthState();
  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useNotesAuth(): NotesAuthState {
  const ctx = useContext(AuthSessionContext);
  if (!ctx) {
    throw new Error("useNotesAuth must be used within AuthSessionProvider");
  }
  return ctx;
}
