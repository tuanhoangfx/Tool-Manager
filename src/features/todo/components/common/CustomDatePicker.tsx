import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  HUB_FILTER_DROPDOWN_PANEL_PORTAL_CLASS,
  HubFilterDropdownTrigger,
  compactIconSize,
} from "@tool-workspace/hub-ui";
import { Calendar } from "lucide-react";

import { useSettings } from "../../context/SettingsContext";
import { ChevronLeftIcon, ChevronRightIcon } from "../Icons";

interface CustomDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  min?: string;
  max?: string;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  placeholder,
  className,
}) => {
  const { t, language } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );

  const initialDate = value ? new Date(value) : new Date();
  const safeInitialDate = Number.isNaN(initialDate.getTime()) ? new Date() : initialDate;
  const [viewDate, setViewDate] = useState(safeInitialDate);

  useLayoutEffect(() => {
    if (!isOpen || !containerRef.current) {
      setPanelPos(null);
      return;
    }
    const update = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      const width = 250;
      let left = rect.left;
      if (left + width > window.innerWidth - 8) {
        left = window.innerWidth - width - 8;
      }
      setPanelPos({ top: rect.bottom + 4, left, width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) setViewDate(d);
    }
  }, [value]);

  const daysOfWeek = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(language, { weekday: "short" });
    return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2023, 0, i + 1)).slice(0, 2));
  }, [language]);

  const { monthName, year, days } = useMemo(() => {
    const y = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const monthLabel = new Intl.DateTimeFormat(language, { month: "short" }).format(viewDate);
    const firstDayOfMonth = new Date(y, month, 1);
    const lastDayOfMonth = new Date(y, month + 1, 0);
    const startingDayOfWeek = firstDayOfMonth.getDay();
    const totalDays = lastDayOfMonth.getDate();
    const daysArray: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) daysArray.push(null);
    for (let i = 1; i <= totalDays; i++) daysArray.push(new Date(y, month, i));
    return { monthName: monthLabel, year: y, days: daysArray };
  }, [viewDate, language]);

  const handleDayClick = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    onChange(localDate.toISOString().split("T")[0]!);
    setIsOpen(false);
  };

  const changeMonth = (delta: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1));
  };

  const isSelected = (date: Date) => {
    if (!value) return false;
    const target = new Date(value);
    return (
      date.getDate() === target.getDate() &&
      date.getMonth() === target.getMonth() &&
      date.getFullYear() === target.getFullYear()
    );
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return "";
    const [y, m, d] = dateString.split("-");
    return `${d}/${m}/${y}`;
  };

  const panel =
    isOpen && panelPos ? (
      <div
        ref={panelRef}
        className={HUB_FILTER_DROPDOWN_PANEL_PORTAL_CLASS}
        style={{ top: panelPos.top, left: panelPos.left, width: panelPos.width }}
      >
        <div className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="rounded-full p-1 hover:bg-white/5"
            >
              <ChevronLeftIcon size={16} />
            </button>
            <span className="text-sm font-bold text-[var(--text)]">
              {monthName} {year}
            </span>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="rounded-full p-1 hover:bg-white/5"
            >
              <ChevronRightIcon size={16} />
            </button>
          </div>
          <div className="mb-1 grid grid-cols-7">
            {daysOfWeek.map((d) => (
              <div
                key={d}
                className="text-center text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} />;
              const selected = isSelected(day);
              const today = isToday(day);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs transition-all ${
                    selected
                      ? "scale-105 bg-[var(--accent-color)] font-bold text-white shadow-md"
                      : today
                        ? "bg-[var(--accent-color)]/10 font-bold text-[var(--accent-color)] hover:bg-white/5"
                        : "text-[var(--text)] hover:bg-white/5"
                  }`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-center border-t border-white/5 pt-2">
            <button
              type="button"
              onClick={() => handleDayClick(new Date())}
              className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-color)] hover:underline"
            >
              {t.today}
            </button>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div className={`relative min-w-0 ${className ?? ""}`.trim()} ref={containerRef}>
      <HubFilterDropdownTrigger
        active={Boolean(value)}
        open={isOpen}
        label={value ? formatDateDisplay(value) : placeholder || "Select date"}
        icon={<Calendar size={compactIconSize(12)} className="shrink-0 opacity-75" aria-hidden />}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
      />
      {panel ? createPortal(panel, document.body) : null}
    </div>
  );
};

export default CustomDatePicker;
