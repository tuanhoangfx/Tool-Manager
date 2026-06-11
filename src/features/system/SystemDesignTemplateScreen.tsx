import { DesignTemplatePage } from "./design-template/DesignTemplatePage";
import { useNotesAuth } from "../notes/useNotesAuth";

export function SystemDesignTemplateScreen() {
  const { session } = useNotesAuth();
  if (!session) return null;
  return <DesignTemplatePage />;
}
