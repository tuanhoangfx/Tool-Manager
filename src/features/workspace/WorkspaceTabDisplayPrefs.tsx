import { useEffect, useState, type ReactNode } from "react";
import { Cookie, FolderOpen, Shield, ShieldAlert } from "lucide-react";
import { DisplayPrefs } from "../../components/sales-shell";
import type { FilterDef } from "../../components/sales-shell/FilterBar";
import { compactIconSize } from "../../lib/ui-scale";
import { CookieBridgeAdvancedSection } from "../cookie/CookieBridgeAdvancedSection";
import { CookieBridgeExtensionSection } from "../cookie/CookieBridgeExtensionSection";
import { CookieVaultSection } from "../cookie/CookieVaultSection";
import {
  COOKIE_CHART_DEFS,
  COOKIE_FILTER_DEFS,
  COOKIE_HEADER_STAT_DEFS,
  COOKIE_KPI_DEFS,
  DEFAULT_COOKIE_CHART_KEYS,
  DEFAULT_COOKIE_HEADER_STAT_KEYS,
  DEFAULT_COOKIE_KPI_KEYS,
} from "../cookie/cookie-display-prefs";
import { DEFAULT_COOKIE_ROUTE_FILTER_KEYS } from "../cookie/cookie-route-filters";
import { NotesDensityExtras } from "../notes/NotesDensityExtras";
import {
  DEFAULT_NOTES_HEADER_STAT_KEYS,
  NOTES_FILTER_PREF_DEFS,
  NOTES_HEADER_STAT_DEFS,
} from "../notes/notes-display-prefs";
import { DEFAULT_NOTES_FILTER_KEYS } from "../notes/notes-list-prefs";
import type { NotesListDensity } from "../notes/notes-list-prefs";
import {
  DEFAULT_TWOFA_HEADER_STAT_KEYS,
  TWOFA_HEADER_STAT_DEFS,
} from "../twofa/twofa-display-prefs";
import { DEFAULT_TWOFA_FILTER_KEYS, TWOFA_FILTER_DEFS } from "../twofa/twofa-filters";
import {
  countHiddenTwofaTableColumns,
  TwofaTableColumnsSettings,
} from "../twofa/TwofaTableColumnsSettings";
import type { WorkspaceScreen } from "../../lib/workspace-screen";

function TwofaTabDisplayPrefs({ screenFilters }: { screenFilters: FilterDef[] }) {
  const [hiddenCols, setHiddenCols] = useState(() => countHiddenTwofaTableColumns());

  useEffect(() => {
    const sync = () => setHiddenCols(countHiddenTwofaTableColumns());
    window.addEventListener("twofa-table-columns-change", sync);
    return () => window.removeEventListener("twofa-table-columns-change", sync);
  }, []);

  const filters = screenFilters.length ? screenFilters : TWOFA_FILTER_DEFS;

  return (
    <DisplayPrefs
      filters={filters.map(({ key, label }) => ({ key, label }))}
      defaultFilterKeys={DEFAULT_TWOFA_FILTER_KEYS}
      filterParam="afilt"
      filtersFromUrl
      headerStats={TWOFA_HEADER_STAT_DEFS}
      defaultHeaderStatKeys={DEFAULT_TWOFA_HEADER_STAT_KEYS}
      showRange={false}
      showLimit={false}
      showHeaderPin
      panelWidth={360}
      maxPanelHeight="min(78vh, 36rem)"
      headerStatLabel={() => "2FA header"}
      scope="tab"
      tablePanel={<TwofaTableColumnsSettings />}
      tableActiveCount={hiddenCols}
    />
  );
}

type Props = {
  screen: WorkspaceScreen;
  /** Live filter defs from the active screen (Cookie routes, etc.). */
  screenFilters?: FilterDef[];
  notesDensity?: NotesListDensity;
  onNotesDensityChange?: (d: NotesListDensity) => void;
  notesFolderSettings?: ReactNode;
};

/** Per-tab header Settings — same contract as P0004 Hub `AppDisplayPrefs`. */
export function WorkspaceTabDisplayPrefs({
  screen,
  screenFilters = [],
  notesDensity = "comfort",
  onNotesDensityChange,
  notesFolderSettings,
}: Props) {
  if (screen === "cookie") {
    const filters = screenFilters.length
      ? screenFilters.map(({ key, label }) => ({ key, label }))
      : COOKIE_FILTER_DEFS;
    const defaultFilterKeys = screenFilters.length
      ? new Set(screenFilters.map((f) => f.key))
      : DEFAULT_COOKIE_ROUTE_FILTER_KEYS;

    return (
      <DisplayPrefs
        kpis={COOKIE_KPI_DEFS}
        charts={COOKIE_CHART_DEFS}
        filters={filters}
        defaultKpiKeys={DEFAULT_COOKIE_KPI_KEYS}
        defaultChartKeys={DEFAULT_COOKIE_CHART_KEYS}
        defaultFilterKeys={defaultFilterKeys}
        filterParam="cfilt"
        filtersFromUrl
        headerStats={COOKIE_HEADER_STAT_DEFS}
        defaultHeaderStatKeys={DEFAULT_COOKIE_HEADER_STAT_KEYS}
        showRange={false}
        showLimit={false}
        showHeaderPin
        panelWidth={420}
        maxPanelHeight="min(80vh, 42rem)"
        extraTabs={[
          {
            id: "bridge",
            label: "Bridge",
            icon: <Cookie size={compactIconSize(12)} className="text-amber-300" />,
            content: <CookieBridgeExtensionSection />,
          },
          {
            id: "vault",
            label: "Vault",
            icon: <Shield size={compactIconSize(12)} className="text-violet-300" />,
            content: <CookieVaultSection />,
          },
          {
            id: "advanced",
            label: "Advanced",
            icon: <ShieldAlert size={compactIconSize(12)} className="text-sky-300" />,
            content: <CookieBridgeAdvancedSection />,
          },
        ]}
        headerStatLabel={() => "Cookie header"}
        scope="tab"
      />
    );
  }

  if (screen === "notes" || screen === "edit") {
    return (
      <DisplayPrefs
        filters={NOTES_FILTER_PREF_DEFS}
        defaultFilterKeys={DEFAULT_NOTES_FILTER_KEYS}
        filterParam="nfilt"
        filtersFromUrl
        headerStats={NOTES_HEADER_STAT_DEFS}
        defaultHeaderStatKeys={DEFAULT_NOTES_HEADER_STAT_KEYS}
        showRange={false}
        showLimit={false}
        showHeaderPin
        generalExtras={
          <NotesDensityExtras density={notesDensity} onDensityChange={onNotesDensityChange} />
        }
        extraTabs={
          notesFolderSettings
            ? [
                {
                  id: "folders",
                  label: "Folders",
                  icon: <FolderOpen size={compactIconSize(12)} className="text-amber-300" />,
                  content: notesFolderSettings,
                },
              ]
            : undefined
        }
        panelWidth={360}
        maxPanelHeight="min(78vh, 36rem)"
        headerStatLabel={() => "Notes header"}
        scope="tab"
      />
    );
  }

  if (screen === "twofa") {
    return <TwofaTabDisplayPrefs screenFilters={screenFilters} />;
  }

  if (screen === "system") {
    return (
      <DisplayPrefs
        filters={[]}
        defaultFilterKeys={new Set()}
        headerStats={[]}
        defaultHeaderStatKeys={new Set()}
        showRange={false}
        showLimit={false}
        showHeaderPin
        panelWidth={340}
        headerStatLabel={() => "System header"}
        scope="tab"
      />
    );
  }

  return null;
}
