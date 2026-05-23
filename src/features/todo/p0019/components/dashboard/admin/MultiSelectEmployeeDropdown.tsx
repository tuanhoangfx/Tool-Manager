// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDownIcon, SearchIcon, PlusIcon } from '../../Icons';
import Avatar from '../../common/Avatar';

export interface MultiSelectOption {
  id: string;
  label: string;
  avatarUrl?: string;
  icon?: React.ReactNode;
}

interface MultiSelectDropdownProps {
  options: MultiSelectOption[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  buttonLabel: (selectedCount: number, totalCount: number) => string;
  buttonIcon: React.ReactNode;
  searchPlaceholder: string;
  allLabel: string;
  widthClass?: string;
  onConfirmSelection?: () => void;
  confirmLabel?: string | ((count: number) => string);
  confirmIcon?: React.ReactNode;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selectedIds,
  onChange,
  buttonLabel,
  buttonIcon,
  searchPlaceholder,
  allLabel,
  widthClass = 'sm:w-52',
  onConfirmSelection,
  confirmLabel,
  confirmIcon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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
  
  useEffect(() => {
    if(!isOpen) setSearchTerm('');
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const handleToggleOption = (optionId: string) => {
    const newSelection = selectedIds.includes(optionId)
      ? selectedIds.filter(id => id !== optionId)
      : [...selectedIds, optionId];
    onChange(newSelection);
  };

  const isAllSelected = options.length > 0 && selectedIds.length === options.length;

  const handleToggleAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange(options.map(u => u.id));
    }
  };
  
  const handleConfirm = () => {
    if (onConfirmSelection) {
        onConfirmSelection();
        setIsOpen(false);
    }
  };


  return (
    <div className={`relative ${widthClass}`} ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-left text-sm"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-gray-500 flex-shrink-0">{buttonIcon}</span>
          <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{buttonLabel(selectedIds.length, options.length)}</span>
        </div>
        <ChevronDownIcon size={16} className={`text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-40 top-full mt-2 w-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-lg shadow-xl border dark:border-gray-700 animate-fadeIn flex flex-col max-h-96">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 bg-gray-100 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)] text-sm"
              />
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <SearchIcon size={16} className="text-gray-400" />
              </div>
            </div>
          </div>

          <ul className="overflow-y-auto p-1 flex-grow">
            <li>
              <label className="flex items-center gap-3 px-2 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-[var(--accent-color)]/10 dark:hover:bg-[var(--accent-color)]/20 rounded-md cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleToggleAll}
                  className="h-4 w-4 rounded border-gray-300 text-[var(--accent-color)] focus:ring-[var(--accent-color)]"
                />
                <span className="font-semibold">{allLabel}</span>
              </label>
            </li>
            {filteredOptions.map(option => (
              <li key={option.id}>
                <label className="flex items-center gap-3 px-2 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-[var(--accent-color)]/10 dark:hover:bg-[var(--accent-color)]/20 rounded-md cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(option.id)}
                    onChange={() => handleToggleOption(option.id)}
                    className="h-4 w-4 rounded border-gray-300 text-[var(--accent-color)] focus:ring-[var(--accent-color)]"
                  />
                  {option.avatarUrl ? (
                    <Avatar user={{ avatar_url: option.avatarUrl, full_name: option.label }} title={option.label} size={24} />
                  ) : option.icon ? (
                    <span className="w-6 flex items-center justify-center">{option.icon}</span>
                  ) : <div className="w-6"/>}
                  <span className="truncate flex-grow">{option.label}</span>
                </label>
              </li>
            ))}
             {filteredOptions.length === 0 && (
                <li className="px-3 py-2 text-center text-xs text-gray-500">No options match your search.</li>
            )}
          </ul>
          {onConfirmSelection && (
            <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={selectedIds.length === 0}
                    className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-semibold text-white bg-gradient-to-r from-[var(--gradient-from)] to-[var(--gradient-to)] rounded-md shadow-sm disabled:opacity-50"
                >
                    {confirmIcon || <PlusIcon size={16} />}
                    <span>
                        {typeof confirmLabel === 'function' 
                            ? confirmLabel(selectedIds.length) 
                            : confirmLabel || 'Add Selected'
                        }
                    </span>
                </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;