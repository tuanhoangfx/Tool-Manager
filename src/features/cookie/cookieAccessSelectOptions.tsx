import { Upload, UserRound } from "lucide-react";
import type { HubFilterSelectOption } from "../../components/sales-shell/HubFilterSingleSelect";

export const COOKIE_ACCESS_SELECT_OPTIONS: HubFilterSelectOption[] = [
  {
    value: "load",
    label: "Load",
    leading: <UserRound size={12} className="shrink-0 text-sky-300" aria-hidden />,
  },
  {
    value: "sync",
    label: "Sync",
    leading: <Upload size={12} className="shrink-0 text-amber-300" aria-hidden />,
  },
];
