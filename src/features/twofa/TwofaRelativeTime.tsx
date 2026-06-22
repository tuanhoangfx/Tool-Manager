import { HubActivityTimestampLabel } from "@tool-workspace/hub-ui";

type Props = {
  iso: string | null | undefined;
  className?: string;
};

/** Relative activity timestamp — hub-ui SSOT (dot + age buckets). */
export function TwofaRelativeTime({ iso, className = "" }: Props) {
  if (!iso?.trim()) {
    return <span className={className || "hub-users-cell-muted"}>—</span>;
  }
  return (
    <span className={className}>
      <HubActivityTimestampLabel at={iso} />
    </span>
  );
}
