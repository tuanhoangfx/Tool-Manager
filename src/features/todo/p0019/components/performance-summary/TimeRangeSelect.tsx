// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { CalendarIcon, ChevronDownIcon } from '../Icons';
import { TimeRange } from '../PerformanceSummary';

const TimeRangeSelect: React.FC<{ value: TimeRange; onChange: (range: TimeRange) => void; options: { value: TimeRange; label: string }[] }> = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (ref.current && !ref.current.contains(event.target as Node)) {
            setIsOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative w-full" ref={ref}>
        <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-left text-sm">
            <div className="flex items-center gap-2 overflow-hidden">
                <CalendarIcon size={16} className="text-gray-500 flex-shrink-0"/>
                <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{selectedOption.label}</span>
            </div>
            <ChevronDownIcon size={16} className="text-gray-400 flex-shrink-0"/>
        </button>
        {isOpen && (
            <div className="absolute z-20 top-full mt-1 w-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-md shadow-lg border dark:border-gray-600 animate-fadeIn max-h-60 overflow-y-auto">
                {options.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => { onChange(option.value); setIsOpen(false); }}
                        className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-[var(--accent-color)]/10 dark:hover:bg-[var(--accent-color)]/20"
                    >
                        <span>{option.label}</span>
                    </button>
                ))}
            </div>
        )}
    </div>
  );
};

export default TimeRangeSelect;