// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from '../Icons';

const MonthPicker: React.FC<{ value: string, onChange: (value: string) => void }> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);
    const [currentYear, setDisplayYear] = useState(() => new Date(value + '-01').getFullYear());
    const selectedMonth = new Date(value + '-01').getMonth();

    const { t, language } = useSettings();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);
    
    const months = useMemo(() => Array.from({ length: 12 }, (_, i) => new Date(currentYear, i).toLocaleString(language, { month: 'short' })), [currentYear, language]);
    
    const formattedValue = new Date(value + '-01').toLocaleString(language, { month: 'long', year: 'numeric' });

    return (
        <div className="relative" ref={pickerRef}>
            <button 
                type="button" 
                onClick={() => setIsOpen(!isOpen)}
                className="w-44 flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-left text-sm"
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <CalendarIcon size={16} className="text-gray-500 flex-shrink-0" />
                    <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{formattedValue}</span>
                </div>
                <ChevronDownIcon size={16} className="text-gray-400 flex-shrink-0" />
            </button>
            {isOpen && (
                <div className="absolute z-40 top-full mt-2 w-64 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-lg shadow-xl border dark:border-gray-700 p-3 animate-fadeIn">
                    <div className="flex items-center justify-between mb-3">
                        <button type="button" onClick={() => setDisplayYear(y => y - 1)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronLeftIcon size={18}/></button>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{currentYear}</span>
                        <button type="button" onClick={() => setDisplayYear(y => y + 1)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronRightIcon size={18}/></button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {months.map((month, index) => (
                            <button
                                key={month}
                                type="button"
                                onClick={() => {
                                    onChange(`${currentYear}-${(index + 1).toString().padStart(2, '0')}`);
                                    setIsOpen(false);
                                }}
                                className={`p-2 text-sm rounded-md transition-colors text-gray-800 dark:text-gray-200 ${currentYear === new Date(value + '-01').getFullYear() && selectedMonth === index ? 'bg-[var(--accent-color)] text-white font-bold' : 'hover:bg-[var(--accent-color)]/10 dark:hover:bg-[var(--accent-color)]/20'}`}
                            >
                                {month}
                            </button>
                        ))}
                    </div>
                     <div className="flex justify-between items-center mt-3 pt-2 border-t dark:border-gray-700">
                        <button type="button" onClick={() => { onChange(new Date().toISOString().slice(0, 7)); setIsOpen(false); }} className="text-xs font-semibold text-[var(--accent-color)] hover:underline">{t.thisMonth}</button>
                     </div>
                </div>
            )}
        </div>
    );
};

export default MonthPicker;
