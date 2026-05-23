// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { type SortConfig } from '../lib/taskUtils';
import { SortIcon, CheckIcon } from './Icons';

export type CalendarSortOptionKey = 'default' | 'status' | 'priority' | 'creation_date';

export type CalendarSortOption = {
    id: CalendarSortOptionKey;
    label: string;
    config: SortConfig;
};

interface CalendarSortDropdownProps {
  currentSortId: CalendarSortOptionKey;
  onSortChange: (id: CalendarSortOptionKey, config: SortConfig) => void;
}

const CalendarSortDropdown: React.FC<CalendarSortDropdownProps> = ({ currentSortId, onSortChange }) => {
    const { t } = useSettings();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const sortOptions: CalendarSortOption[] = [
        { id: 'default', label: t.sortDefault, config: { field: 'compound_status_priority', direction: 'desc' } },
        { id: 'status', label: t.sortStatus, config: { field: 'status', direction: 'desc' } },
        { id: 'priority', label: t.sortPriority, config: { field: 'priority', direction: 'desc' } },
        { id: 'creation_date', label: t.sortCreationDate, config: { field: 'created_at', direction: 'desc' } },
    ];
    
    const selectedOption = sortOptions.find(opt => opt.id === currentSortId) || sortOptions[0];

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700/50 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600/50 transition-colors"
                title={t.sortBy}
            >
                <SortIcon size={14} />
                <span>{selectedOption.label}</span>
            </button>
            {isOpen && (
                 <div className="absolute right-0 mt-2 w-48 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 z-50 animate-fadeIn p-2">
                     {sortOptions.map(option => (
                        <button
                            key={option.id}
                            onClick={() => {
                                onSortChange(option.id, option.config);
                                setIsOpen(false);
                            }}
                            className="w-full text-left flex justify-between items-center px-3 py-1.5 text-sm rounded-md text-gray-700 dark:text-gray-300 hover:bg-[var(--accent-color)]/10 dark:hover:bg-[var(--accent-color)]/20 transition-colors"
                        >
                            <span>{option.label}</span>
                             {currentSortId === option.id && (
                                <CheckIcon size={16} className="text-[var(--accent-color)]" /> 
                            )}
                        </button>
                     ))}
                 </div>
            )}
        </div>
    );
};

export default CalendarSortDropdown;