import { useMemo } from "react";
import { buildHighlightSegments } from "../../lib/taskSearchHighlight";
import { TODO_HUB } from "../../styles/todo-hub-classes";

type Props = {
  text: string;
  terms: string[];
  className?: string;
};

export function TaskSearchHighlightText({ text, terms, className = "" }: Props) {
  const segments = useMemo(() => buildHighlightSegments(text, terms), [text, terms]);

  if (!terms.length) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.highlight ? (
          <mark key={index} className={TODO_HUB.searchHighlight}>
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </span>
  );
}
