
import { useMemo } from 'react';
import { Task } from '../types';
import { useSettings } from '../context/SettingsContext';
import { getTodayDateString } from '../lib/taskUtils';
import { TODO_HUB } from '../styles/todo-hub-classes';

export const useTaskStyles = (task: Task) => {
    const { timezone } = useSettings();

    return useMemo(() => {
        const isDone = task.status === 'done';
        const isCancelled = task.status === 'cancelled';
        const isArchived = isDone || isCancelled;

        let isOverdue = false;
        let isToday = false;
        
        if (!isArchived && task.due_date) {
            const todayString = getTodayDateString(timezone);
            isOverdue = task.due_date < todayString;
            isToday = task.due_date === todayString;
        }

        const containerClasses: string[] = [TODO_HUB.taskCard];
        if (isArchived) containerClasses.push(TODO_HUB.taskCardArchived);
        if (task.priority === 'high' && !isArchived) containerClasses.push(TODO_HUB.taskCardHigh);

        let titleClass = 'font-bold break-words text-[var(--text)] ';
        let descClass = 'break-words text-sm text-[var(--muted)] ';

        if (isCancelled) {
            titleClass += 'text-[var(--muted)] line-through';
            descClass += 'line-through opacity-80';
        } else if (isDone) {
            titleClass += 'text-[var(--muted)]';
            descClass += 'opacity-80';
        }

        let dueDateClass = 'flex items-center gap-1 text-[var(--muted)] ';
        if (isOverdue) dueDateClass += 'font-semibold text-red-400';
        else if (isToday) dueDateClass += 'font-semibold text-amber-300';

        return {
            containerClassName: containerClasses.join(' '),
            titleClassName: titleClass,
            descriptionClassName: descClass,
            dueDateClassName: dueDateClass,
            isOverdue,
            isToday,
            isArchived,
            isDone,
            isCancelled,
            liveDurationEnabled: task.status === 'inprogress',
        };
    }, [task, timezone]);
};
