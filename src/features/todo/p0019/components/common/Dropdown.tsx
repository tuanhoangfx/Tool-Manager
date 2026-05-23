// @ts-nocheck

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '../Icons';

export interface DropdownItem {
  id: string | number;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode | ((isOpen: boolean) => React.ReactNode);
  children?: React.ReactNode; // Custom content
  items?: DropdownItem[]; // Simple list mode
  align?: 'left' | 'right';
  width?: string;
  className?: string;
  closeOnSelect?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({ 
  trigger, 
  children, 
  items, 
  align = 'left', 
  width = 'w-48', 
  className = '',
  closeOnSelect = true 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleItemClick = (item: DropdownItem) => {
    if (item.onClick) item.onClick();
    if (closeOnSelect) setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {typeof trigger === 'function' ? trigger(isOpen) : trigger}
      </div>

      {isOpen && (
        <div className={`absolute z-50 mt-2 ${width} ${align === 'right' ? 'right-0' : 'left-0'} bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 animate-fadeIn origin-top transform transition-all`}>
          
          {/* Render Items List if provided */}
          {items && (
            <div className="p-1">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors
                    ${item.danger 
                      ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-[var(--accent-color)]/10 dark:hover:bg-[var(--accent-color)]/20'
                    }`}
                >
                  {item.icon && <span className={item.danger ? 'text-red-500' : 'text-[var(--accent-color)]'}>{item.icon}</span>}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Render Custom Children */}
          {children}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
