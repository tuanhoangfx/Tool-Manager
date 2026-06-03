import {
  CalendarClock,
  Fingerprint,
  Hash,
  Lock,
  Mail,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { TwofaPlatformIcon } from "./TwofaPlatformIcon";
import "./twofa-platform-icon.css";
import { CopyMetaChip } from "../../components/CopyMetaChip";
import type { TwofaAccount } from "./types";
import { generateCode, normalizeSecret, secondsRemaining } from "./totp";
import { fmtHubDate, twofaActivityAt } from "./twofa-time";
import type { TwofaTableColumnKey } from "./twofa-table-prefs";

type ColumnKey = TwofaTableColumnKey;

type ColumnAlign = "left" | "center";

type ColumnDef = {
  key: ColumnKey;
  label: string;
  colClass: string;
  align: ColumnAlign;
  icon: typeof ShieldCheck;
  iconClass: string;
};

const COLUMNS: ColumnDef[] = [
  {
    key: "service",
    label: "Service",
    colClass: "hub-users-col--twofa-service",
    align: "left",
    icon: ShieldCheck,
    iconClass: "hub-users-th-icon--tools",
  },
  {
    key: "account",
    label: "Account",
    colClass: "hub-users-col--twofa-account",
    align: "left",
    icon: Mail,
    iconClass: "hub-users-th-icon--email",
  },
  {
    key: "password",
    label: "Password",
    colClass: "hub-users-col--twofa-password",
    align: "left",
    icon: Lock,
    iconClass: "hub-users-th-icon--role",
  },
  {
    key: "secret",
    label: "Secret",
    colClass: "hub-users-col--twofa-secret",
    align: "left",
    icon: Fingerprint,
    iconClass: "hub-users-th-icon--id",
  },
  {
    key: "code",
    label: "Code",
    colClass: "hub-users-col--twofa-code",
    align: "left",
    icon: ShieldCheck,
    iconClass: "hub-users-th-icon--role",
  },
  {
    key: "period",
    label: "Time",
    colClass: "hub-users-col--twofa-period",
    align: "center",
    icon: Timer,
    iconClass: "hub-users-th-icon--actions",
  },
  {
    key: "created",
    label: "Created",
    colClass: "hub-users-col--twofa-created",
    align: "center",
    icon: CalendarClock,
    iconClass: "hub-users-th-icon--created",
  },
  {
    key: "used",
    label: "Last used",
    colClass: "hub-users-col--twofa-used",
    align: "center",
    icon: CalendarClock,
    iconClass: "hub-users-th-icon--activity",
  },
];

function thBtnClass(align: ColumnAlign) {
  return `hub-users-th-btn hub-users-th-btn--static${align === "left" ? " hub-users-th-btn--align-start" : ""}`;
}

const CHIP_BASE =
  "inline-flex !max-w-none w-auto gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium leading-[1.3]";

const ACCOUNT_CHIP_CLASS = `${CHIP_BASE} max-w-full border-sky-300/45 bg-sky-400/18 text-sky-50 shadow-[0_0_8px_rgba(56,189,248,0.12)]`;

const PASSWORD_CHIP_CLASS = `${CHIP_BASE} max-w-full border-violet-300/40 bg-violet-400/16 text-violet-50 shadow-[0_0_8px_rgba(167,139,250,0.12)]`;

const SECRET_CHIP_CLASS = `${CHIP_BASE} items-start border-indigo-300/40 bg-indigo-400/16 text-indigo-50 shadow-[0_0_8px_rgba(129,140,248,0.12)]`;

const CODE_CHIP_CLASS = `${CHIP_BASE} border-amber-400/55 bg-amber-500/24 text-[11px] font-semibold tracking-[0.12em] text-amber-50 shadow-[0_0_10px_rgba(251,191,36,0.2)]`;

function periodTone(secondsLeft: number): "fresh" | "warn" | "urgent" {
  if (secondsLeft > 20) return "fresh";
  if (secondsLeft > 10) return "warn";
  return "urgent";
}

function TwofaAccountCell({ account }: { account: TwofaAccount }) {
  const value = account.account.trim();
  if (!value) {
    return <span className="hub-users-cell-muted">—</span>;
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <CopyMetaChip
        icon={<Mail size={11} />}
        label={value}
        value={value}
        tone="cyan"
        title="Copy account"
        className={ACCOUNT_CHIP_CLASS}
        labelClassName="truncate text-left"
      />
    </div>
  );
}

function TwofaCodeCell({
  account,
  onUsed,
}: {
  account: TwofaAccount;
  onUsed: (id: string) => void;
}) {
  const code = generateCode(account.service, account.account, account.secret);

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <CopyMetaChip
        icon={<ShieldCheck size={11} />}
        label={code ?? "------"}
        value={code ?? ""}
        tone="amber"
        title="Copy code"
        className={CODE_CHIP_CLASS}
        labelClassName="whitespace-nowrap"
        onCopied={() => {
          if (code) onUsed(account.id);
        }}
      />
    </div>
  );
}

function TwofaPasswordCell({ account }: { account: TwofaAccount }) {
  const value = account.password?.trim();
  if (!value) {
    return <span className="hub-users-cell-muted">—</span>;
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <CopyMetaChip
        icon={<Lock size={11} />}
        label={value}
        value={value}
        tone="violet"
        title="Copy password"
        className={PASSWORD_CHIP_CLASS}
        labelClassName="truncate text-left"
      />
    </div>
  );
}

function TwofaSecretCell({ account }: { account: TwofaAccount }) {
  const secret = normalizeSecret(account.secret);

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <CopyMetaChip
        icon={<Hash size={11} />}
        label={secret}
        value={secret}
        tone="indigo"
        title={secret}
        className={SECRET_CHIP_CLASS}
        labelClassName="whitespace-normal break-all text-left"
      />
    </div>
  );
}

function TwofaPeriodCell({ tick }: { tick: number }) {
  void tick;
  const left = secondsRemaining();
  const tone = periodTone(left);

  return (
    <span className="hub-twofa-period-inline" title={`${left}s remaining`}>
      <span className={`hub-twofa-period-dot hub-twofa-period-dot--${tone}`} aria-hidden />
      <span className="hub-twofa-period-label tabular-nums">{left}s</span>
    </span>
  );
}

function renderBodyCell(
  key: ColumnKey,
  row: TwofaAccount,
  ctx: { tick: number; onUsed: (id: string) => void },
) {
  switch (key) {
    case "service":
      return (
        <td key={key} className="hub-users-col--twofa-service">
          <div className="hub-users-cell-name">
            <TwofaPlatformIcon service={row.service} />
            <span className="hub-users-name-title" title={row.service}>
              {row.service}
            </span>
          </div>
        </td>
      );
    case "account":
      return (
        <td key={key} className="hub-users-col--twofa-account">
          <TwofaAccountCell account={row} />
        </td>
      );
    case "password":
      return (
        <td key={key} className="hub-users-col--twofa-password">
          <TwofaPasswordCell account={row} />
        </td>
      );
    case "secret":
      return (
        <td key={key} className="hub-users-col--twofa-secret">
          <TwofaSecretCell account={row} />
        </td>
      );
    case "code":
      return (
        <td key={key} className="hub-users-col--twofa-code">
          <TwofaCodeCell account={row} onUsed={ctx.onUsed} />
        </td>
      );
    case "period":
      return (
        <td key={key} className="hub-users-col--twofa-period">
          <TwofaPeriodCell tick={ctx.tick} />
        </td>
      );
    case "created":
      return (
        <td key={key} className="hub-users-cell-muted hub-users-col--twofa-created">
          <span className="line-clamp-1">{fmtHubDate(row.createdAt)}</span>
        </td>
      );
    case "used":
      return (
        <td key={key} className="hub-users-cell-muted hub-users-col--twofa-used">
          <span className="line-clamp-1">{fmtHubDate(twofaActivityAt(row))}</span>
        </td>
      );
    default:
      return null;
  }
}

type Props = {
  rows: TwofaAccount[];
  tick: number;
  editingId: string | null;
  visibleColumns: Set<TwofaTableColumnKey>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  allVisibleSelected: boolean;
  onUsed: (id: string) => void;
};

export function TwofaAccountsTable({
  rows,
  tick,
  editingId,
  visibleColumns,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allVisibleSelected,
  onUsed,
}: Props) {
  const visibleDefs = COLUMNS.filter((col) => visibleColumns.has(col.key));
  const ctx = { tick, onUsed };

  return (
    <div className="hub-users-table-wrap overflow-hidden rounded-2xl border border-white/5">
      <table className="hub-users-table hub-users-table--twofa">
        <colgroup>
          <col className="hub-users-col--select" />
          {visibleDefs.map((col) => (
            <col key={col.key} className={col.colClass} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="hub-users-col--select" scope="col">
              <label className="hub-users-select-all">
                <input
                  type="checkbox"
                  className="hub-checkbox"
                  checked={rows.length > 0 && allVisibleSelected}
                  onChange={onToggleSelectAll}
                  aria-label="Select all visible accounts"
                />
              </label>
            </th>
            {visibleDefs.map((col) => {
              const Icon = col.icon;
              return (
                <th key={col.key} className={col.colClass} scope="col">
                  <span className={thBtnClass(col.align)}>
                    <span className={`hub-users-th-label${col.align === "left" ? " hub-users-th-label--start" : ""}`}>
                      <Icon size={13} className={`hub-users-th-icon ${col.iconClass}`} aria-hidden />
                      <span className="hub-users-th-text">{col.label}</span>
                    </span>
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const selected = selectedIds.has(row.id);
            return (
              <tr
                key={row.id}
                className={`hub-users-row hub-users-row--static${selected ? " is-selected" : ""}${editingId === row.id ? " is-editing" : ""}`}
              >
                <td className="hub-users-col--select" onClick={(e) => e.stopPropagation()}>
                  <label className="hub-users-select-row">
                    <input
                      type="checkbox"
                      className="hub-checkbox"
                      checked={selected}
                      onChange={() => onToggleSelect(row.id)}
                      aria-label={`Select ${row.service}`}
                    />
                  </label>
                </td>
                {visibleDefs.map((col) => renderBodyCell(col.key, row, ctx))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <div className="hub-users-empty">No accounts match search or filters.</div>
      ) : null}
    </div>
  );
}
