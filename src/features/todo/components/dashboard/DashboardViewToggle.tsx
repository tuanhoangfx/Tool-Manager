import { ViewGridIcon, CalendarDaysIcon } from "../Icons";
import { useSettings } from "../../context/SettingsContext";

const DashboardViewToggle = ({
  view,
  setView,
}: {
  view: "board" | "calendar";
  setView: (view: "board" | "calendar") => void;
}) => {
  const { t } = useSettings();
  return (
    <div className="flex items-center rounded-full border border-white/10 bg-[var(--panel-2)] p-0.5">
      <button
        type="button"
        onClick={() => setView("board")}
        aria-label={t.boardView}
        title={t.boardView}
        className={`rounded-full p-1.5 transition-colors ${
          view === "board"
            ? "bg-[var(--panel)] text-[var(--accent-color)] shadow-sm"
            : "text-[var(--muted)] hover:bg-white/5"
        }`}
      >
        <ViewGridIcon size={18} />
      </button>
      <button
        type="button"
        onClick={() => setView("calendar")}
        aria-label={t.calendarView}
        title={t.calendarView}
        className={`rounded-full p-1.5 transition-colors ${
          view === "calendar"
            ? "bg-[var(--panel)] text-[var(--accent-color)] shadow-sm"
            : "text-[var(--muted)] hover:bg-white/5"
        }`}
      >
        <CalendarDaysIcon size={18} />
      </button>
    </div>
  );
};

export default DashboardViewToggle;
