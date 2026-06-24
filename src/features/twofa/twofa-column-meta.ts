import type { LucideIcon } from "lucide-react";
import type {
  DirectoryTableColumnItem,
  HubTableColumnHeaderProps,
  HubTableColumnRole,
} from "@tool-workspace/hub-ui";
import { resolveHubTableColumnMeta } from "@tool-workspace/hub-ui";
import { TWOFA_TABLE_COLUMN_DEFS, type TwofaTableColumnKey } from "./twofa-table-keys";

type TwofaColumnMeta = {
  role: HubTableColumnRole;
};

/** Column labels — SSOT for table, modal, bulk preview, column picker. */
export const TWOFA_COLUMN_LABELS: Record<TwofaTableColumnKey, string> = {
  service: "Service",
  browser: "Browser",
  account: "Account",
  mailRecover: "Mail Recover",
  status: "Status",
  ownership: "Ownership",
  password: "Password",
  secret: "Secret",
  code: "Code",
  period: "Time",
  note: "Note",
  log: "Log",
  created: "Created",
  updated: "Last update",
};

/** Hub table column roles — SSOT for directory + detail modal headers. */
export const TWOFA_COLUMN_META: Record<TwofaTableColumnKey, TwofaColumnMeta> = {
  service: { role: "service" },
  browser: { role: "browser" },
  account: { role: "email" },
  mailRecover: { role: "email" },
  status: { role: "status" },
  ownership: { role: "status" },
  password: { role: "password" },
  secret: { role: "totp" },
  code: { role: "code" },
  period: { role: "period" },
  note: { role: "notes" },
  log: { role: "notes" },
  created: { role: "created" },
  updated: { role: "activity" },
};

export const TWOFA_COLUMN_ROLE: Record<TwofaTableColumnKey, HubTableColumnRole> = Object.fromEntries(
  Object.entries(TWOFA_COLUMN_META).map(([key, meta]) => [key, meta.role]),
) as Record<TwofaTableColumnKey, HubTableColumnRole>;

export const TWOFA_VAULT_ID_HEADER: HubTableColumnHeaderProps = {
  label: "Vault ID",
  role: "vault",
};

export function twofaColumnLabel(key: TwofaTableColumnKey): string {
  return TWOFA_COLUMN_LABELS[key] ?? key;
}

export function twofaColumnHeaderProps(key: TwofaTableColumnKey): HubTableColumnHeaderProps {
  const meta = TWOFA_COLUMN_META[key];
  return {
    label: twofaColumnLabel(key),
    role: meta.role,
  };
}

/** Column picker toggle — icon + color from hub table role registry. */
export function twofaColumnToggleMeta(key: TwofaTableColumnKey): {
  icon: LucideIcon;
  iconClassName: string;
} {
  const { role } = TWOFA_COLUMN_META[key];
  const meta = resolveHubTableColumnMeta(role);
  return { icon: meta.icon, iconClassName: meta.iconClassName };
}

/** DirectoryTableColumnsSettings items — label + icon SSOT. */
export function buildTwofaDirectoryColumnItems(): DirectoryTableColumnItem<TwofaTableColumnKey>[] {
  return TWOFA_TABLE_COLUMN_DEFS.map((def) => {
    const { icon, iconClassName } = twofaColumnToggleMeta(def.key);
    return {
      key: def.key,
      label: twofaColumnLabel(def.key),
      icon,
      iconClassName,
      required: def.required,
    };
  });
}
