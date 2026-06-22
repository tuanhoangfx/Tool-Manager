import type { ReactNode } from "react";
import type { HubTableColumnHeaderProps } from "@tool-workspace/hub-ui";
import { HubTableColumnHeader } from "@tool-workspace/hub-ui";
import { twofaColumnHeaderProps } from "./twofa-column-meta";
import type { TwofaTableColumnKey } from "./twofa-table-prefs";

type InlineProps = {
  columnKey: TwofaTableColumnKey;
  children: ReactNode;
  className?: string;
};

type CustomInlineProps = {
  header: HubTableColumnHeaderProps;
  children: ReactNode;
  className?: string;
};

function InlineFieldShell({
  header,
  children,
  className = "",
  valueClassName,
}: {
  header: HubTableColumnHeaderProps;
  children: ReactNode;
  className?: string;
  valueClassName: string;
}) {
  return (
    <div className={`twofa-adm-inline-field min-w-0${className ? ` ${className}` : ""}`}>
      <span className="twofa-adm-inline-field__label hub-users-th-label hub-users-th-label--start">
        <HubTableColumnHeader {...header} />
      </span>
      <div className={valueClassName}>{children}</div>
    </div>
  );
}

/** Detail / add form — label + control on one row (table header icon + text). */
export function TwofaDetailInlineField({ columnKey, children, className = "" }: InlineProps) {
  return (
    <InlineFieldShell
      header={twofaColumnHeaderProps(columnKey)}
      className={className}
      valueClassName="twofa-adm-inline-field__control"
    >
      {children}
    </InlineFieldShell>
  );
}

/** Detail / add form — custom header (e.g. Vault ID). */
export function TwofaDetailInlineFieldCustom({ header, children, className = "" }: CustomInlineProps) {
  return (
    <InlineFieldShell header={header} className={className} valueClassName="twofa-adm-inline-field__control">
      {children}
    </InlineFieldShell>
  );
}

type ReadonlyProps = {
  columnKey: TwofaTableColumnKey;
  children: ReactNode;
  className?: string;
};

type CustomReadonlyProps = {
  header: HubTableColumnHeaderProps;
  children: ReactNode;
  className?: string;
};

/** Detail modal — label + read-only value on one row. */
export function TwofaDetailInlineReadonly({ columnKey, children, className = "" }: ReadonlyProps) {
  return (
    <InlineFieldShell
      header={twofaColumnHeaderProps(columnKey)}
      className={`twofa-adm-inline-field--readonly${className ? ` ${className}` : ""}`}
      valueClassName="twofa-adm-inline-field__value"
    >
      {children}
    </InlineFieldShell>
  );
}

export function TwofaDetailInlineReadonlyCustom({ header, children, className = "" }: CustomReadonlyProps) {
  return (
    <InlineFieldShell
      header={header}
      className={`twofa-adm-inline-field--readonly${className ? ` ${className}` : ""}`}
      valueClassName="twofa-adm-inline-field__value"
    >
      {children}
    </InlineFieldShell>
  );
}

export const TWOFA_ADM_CONTROL_CLASS = "field auth-gate-field twofa-adm-control";
