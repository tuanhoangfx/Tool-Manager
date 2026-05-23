// @ts-nocheck


import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Task } from '@/types';
import { useSettings } from '@/context/SettingsContext';
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from '@/components/Icons';
import { type SortConfig, sortTasks } from '@/lib/taskUtils';
import CalendarSortDropdown from '@/components/CalendarSortDropdown';

export type CalendarSortState = { id: 'default' | 'status' | 'priority' | 'creation_date'; config: SortConfig; };

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
    <div className="bg-white dark:bg-gray-800/50 rounded-lg shadow-md p-4">
      <div className="flex items-center mb-4 flex-wrap gap-2">
        <div className="flex-1">
          {/* Spacer */}
        </div>
        
        <div className="flex justify-center">
            <div className="relative" ref={monthPickerRef}>
              <button 
                type="button" 
                onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                className="w-48 sm:w-52 flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-left text-sm"
                aria-haspopup="true"
                aria-expanded={isMonthPickerOpen}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-base flex-shrink-0" aria-hidden="true">{monthEmoji}</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">{monthName} {year}</span>
                </div>
                <ChevronDownIcon size={16} className={`text-gray-400 flex-shrink-0 transition-transform ${isMonthPickerOpen ? 'rotate-180' : ''}`} />
              </button>
              {isMonthPickerOpen && (
                  <div className="absolute z-10 top-full mt-2 w-64 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-lg shadow-xl border dark:border-gray-700 p-3 animate-fadeIn">
                      <div className="flex items-center justify-between mb-3">
                          <button type="button" onClick={() => setPickerYear(y => y - 1)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Previous year"><ChevronLeftIcon size={18}/></button>
                          <span className="font-semibold text-gray-800 dark:text-gray-200 tabular-nums">{pickerYear}</span>
                          <button type="button" onClick={() => setPickerYear(y => y + 1)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Next year"><ChevronRightIcon size={18}/></button>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                          {pickerMonths.map((month, index) => (
                              <button
                                  key={month}
                                  type="button"
                                  onClick={() => handleMonthSelect(index)}
                                  className={`p-2 text-sm rounded-md transition-colors text-gray-800 dark:text-gray-200 ${pickerYear === year && currentDate.getMonth() === index ? 'bg-[var(--accent-color)] text-white font-bold' : 'hover:bg-[var(--accent-color)]/10 dark:hover:bg-[var(--accent-color)]/20'}`}
                              >
                                  {month}
                              </button>
                          ))}
                      </div>
                       <div className="flex justify-between items-center mt-3 pt-2 border-t dark:border-gray-700">
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
          <div key={day} className="text-center font-semibold text-sm text-gray-600 dark:text-gray-400 pb-2">{day}</div>
        ))}

        {days.map((day, index) => (
          <div key={index} className="h-28 md:h-36 border border-gray-200 dark:border-gray-700 rounded-md p-1.5 overflow-hidden flex flex-col">
            {day && (
              <>
                <span className={`text-sm font-medium ${isToday(day) ? 'bg-[var(--accent-color)] text-white rounded-full w-6 h-6 flex items-center justify-center' : 'text-gray-800 dark:text-gray-200'}`}>
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