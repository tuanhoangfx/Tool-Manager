

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Task } from "../types";
import { useSettings } from "../context/SettingsContext";
import { ChevronLeftIcon, ChevronRightIcon } from "./Icons";
import { type SortConfig, sortTasks } from "../lib/taskUtils";
import type { CalendarSortState } from "../lib/calendar-types";
import CalendarSortDropdown from "./CalendarSortDropdown";
import {
  HUB_FILTER_DROPDOWN_PANEL_CLASS,
  HubFilterDropdownTrigger,
} from "@tool-workspace/hub-ui";

export type { CalendarSortState } from "../lib/calendar-types";

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  calendarSort: CalendarSortState;
  onCalendarSortChange: (state: CalendarSortState) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onTaskClick, calendarSort, onCalendarSortChange }) => {
  const { language, t } = useSettings();
  const [currentDate, setCurrentDate] = useState(new Date());

  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => currentDate.getFullYear());
  const monthPickerRef = useRef<HTMLDivElement>(null);

  const daysOfWeek = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(language, { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(2023, 0, i + 1); // A non-leap year starting on Sunday
      return formatter.format(d);
    });
  }, [language]);

  const { monthName, year, days, monthEmoji } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthName = new Intl.DateTimeFormat(language, { month: 'long' }).format(currentDate);
    const monthEmojis = ["❄️", "💖", "🍀", "🌧️", "🎓", "🌤️", "🏖️", "🏝️", "📚", "🎃", "🍁", "🎄"];
    const monthEmoji = monthEmojis[month];

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay();
    const totalDays = lastDayOfMonth.getDate();

    const daysInMonth = [];
    // Add padding for days from the previous month
    for (let i = 0; i < startingDayOfWeek; i++) {
      daysInMonth.push(null);
    }
    // Add days of the current month
    for (let i = 1; i <= totalDays; i++) {
      daysInMonth.push(new Date(year, month, i));
    }
    return { monthName, year, days: daysInMonth, monthEmoji };
  }, [currentDate, language]);

  const pickerMonths = useMemo(() => Array.from({ length: 12 }, (_, i) => new Date(pickerYear, i).toLocaleString(language, { month: 'short' })), [pickerYear, language]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (monthPickerRef.current && !monthPickerRef.current.contains(event.target as Node)) {
            setIsMonthPickerOpen(false);
        }
    };
    if (isMonthPickerOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMonthPickerOpen]);

  useEffect(() => {
    setPickerYear(currentDate.getFullYear());
  }, [currentDate]);

  const sortedTasks = useMemo(() => {
    return sortTasks(tasks, calendarSort.config);
  }, [tasks, calendarSort.config]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    sortedTasks.forEach(task => {
      if (task.due_date) { // due_date is 'YYYY-MM-DD'
        // Parse date string manually to avoid timezone interpretation issues.
        // new Date('2023-10-26') creates a date at UTC midnight, which can be the previous day in some timezones.
        // This creates the date at local midnight, which is what we want for a calendar view.
        const parts = task.due_date.split('-').map(s => parseInt(s, 10));
        const localDate = new Date(parts[0], parts[1] - 1, parts[2]);
        const dateKey = localDate.toDateString();
        
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)?.push(task);
      }
    });
    return map;
  }, [sortedTasks]);
  
  const isToday = (date: Date) => {
      const today = new Date();
      return date.getDate() === today.getDate() &&
             date.getMonth() === today.getMonth() &&
             date.getFullYear() === today.getFullYear();
  }

  const handleMonthSelect = (monthIndex: number) => {
    setCurrentDate(new Date(pickerYear, monthIndex, 1));
    setIsMonthPickerOpen(false);
  };
  
  const statusColors: { [key in Task['status']]: string } = {
    todo: 'bg-orange-500 hover:bg-orange-600',
    inprogress: 'bg-indigo-500 hover:bg-indigo-600',
    done: 'bg-green-500 hover:bg-green-600',
    cancelled: 'bg-gray-500 hover:bg-gray-600 line-through',
  };


  return (
    <div className="rounded-lg border border-white/5 bg-[var(--panel)] p-4 shadow-md">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex-1" />

        <div className="flex justify-center">
            <div className="relative" ref={monthPickerRef}>
              <HubFilterDropdownTrigger
                active={false}
                open={isMonthPickerOpen}
                label={`${monthEmoji} ${monthName} ${year}`}
                onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                className="w-48 justify-between sm:w-52"
                aria-haspopup="true"
                aria-expanded={isMonthPickerOpen}
              />
              {isMonthPickerOpen && (
                  <div className={`${HUB_FILTER_DROPDOWN_PANEL_CLASS} left-0 w-64 p-3`}>
                      <div className="mb-3 flex items-center justify-between">
                          <button type="button" onClick={() => setPickerYear(y => y - 1)} className="rounded-full p-1.5 hover:bg-white/5" aria-label="Previous year"><ChevronLeftIcon size={18}/></button>
                          <span className="font-semibold text-[var(--text)] tabular-nums">{pickerYear}</span>
                          <button type="button" onClick={() => setPickerYear(y => y + 1)} className="rounded-full p-1.5 hover:bg-white/5" aria-label="Next year"><ChevronRightIcon size={18}/></button>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                          {pickerMonths.map((month, index) => (
                              <button
                                  key={month}
                                  type="button"
                                  onClick={() => handleMonthSelect(index)}
                                  className={`rounded-md p-2 text-sm transition-colors text-[var(--text)] ${pickerYear === year && currentDate.getMonth() === index ? 'bg-[var(--accent-color)] font-bold text-white' : 'hover:bg-white/5'}`}
                              >
                                  {month}
                              </button>
                          ))}
                      </div>
                       <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2">
                          <button type="button" onClick={() => { setCurrentDate(new Date()); setIsMonthPickerOpen(false); }} className="text-xs font-semibold text-[var(--accent-color)] hover:underline">{t.today}</button>
                       </div>
                  </div>
              )}
            </div>
        </div>

        <div className="flex-1 flex justify-end">
          <CalendarSortDropdown 
            currentSortId={calendarSort.id} 
            onSortChange={(id, config) => onCalendarSortChange({id, config})} 
          />
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {daysOfWeek.map(day => (
          <div key={day} className="pb-2 text-center text-sm font-semibold text-[var(--muted)]">{day}</div>
        ))}

        {days.map((day, index) => (
          <div key={index} className="flex h-28 flex-col overflow-hidden rounded-md border border-white/5 p-1.5 md:h-36">
            {day && (
              <>
                <span className={`text-sm font-medium ${isToday(day) ? 'flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-color)] text-white' : 'text-[var(--text)]'}`}>
                  {day.getDate()}
                </span>
                <div className="mt-1 space-y-1 overflow-y-auto">
                    {tasksByDate.get(day.toDateString())?.map(task => (
                        <div 
                            key={task.id} 
                            onClick={() => onTaskClick(task)}
                            className={`p-1 rounded text-white text-xs cursor-pointer transition-colors flex items-center gap-1.5 ${statusColors[task.status]}`}
                            title={task.title}
                        >
                            <span className="truncate">{task.title}</span>
                        </div>
                    ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(CalendarView);