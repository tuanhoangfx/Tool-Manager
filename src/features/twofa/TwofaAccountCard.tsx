import {
  HubDirectoryCardCheckbox,
  HubDirectoryCardHeader,
  HubDirectoryCardLeadingTile,
  HubDirectoryCardMetaRow,
  HubDirectoryInteractiveCard,
} from "@tool-workspace/hub-ui";
import { KeyRound } from "lucide-react";
import { TwofaPlatformIcon } from "./TwofaPlatformIcon";
import { TwofaCodeCell } from "./twofa-copy-cells";
import type { TwofaAccount } from "./types";
import { fmtHubDate } from "./twofa-time";

export type TwofaAccountCardProps = {
  account: TwofaAccount;
  selected: boolean;
  editing: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  onUsed: () => void;
};

/** 2FA directory card — golden HubDirectoryInteractiveCard (parity P0004 Users). */
export function TwofaAccountCard({
  account,
  selected,
  editing,
  onToggleSelect,
  onOpen,
  onUsed,
}: TwofaAccountCardProps) {
  return (
    <HubDirectoryInteractiveCard
      variant="panel"
      selected={selected}
      isDetail={editing}
      detailRingClass="ring-amber-400/35"
      ariaLabel={`Open ${account.service}`}
      onActivate={onOpen}
    >
      <HubDirectoryCardCheckbox
        checked={selected}
        label={`Select ${account.service}`}
        onChange={onToggleSelect}
      />
      <div className="flex flex-1 flex-col p-4 pr-10">
        <HubDirectoryCardHeader
          leading={
            <HubDirectoryCardLeadingTile>
              <TwofaPlatformIcon service={account.service} compact />
            </HubDirectoryCardLeadingTile>
          }
          title={account.service}
        />
        <div className="min-h-[var(--hub-card-meta-min-h)] shrink-0 space-y-1.5 text-xs text-[var(--muted)]">
          <HubDirectoryCardMetaRow icon={KeyRound} tint="#60a5fa">
            <span className="truncate" title={account.account}>
              {account.account}
            </span>
          </HubDirectoryCardMetaRow>
          {account.browser ? (
            <HubDirectoryCardMetaRow icon={KeyRound} tint="#a78bfa">
              <span className="twofa-browser-badge tabular-nums">{account.browser}</span>
            </HubDirectoryCardMetaRow>
          ) : null}
        </div>
        <div className="mt-auto shrink-0 space-y-2 pt-3">
          <div onClick={(e) => e.stopPropagation()}>
            <TwofaCodeCell account={account} onUsed={onUsed} />
          </div>
          <div className="flex items-center justify-between border-t border-white/5 pt-2 text-[10px] text-[var(--muted)]">
            <span>Created {fmtHubDate(account.createdAt)}</span>
            <span>Updated {fmtHubDate(account.updatedAt)}</span>
          </div>
        </div>
      </div>
    </HubDirectoryInteractiveCard>
  );
}
