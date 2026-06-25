import { DirectoryTableBodyCell, type HubDirectoryColumnDef } from "@tool-workspace/hub-ui";
import { TwofaPlatformIcon } from "./TwofaPlatformIcon";
import {
  TwofaAccountCell,
  TwofaMailRecoverCell,
  TwofaBrowserCell,
  TwofaCodeCell,
  TwofaLinkedServicesCell,
  TwofaLogCell,
  TwofaNoteCell,
  TwofaPasswordCell,
  TwofaPeriodCell,
  TwofaSecretCell,
  TwofaStatusCell,
  TwofaOwnershipCell,
} from "./twofa-copy-cells";
import type { TwofaAccount } from "./types";
import type { TwofaMailServiceUsage } from "./twofa-mail-service-usage";
import { lookupTwofaMailServiceUsage } from "./twofa-mail-service-usage";
import { TwofaRelativeTime } from "./TwofaRelativeTime";
import type { TwofaTableColumnKey } from "./twofa-table-prefs";

export type TwofaAccountsTableSortKey = TwofaTableColumnKey;

export type TwofaDirectoryRenderContext = {
  mailServiceUsage?: Map<string, TwofaMailServiceUsage>;
};

export function renderTwofaAccountsDirectoryBodyCell(
  col: HubDirectoryColumnDef<TwofaAccountsTableSortKey>,
  row: TwofaAccount,
  onUsed: (id: string) => void,
  ctx: TwofaDirectoryRenderContext = {},
) {
  const { key, colClass } = col;
  switch (key) {
    case "service":
      return (
        <DirectoryTableBodyCell key={key} colClass={colClass}>
          <div className="hub-users-cell-name">
            <TwofaPlatformIcon service={row.service} />
            <span className="hub-users-name-title twofa-table-cell-ellipsis" title={row.service}>
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
    case "mailRecover":
      return (
        <DirectoryTableBodyCell key={key} colClass={colClass}>
          <TwofaMailRecoverCell account={row} />
        </DirectoryTableBodyCell>
      );
    case "linkedServices":
      return (
        <DirectoryTableBodyCell key={key} colClass={colClass}>
          <TwofaLinkedServicesCell
            usage={
              ctx.mailServiceUsage
                ? lookupTwofaMailServiceUsage(ctx.mailServiceUsage, row)
                : { serviceCount: 0, rowCount: 0, labels: [] }
            }
          />
        </DirectoryTableBodyCell>
      );
    case "status":
      return (
        <DirectoryTableBodyCell key={key} colClass={colClass}>
          <TwofaStatusCell account={row} />
        </DirectoryTableBodyCell>
      );
    case "ownership":
      return (
        <DirectoryTableBodyCell key={key} colClass={colClass}>
          <TwofaOwnershipCell account={row} />
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
    case "note":
      return (
        <DirectoryTableBodyCell key={key} colClass={colClass}>
          <TwofaNoteCell account={row} />
        </DirectoryTableBodyCell>
      );
    case "log":
      return (
        <DirectoryTableBodyCell key={key} colClass={colClass}>
          <TwofaLogCell account={row} />
        </DirectoryTableBodyCell>
      );
    case "created":
      return (
        <DirectoryTableBodyCell key={key} colClass={colClass}>
          <TwofaRelativeTime iso={row.createdAt} />
        </DirectoryTableBodyCell>
      );
    case "updated":
      return (
        <DirectoryTableBodyCell key={key} colClass={colClass}>
          <TwofaRelativeTime iso={row.updatedAt} />
        </DirectoryTableBodyCell>
      );
    default:
      return null;
  }
}
