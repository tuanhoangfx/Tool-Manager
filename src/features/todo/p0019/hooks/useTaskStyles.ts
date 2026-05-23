// @ts-nocheck

import { useMemo } from 'react';
import { Task } from '../types';
import { useSettings } from '../context/SettingsContext';
import { getTodayDateString } from '../lib/taskUtils';

export const useTaskStyles = (task: Task) => {
    const { timezone } = useSettings();

    return useMemo(() => {
        const isDone = task.status === 'done';
        const isCancelled = task.status === 'cancelled';
        const isArchived = isDone || isCancelled;

        // Date Logic
        let isOverdue = false;
        let isToday = false;
        
        if (!isArchived && task.due_date) {
            const todayString = getTodayDateString(timezone);
            isOverdue = task.due_date < todayString;
            isToday = task.due_date === todayString;
        }

        // --- Container Styles ---
        const containerClasses = [
            'relative bg-white dark:bg-gray-900/70 p-3 rounded-lg shadow-sm border transition-all flex flex-col gap-2',
        ];

        // Base border (can be overridden by specific states below)
        let borderClass = 'border-gray-200 dark:border-gray-700/50';

        if (isArchived) {
            containerClasses.push('opacity-60');
        }

        if (task.priority === 'high' && !isArchived) {
            // High Priority: Red border + Glow + Ring
            borderClass = 'border-red-500 dark:border-red-500';
            containerClasses.push('ring-1 ring-red-500/50 animate-breathingGlowRed');
        } 
        
        // Removed specific styling for 'inprogress' to keep only the red border for high priority tasks.

        containerClasses.push(borderClass);

        // --- Text Styles ---
        let titleClass = 'font-bold break-words ';
        let descClass = 'text-sm break-words ';

        if (isCancelled) {
            const cancelledColor = 'text-gray-500 dark:text-gray-400 line-through';
            titleClass += cancelledColor;
            descClass += cancelledColor;
        } else if (isDone) {
            const doneColor = 'text-gray-500 dark:text-gray-400';
            titleClass += doneColor;
            descClass += doneColor;
        } else {
            titleClass += 'text-gray-800 dark:text-gray-200';
            descClass += 'text-gray-600 dark:text-gray-400';
        }

        // --- Due Date Styles ---
        let dueDateClass = 'flex items-center gap-1 ';
        if (isOverdue) dueDateClass += 'text-red-500 dark:text-red-400 font-semibold';
        else if (isToday) dueDateClass += 'text-amber-600 dark:text-amber-400 font-semibold';

        return {
            containerClassName: containerClasses.join(' '),
            titleClassName: titleClass,
            descriptionClassName: descClass,
            dueDateClassName: dueDateClass,
            isOverdue,
            isToday,
            isArchived,
            isDone,
            isCancelled
        };
    }, [task, timezone]);
};
