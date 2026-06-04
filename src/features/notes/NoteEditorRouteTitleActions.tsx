import { Ban } from "lucide-react";
import { resolveCookieSiteIcon } from "../cookie/cookieSiteIcon";
import {
  formatRouteOpenAriaLabel,
  formatRouteOpenTooltip,
  type NoteRouteLockInfo,
} from "../cookie/noteRouteLockInfo";

type OpenProps = {
  routes: NoteRouteLockInfo[];
  onOpenRoute: (domain: string) => void;
};

type OpenPropsWithNote = OpenProps & { noteId?: string | null };

/** Modal opener chips flush beside the title input. */
export function NoteEditorRouteOpenButtons({ routes, onOpenRoute, noteId }: OpenPropsWithNote) {
  if (!routes.length) return null;

  return (
    <span
      key={noteId ?? "no-note"}
      className="inline-flex shrink-0 flex-wrap items-center gap-1"
      role="group"
      aria-label="Open Cookie Auto route detail"
    >
      {routes.map((route) => (
        <RouteDetailOpenButton
          key={`${noteId ?? ""}:${route.domain}`}
          route={route}
          onOpen={() => onOpenRoute(route.domain)}
        />
      ))}
    </span>
  );
}

/** Title-only lock hint — shown in editor meta strip for route notes. */
export function NoteEditorTitleOnlyBadge() {
  return (
    <span
      className={`${CHIP_CLASS} border-amber-400/35 bg-amber-500/10 text-amber-100`}
      title="Title-only editing — cookies sync via extension"
    >
      <Ban size={11} className="shrink-0 text-rose-300" aria-hidden />
      <span>Title only</span>
    </span>
  );
}

/** Matches NoteEditorMetaStrip chip sizing (leading-4 + py-0.5). */
const CHIP_CLASS =
  "inline-flex max-w-[11rem] shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-4";

function RouteDetailOpenButton({ route, onOpen }: { route: NoteRouteLockInfo; onOpen: () => void }) {
  const site = resolveCookieSiteIcon(route.domain);
  const label = site?.label ?? route.domain;
  const tooltip = formatRouteOpenTooltip(route);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${CHIP_CLASS} border-cyan-400/35 bg-cyan-500/10 text-cyan-100 transition-colors hover:bg-cyan-500/18`}
      title={tooltip}
      aria-label={formatRouteOpenAriaLabel(route)}
    >
      {site ? (
        <img
          key={site.src}
          src={site.src}
          alt=""
          className="h-[11px] w-[11px] shrink-0 object-contain"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <span className="grid h-[11px] w-[11px] shrink-0 place-items-center rounded bg-white/10 text-[7px] text-indigo-200">
          ?
        </span>
      )}
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}
