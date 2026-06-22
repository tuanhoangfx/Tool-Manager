import { useMemo } from "react";
import { HubDirectorySearchHighlightText } from "@tool-workspace/hub-ui";
import { TODO_HUB } from "../../styles/todo-hub-classes";

type Props = {
  text: string;
  terms: string[];
  className?: string;
};

export function TaskSearchHighlightText({ text, terms, className = "" }: Props) {
  const markClassName = useMemo(() => TODO_HUB.searchHighlight, []);
  return (
    <HubDirectorySearchHighlightText
      text={text}
      terms={terms}
      className={className}
      markClassName={markClassName}
    />
  );
}
