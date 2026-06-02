import { DesignTemplatePage } from "./design-template/DesignTemplatePage";
import { useNotesAuth } from "../notes/useNotesAuth";
import { NotesAuthGate } from "../notes/NotesAuthGate";

export function SystemDesignTemplateScreen() {
  const { session } = useNotesAuth();
  if (!session) return <NotesAuthGate variant="system" />;
  return <DesignTemplatePage />;
}
