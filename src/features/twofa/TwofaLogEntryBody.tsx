import { HubTableColumnHeader } from "@tool-workspace/hub-ui";
import type { TwofaAccountLogChange, TwofaAccountLogEntry } from "./types";
import { twofaColumnHeaderProps, twofaColumnLabel } from "./twofa-column-meta";
import type { TwofaTableColumnKey } from "./twofa-table-keys";

const LOG_FIELD_KEYS: Record<TwofaAccountLogChange["field"], TwofaTableColumnKey | null> = {
  service: "service",
  browser: "browser",
  account: "account",
  mailRecover: "mailRecover",
  password: "password",
  secret: "secret",
  status: "status",
  ownership: "ownership",
  note: "note",
};

function LogChangeRow({ change }: { change: TwofaAccountLogChange }) {
  const columnKey = LOG_FIELD_KEYS[change.field];
  const label = columnKey ? twofaColumnLabel(columnKey) : change.field;

  if (change.field === "password" && change.after === "updated") {
    return (
      <div className="twofa-adm-log-change">
        <span className="twofa-adm-log-change__label hub-users-th-label hub-users-th-label--start">
          {columnKey ? (
            <HubTableColumnHeader {...twofaColumnHeaderProps(columnKey)} />
          ) : (
            <span className="hub-users-th-text">{label}</span>
          )}
        </span>
        <span className="twofa-adm-log-change__value">updated</span>
      </div>
    );
  }

  return (
    <div className="twofa-adm-log-change">
      <span className="twofa-adm-log-change__label hub-users-th-label hub-users-th-label--start">
        {columnKey ? (
          <HubTableColumnHeader {...twofaColumnHeaderProps(columnKey)} />
        ) : (
          <span className="hub-users-th-text">{label}</span>
        )}
      </span>
      <span className="twofa-adm-log-change__value">
        {change.before !== undefined && change.after !== undefined ? (
          <>
            <span>{change.before}</span>
            <span className="twofa-adm-log-change__arrow" aria-hidden>
              →
            </span>
            <span>{change.after}</span>
          </>
        ) : (
          (change.after ?? change.before ?? "—")
        )}
      </span>
    </div>
  );
}

export function TwofaLogEntryBody({ entry }: { entry: TwofaAccountLogEntry }) {
  if (entry.changes?.length) {
    return (
      <div className="twofa-adm-log-item__changes" title={entry.message}>
        {entry.changes.map((change, index) => (
          <LogChangeRow key={`${change.field}-${index}`} change={change} />
        ))}
      </div>
    );
  }

  if (entry.message.includes(" · ")) {
    return (
      <p className="twofa-adm-log-item__msg" title={entry.message}>
        {entry.message.split(" · ").map((part, partIndex) => (
          <span key={`${partIndex}-${part}`} className="twofa-adm-log-item__part">
            {part.trim()}
          </span>
        ))}
      </p>
    );
  }

  return (
    <p className="twofa-adm-log-item__msg" title={entry.message}>
      {entry.message}
    </p>
  );
}
