import { DirectoryTableBodyCell, type HubDirectoryColumnDef } from "@tool-workspace/hub-ui";
import { TwofaPlatformIcon } from "./TwofaPlatformIcon";
import {
  TwofaAccountCell,
  TwofaBrowserCell,
  TwofaCodeCell,
  TwofaPasswordCell,
  TwofaPeriodCell,
  TwofaSecretCell,
} from "./twofa-copy-cells";
import type { TwofaAccount } from "./types";
import { fmtHubDate, twofaActivityAt } from "./twofa-time";
import type { TwofaTableColumnKey } from "./twofa-table-prefs";

export type TwofaAccountsTableSortKey = TwofaTableColumnKey;

export function renderTwofaAccountsDirectoryBodyCell(
  col: HubDirectoryColumnDef<TwofaAccountsTableSortKey>,
  row: TwofaAccount,
  onUsed: (id: string) => void,
) {
  const { key, colClass } = col;
  switch (key) {
    case "service":
      return (
        <DirectoryTableBodyCell key={key} colClass={colClass}>
          <div className="hub-users-cell-name">
            <TwofaPlatformIcon service={row.service} />
            <span className="hub-users-name-title" title={row.service}>
              {row.service}
            </span>
          </div>
        </DirectoryTableBodyCell>
      );
    case "browser":
      return (
        <DirectoryTableBodyCell key={key} colClass={colClass}>
          <TwofaBrowserCell account={row} />
        </DirectoryTableBodyCell>
      );
    case "account":
      return (
        <DirectoryTableBodyCell key={key} colClass={colClass}>
          <TwofaAccountCell account={row} />
        </DirectoryTableBodyCell>
      );
    case "password":
      return (
        <DirectoryTableBodyCell key={key} colClass={colClass}>
          <TwofaPasswordCell account={row} />
        </DirectoryTableBodyCell>
      );
    case "secret":
      return (
        <DirectoryTableBodyCell key={key} colClass={colClass}>
          <TwofaSecretCell account={row} />
        </DirectoryTableBodyCell>
      );
    case "code":
      return (
        <DirectoryTableBodyCell key={key} colClass={colClass}>
          <TwofaCodeCell account={row} onUsed={onUsed} />
        </DirectoryTableBodyCell>
      );
    case "period":
      return (
        <DirectoryTableBodyCell key={key} colClass={colClass}>
          <TwofaPeriodCell />
        </DirectoryTableBodyCell>
      );
    case "created":
      return (
        <DirectoryTableBodyCell key={key} colClass={colClass} typographyClass="hub-users-cell-muted">
          <span className="line-clamp-1">{fmtHubDate(row.createdAt)}</span>
        </DirectoryTableBodyCell>
      );
    case "used":
      return (
        <DirectoryTableBodyCell key={key} colClass={colClass} typographyClass="hub-users-cell-muted">
          <span className="line-clamp-1">{fmtHubDate(twofaActivityAt(row))}</span>
        </DirectoryTableBodyCell>
      );
    default:
      return null;
  }
}
