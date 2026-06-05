import { KeyRound, Shield } from "lucide-react";
import type { TabHeaderStatItem } from "../../components/sales-shell";
import { TWOFA_HEADER_STAT_DEFS } from "./twofa-display-prefs";

export type TwofaHeaderKpi = {
  total: number;
  shown: number;
};

const STAT_DEFS = {
  "twofa-total": {
    icon: Shield,
    label: "accounts",
    toneClass: "text-amber-300",
    pick: (k: TwofaHeaderKpi) => k.total,
  },
  "twofa-in-range": {
    icon: KeyRound,
    label: "shown",
    toneClass: "text-cyan-300",
    pick: (k: TwofaHeaderKpi) => k.shown,
  },
} as const;

export function buildTwofaHeaderStats(visibleKeys: Set<string>, kpi: TwofaHeaderKpi): TabHeaderStatItem[] {
  return TWOFA_HEADER_STAT_DEFS.filter((h) => visibleKeys.has(h.key)).map((h) => {
    const def = STAT_DEFS[h.key as keyof typeof STAT_DEFS];
    return {
      key: h.key,
      icon: def.icon,
      label: def.label,
      value: def.pick(kpi),
      toneClass: def.toneClass,
    };
  });
}
