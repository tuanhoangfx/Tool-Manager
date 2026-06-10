import { SpinnerIcon } from "./components/Icons";

type IconProps = { size?: number; className?: string };

/** Kanban-aligned in-progress glyph — radial spinner (not lucide Loader2). */
export function TodoInProgressIcon({ size = 18, className = "" }: IconProps) {
  return (
    <SpinnerIcon
      size={size}
      className={`todo-inprogress-icon animate-spin text-indigo-500 ${className}`.trim()}
    />
  );
}
