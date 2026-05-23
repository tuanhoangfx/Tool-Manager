// @ts-nocheck

import React from 'react';
import { Task } from '../../types';
import { useSettings } from '../../context/SettingsContext';

const PriorityIndicator: React.FC<{ priority: Task['priority'] }> = ({ priority }) => {
    const { t } = useSettings();
    const priorityConfig: { [key in Task['priority']]: { label: string; icon: string; color: string, bg: string } } = {
        low: { label: t.low, icon: '💤', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/50' },
        medium: { label: t.medium, icon: '⚡', color: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-100 dark:bg-yellow-900/50' },
        high: { label: t.high, icon: '🚨', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/50' },
    };
    
    const config = priorityConfig[priority];

    return (
        <span className={`flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${config.bg} ${config.color}`}>
            <span className="text-sm">{config.icon}</span>
            <span>{config.label}</span>
        </span>
    );
}

export default React.memo(PriorityIndicator);
