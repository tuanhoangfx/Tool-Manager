// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon } from '../Icons';

export interface CustomSelectOption {
    label: string;
    icon: string | React.FC<any>;
    color: string;
    iconClass?: string;
}

const StatusPrioritySelect = ({ value, options, onChange }: { value: string; options: { [key: string]: CustomSelectOption }; onChange: (value: any) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options[value];
    const Icon = selectedOption.icon;

    return (
        <div className="relative mt-1" ref={ref}>
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-left">
                <div className="flex items-center gap-2">
                    {typeof Icon === 'string'
                        ? <span className="text-base">{Icon}</span>
                        : <Icon size={16} className={`${selectedOption.color} ${selectedOption.iconClass || ''}`} />}
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{selectedOption.label}</span>
                </div>
                <ChevronDownIcon size={16} className="text-gray-400" />
            </button>
            {isOpen && (
                <div className="absolute z-20 top-full mt-1 w-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-md shadow-lg border dark:border-gray-600 animate-fadeIn">
                    {Object.entries(options).map(([key, option]: [string, any]) => {
                        const ItemIcon = option.icon;
                        return (
                            <button key={key} type="button" onClick={() => { onChange(key); setIsOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-[var(--accent-color)]/10 dark:hover:bg-[var(--accent-color)]/20 first:rounded-t-md last:rounded-b-md">
                                {typeof ItemIcon === 'string'
                                    ? <span className="text-base">{ItemIcon}</span>
                                    : <ItemIcon size={16} className={`${option.color} ${option.iconClass || ''}`} />}
                                <span className="font-medium text-gray-800 dark:text-gray-200">{option.label}</span>
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

export default StatusPrioritySelect;
