import { createAuthSessionProvider } from "@tool-workspace/hub-ui";
import { useNotesAuthState, type NotesAuthState } from "./useNotesAuthState";

export const { AuthSessionProvider, useAuth: useNotesAuth } = createAuthSessionProvider<NotesAuthState>(
  useNotesAuthState,
  "useNotesAuth",
);
