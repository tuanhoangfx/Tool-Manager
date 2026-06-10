import React, { useState, useEffect, useRef, useMemo } from "react";
import { Calendar } from "lucide-react";
import {
  HUB_FILTER_DROPDOWN_PANEL_CLASS,
  HubFilterDropdownTrigger,
} from "@tool-workspace/hub-ui";
import { compactIconSize } from "../../../../lib/ui-scale";
import { useSettings } from "../../context/SettingsContext";
import { ChevronLeftIcon, ChevronRightIcon } from "../Icons";

const MonthPicker: React.FC<{ value: string; onChange: (value: string) => void }> = ({
  value,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [currentYear, setDisplayYear] = useState(() => new Date(`${value}-01`).getFullYear());
  const selectedMonth = new Date(`${value}-01`).getMonth();

  const { t, language } = useSettings();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        new Date(currentYear, i).toLocaleString(language, { month: "short" }),
      ),
    [currentYear, language],
  );

  const formattedValue = new Date(`${value}-01`).toLocaleString(language, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="relative" ref={pickerRef}>
      <HubFilterDropdownTrigger
        active={false}
        open={isOpen}
        label={formattedValue}
        icon={<Calendar size={compactIconSize(12)} className="shrink-0 opacity-75" aria-hidden />}
        onClick={() => setIsOpen(!isOpen)}
        className="w-44 justify-between"
      />
      {isOpen && (
        <div className={`${HUB_FILTER_DROPDOWN_PANEL_CLASS} left-0 w-64 p-3`}>
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setDisplayYear((y) => y - 1)}
              className="rounded-full p-1.5 hover:bg-white/5"
            >
              <ChevronLeftIcon size={18} />
            </button>
            <span className="font-semibold text-[var(--text)]">{currentYear}</span>
            <button
              type="button"
              onClick={() => setDisplayYear((y) => y + 1)}
              className="rounded-full p-1.5 hover:bg-white/5"
            >
              <ChevronRightIcon size={18} />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {months.map((month, index) => {
              const selected =
                currentYear === new Date(`${value}-01`).getFullYear() && selectedMonth === index;
              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => {
                    onChange(`${currentYear}-${(index + 1).toString().padStart(2, "0")}`);
                    setIsOpen(false);
                  }}
                  className={`rounded-md p-2 text-sm transition-colors ${
                    selected
                      ? "bg-[var(--accent-color)] font-bold text-white"
                      : "text-[var(--text)] hover:bg-white/5"
                  }`}
                >
                  {month}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2">
            <button
              type="button"
              onClick={() => {
                onChange(new Date().toISOString().slice(0, 7));
                setIsOpen(false);
              }}
              className="text-xs font-semibold text-[var(--accent-color)] hover:underline"
            >
              {t.thisMonth}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthPicker;
