import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { Profile } from '../../types';
import { ChevronDownIcon, SearchIcon } from '../Icons';
import Avatar from './Avatar';

const AssigneeSelect = ({ value, options, onChange, hasError }: { value: string; options: Profile[]; onChange: (value: string) => void; hasError: boolean; }) => {
    const { t } = useSettings();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
        }
    }, [isOpen]);

    const selectedOption = options.find(o => o.id === value);
    
    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        return options.filter(option =>
            (option.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, searchTerm]);

    return (
        <div className="relative mt-1" ref={ref}>
            <button type="button" onClick={() => setIsOpen(!isOpen)} className={`w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-700 border rounded-md shadow-sm text-left ${hasError ? 'border-red-500 ring-2 ring-red-500/50 animate-shake' : 'border-gray-300 dark:border-gray-600'}`}>
                <div className="flex items-center gap-2">
                    {selectedOption && <Avatar user={selectedOption} title={selectedOption.full_name || ''} size={20} />}
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{selectedOption?.full_name || t.selectEmployee}</span>
                </div>
                <ChevronDownIcon size={16} className="text-gray-400" />
            </button>
            {isOpen && (
                <div className="absolute z-20 top-full mt-1 w-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-md shadow-lg border dark:border-gray-600 animate-fadeIn flex flex-col max-h-60">
                     <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                        <div className="relative">
                        <input
                            type="text"
                            placeholder={t.searchUsers}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-2 py-1.5 bg-gray-100 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)] text-sm"
                        />
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                            <SearchIcon size={16} className="text-gray-400" />
                        </div>
                        </div>
                    </div>
                    <div className="overflow-y-auto">
                        {filteredOptions.map((option) => (
                            <button key={option.id} type="button" onClick={() => { onChange(option.id); setIsOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-[var(--accent-color)]/10 dark:hover:bg-[var(--accent-color)]/20">
                                <Avatar user={option} title={option.full_name || ''} size={20} />
                                <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{option.full_name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssigneeSelect;