
import React from 'react';

export interface TabOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  options: TabOption[];
  activeId: string;
  onChange: (id: any) => void;
  className?: string;
  size?: 'sm' | 'md';
}

const Tabs: React.FC<TabsProps> = ({ options, activeId, onChange, className = '', size = 'sm' }) => {
  const padding = size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-sm';
  const iconSize = size === 'sm' ? 14 : 16;

  return (
    <div className={`flex items-center bg-gray-200 dark:bg-gray-700 rounded-full p-1 ${className}`}>
      {options.map((option) => {
        const isActive = activeId === option.id;
        return (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            className={`${padding} font-semibold rounded-full flex items-center gap-1.5 transition-all duration-200 ease-out
              ${isActive 
                ? 'bg-white dark:bg-gray-800 shadow-sm text-[var(--accent-color)] scale-100' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
          >
            {option.icon}
            <span className={!isActive && size === 'sm' ? 'hidden sm:inline' : ''}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
