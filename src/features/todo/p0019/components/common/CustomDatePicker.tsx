// @ts-nocheck

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSettings } from '../../context/SettingsContext';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '../Icons';

interface CustomDatePickerProps {
    value: string;
    onChange: (date: string) => void;
    placeholder?: string;
    className?: string;
    min?: string;
    max?: string;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange, placeholder, className, min, max }) => {
    const { t, language } = useSettings();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
    
    // Parse value or default to today for the view
    const initialDate = value ? new Date(value) : new Date();
    // Handle potential invalid date
    const safeInitialDate = isNaN(initialDate.getTime()) ? new Date() : initialDate;

    const [viewDate, setViewDate] = useState(safeInitialDate);

    // Update position when opening
    const handleToggle = () => {
        if (!isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            
            // Calculate position to ensure it fits on screen
            const screenW = window.innerWidth;
            const dropdownW = 250; // Width of our compact dropdown
            
            let left = rect.left;
            // Shift left if it goes off screen
            if (left + dropdownW > screenW) {
                left = screenW - dropdownW - 10;
            }

            // Default to opening downwards
            let top = rect.bottom + 5;
            
            // Check if bottom overflows viewport, open upwards if needed (simple check)
            const screenH = window.innerHeight;
            const dropdownH = 300; // Approx height
            if (top + dropdownH > screenH && rect.top > dropdownH) {
                top = rect.top - dropdownH - 5;
            }

            setDropdownPos({ top, left });
        }
        setIsOpen(!isOpen);
    };

    // Close on scroll to prevent detached floating picker
    useEffect(() => {
        if (isOpen) {
            const handleScroll = () => setIsOpen(false);
            window.addEventListener('scroll', handleScroll, true);
            window.addEventListener('resize', handleScroll);
            return () => {
                window.removeEventListener('scroll', handleScroll, true);
                window.removeEventListener('resize', handleScroll);
            };
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const isInsideTrigger = containerRef.current && containerRef.current.contains(target);
            const isInsideDropdown = dropdownRef.current && dropdownRef.current.contains(target);

            if (!isInsideTrigger && !isInsideDropdown) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    useEffect(() => {
        if(value) {
             const d = new Date(value);
             if(!isNaN(d.getTime())) setViewDate(d);
        }
    }, [value]);

    const daysOfWeek = useMemo(() => {
        const formatter = new Intl.DateTimeFormat(language, { weekday: 'short' });
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(2023, 0, i + 1); // Sunday start
            return formatter.format(d).slice(0, 2); // Shorten to 2 chars
        });
    }, [language]);

    const { monthName, year, days } = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const monthName = new Intl.DateTimeFormat(language, { month: 'short' }).format(viewDate);

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        
        const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
        const totalDays = lastDayOfMonth.getDate();

        const daysArray = [];
        // Padding for previous month
        for (let i = 0; i < startingDayOfWeek; i++) {
            daysArray.push(null);
        }
        // Days of current month
        for (let i = 1; i <= totalDays; i++) {
            daysArray.push(new Date(year, month, i));
        }
        return { monthName, year, days: daysArray };
    }, [viewDate, language]);

    const handleDayClick = (date: Date) => {
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - (offset * 60 * 1000));
        const dateString = localDate.toISOString().split('T')[0];
        
        onChange(dateString);
        setIsOpen(false);
    };

    const changeMonth = (delta: number) => {
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1);
        setViewDate(newDate);
    };

    const isSelected = (date: Date) => {
        if (!value) return false;
        const target = new Date(value);
        return date.getDate() === target.getDate() &&
               date.getMonth() === target.getMonth() &&
               date.getFullYear() === target.getFullYear();
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    };

    const formatDateDisplay = (dateString: string) => {
        if (!dateString) return '';
        const [y, m, d] = dateString.split('-');
        return `${d}/${m}/${y}`;
    };

    const dropdownContent = (
        <div 
            ref={dropdownRef}
            className="fixed z-[9999] p-3 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 animate-fadeInUp w-[250px]"
            style={{ 
                top: dropdownPos.top, 
                left: dropdownPos.left,
                maxHeight: '350px', // Prevent overflow off screen
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <button type="button" onClick={() => changeMonth(-1)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300">
                    <ChevronLeftIcon size={16} />
                </button>
                <span className="font-bold text-sm text-gray-800 dark:text-gray-100">{monthName} {year}</span>
                <button type="button" onClick={() => changeMonth(1)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300">
                    <ChevronRightIcon size={16} />
                </button>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 mb-1">
                {daysOfWeek.map(d => (
                    <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-wide">{d}</div>
                ))}
            </div>

            {/* Grid */}
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
                            className={`
                                h-7 w-7 rounded-full flex items-center justify-center text-xs transition-all duration-200
                                ${selected 
                                    ? 'bg-gradient-to-br from-[var(--accent-color)] to-[var(--accent-color-dark)] text-white shadow-md shadow-[var(--accent-color)]/30 font-bold scale-105' 
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }
                                ${!selected && today ? 'text-[var(--accent-color)] dark:text-[var(--accent-color)] font-bold bg-[var(--accent-color)]/10' : ''}
                            `}
                        >
                            {day.getDate()}
                        </button>
                    );
                })}
            </div>
            
            {/* Footer */}
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-center">
                <button 
                    type="button"
                    onClick={() => {
                        const today = new Date();
                        handleDayClick(today);
                    }}
                    className="text-[10px] font-bold text-[var(--accent-color)] hover:text-[var(--accent-color-dark)] uppercase tracking-wider"
                >
                    {t.today}
                </button>
            </div>
        </div>
    );

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div 
                onClick={handleToggle}
                className="flex items-center justify-between w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm cursor-pointer hover:border-[var(--accent-color)] transition-colors group"
            >
                <div className="flex items-center gap-2">
                    <CalendarIcon size={16} className={`text-gray-400 group-hover:text-[var(--accent-color)] transition-colors ${isOpen ? 'text-[var(--accent-color)]' : ''}`} />
                    <span className={`text-sm ${value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                        {value ? formatDateDisplay(value) : placeholder || 'Select date'}
                    </span>
                </div>
            </div>

            {isOpen && createPortal(dropdownContent, document.body)}
        </div>
    );
};

export default CustomDatePicker;
