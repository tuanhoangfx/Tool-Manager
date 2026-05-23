// @ts-nocheck
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { type SortConfig, type SortField } from '../lib/taskUtils';
import { SortIcon, ArrowUpIcon, ArrowDownIcon, CheckIcon } from './Icons';
import type { Task } from '../types';

interface SortDropdownProps {
  status: Task['status'];
  config: SortConfig;
  onChange: (config: SortConfig) => void;
}

type SortOption = {
    field: SortField;
    label: string;
};

const SortDropdown: React.FC<SortDropdownProps> = ({ status, config, onChange }) => {
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

    const defaultSortConfigForStatus = useMemo<SortConfig>(() => {
        if (status === 'todo') return { field: 'compound_todo_default', direction: 'desc' };
        if (status === 'inprogress') return { field: 'compound_inprogress_default', direction: 'desc' };
        return { field: 'updated_at', direction: 'desc' }; // for done and cancelled
    }, [status]);

    const baseSortOptions: SortOption[] = [
        { field: 'priority', label: t.priority },
        { field: 'created_at', label: t.creationTime },
        { field: 'due_date', label: t.dueDateLabel },
    ];
    
    if (status === 'done' || status === 'cancelled') {
        baseSortOptions.push({ field: 'updated_at', label: t.completionTime });
    }

    const sortOptions: (SortOption | {field: 'default', label: string})[] = [
        { field: 'default', label: t.sortDefault },
        ...baseSortOptions
    ];

    const handleSortChange = (field: SortField | 'default') => {
        if (field === 'default') {
            onChange(defaultSortConfigForStatus);
        } else {
            if (config.field === field) {
                onChange({ field, direction: config.direction === 'asc' ? 'desc' : 'asc' });
            } else {
                // For 'updated_at' and 'created_at', default to newest first (desc)
                const defaultDirection = (field === 'updated_at' || field === 'created_at') ? 'desc' : 'asc';
                onChange({ field, direction: defaultDirection });
            }
        }
        setIsOpen(false);
    };
    
    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none transition-colors"
                title="Sort tasks"
            >
                <SortIcon size={14} />
            </button>
            {isOpen && (
                 <div className="absolute right-0 mt-2 w-48 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 z-50 animate-fadeIn p-2">
                     {sortOptions.map(option => {
                        const isDefaultActive = config.field === defaultSortConfigForStatus.field && config.direction === defaultSortConfigForStatus.direction;
                        
                        let isThisOptionActive;
                        if (option.field === 'default') {
                            isThisOptionActive = isDefaultActive;
                        } else {
                            // This option is active only if its field matches AND we are NOT in the default state.
                            isThisOptionActive = config.field === option.field && !isDefaultActive;
                        }
                        
                        return (
                            <button
                                key={option.field}
                                onClick={() => handleSortChange(option.field as any)}
                                className="w-full text-left flex justify-between items-center px-3 py-1.5 text-sm rounded-md text-gray-700 dark:text-gray-300 hover:bg-[var(--accent-color)]/10 dark:hover:bg-[var(--accent-color)]/20 transition-colors"
                            >
                                <span className={isThisOptionActive ? 'font-bold text-[var(--accent-color)] dark:text-[var(--accent-color-dark)]' : ''}>{option.label}</span>
                                {isThisOptionActive && option.field === 'default' && (
                                     <CheckIcon size={16} className="text-[var(--accent-color)]" />
                                )}
                                {isThisOptionActive && option.field !== 'default' && (
                                    config.direction === 'asc' 
                                    ? <ArrowUpIcon size={16} className="text-[var(--accent-color)]" /> 
                                    : <ArrowDownIcon size={16} className="text-[var(--accent-color)]" />
                                )}
                            </button>
                        )
                     })}
                 </div>
            )}
        </div>
    );
};

export default SortDropdown;