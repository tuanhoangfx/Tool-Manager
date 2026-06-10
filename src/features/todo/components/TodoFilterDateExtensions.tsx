import { useTodoChrome } from "@/todo/TodoChromeContext";
import MonthPicker from "@/todo/components/performance-summary/MonthPicker";
import CustomDatePicker from "@/todo/components/common/CustomDatePicker";

/** Custom period panels below golden FilterBar (hub layout extension slot). */
export function TodoFilterDateExtensions() {
  const {
    timeRange,
    customMonth,
    setCustomMonth,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
  } = useTodoChrome();

  if (timeRange !== "customMonth" && timeRange !== "customRange") return null;

  return (
    <div className="todo-hub-anim-in space-y-2 rounded-2xl border border-white/5 bg-[var(--panel)] p-3">
      {timeRange === "customMonth" ? (
        <MonthPicker value={customMonth} onChange={setCustomMonth} />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-36">
            <CustomDatePicker
              value={customStartDate}
              onChange={setCustomStartDate}
              placeholder="Start Date"
            />
          </div>
          <span className="text-sm text-[var(--muted)]">to</span>
          <div className="w-36">
            <CustomDatePicker
              value={customEndDate}
              onChange={setCustomEndDate}
              placeholder="End Date"
            />
          </div>
        </div>
      )}
    </div>
  );
}
