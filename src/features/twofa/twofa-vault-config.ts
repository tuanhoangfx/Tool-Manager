import type { TwofaVaultScope } from "./twofa-vault-scope";
import type { TwofaVaultView } from "../../lib/twofa-vault-path";

export function twofaVaultScopeFromView(view: TwofaVaultView): TwofaVaultScope {
  return view;
}

type TwofaVaultUiCopy = {
  sectionRuleLabel: string;
  emptyVault: string;
  emptyFiltered: string;
  countLabel: string;
  cardGridAriaLabel: string;
  addDefaultService?: string;
};

const COPY: Record<TwofaVaultScope, TwofaVaultUiCopy> = {
  services: {
    sectionRuleLabel: "Service accounts",
    emptyVault: "No service accounts yet. Use Add to create one.",
    emptyFiltered: "No service accounts match search or filters.",
    countLabel: "accounts",
    cardGridAriaLabel: "Service account card pages",
  },
  mail: {
    sectionRuleLabel: "Mail accounts",
    emptyVault: "No mailboxes yet. Use Add to create a Gmail, Outlook, or Hotmail entry.",
    emptyFiltered: "No mailboxes match search or filters.",
    countLabel: "mailboxes",
    cardGridAriaLabel: "Mail account card pages",
    addDefaultService: "Gmail",
  },
};

export function twofaVaultUiCopy(scope: TwofaVaultScope): TwofaVaultUiCopy {
  return COPY[scope];
}
