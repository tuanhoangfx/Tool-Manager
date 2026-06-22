import { useMemo } from 'react';

import { matchesDirectoryIdSearch } from '@tool-workspace/hub-ui';

import { Task } from '../types';
import { formatTaskId } from '../lib/taskId';

import type { TodoFilters } from '../todo-filters';

import { getTodayDateString, getEndOfWeekDateString } from '../lib/taskUtils';

function taskTextBlob(task: Task): string {
  return [
    task.title,
    task.description ?? '',
    ...(task.task_comments?.map((c) => c.content) ?? []),
  ]
    .join('\u0001')
    .toLowerCase();
}

export function matchesTodoTaskSearch(task: Task, searchTerm: string): boolean {
  return matchesDirectoryIdSearch(
    { idText: formatTaskId(task.id), textBlob: taskTextBlob(task) },
    searchTerm,
    { mixedRequiresWhitespace: false },
  );
}

export const useTaskFilter = (tasks: Task[], filters: TodoFilters, timezone: string): Task[] => {
    return useMemo(() => {
        const today = getTodayDateString(timezone);
        const endOfWeek = getEndOfWeekDateString(timezone);

        return tasks.filter(task => {
            const searchTermMatch = matchesTodoTaskSearch(task, filters.searchTerm);

            const creatorMatch = filters.creatorIds.length === 0 || (task.created_by && filters.creatorIds.includes(task.created_by));
            const priorityMatch = filters.priorities.length === 0 || filters.priorities.includes(task.priority);
            
            const projectMatch = filters.projectIds.length === 0 ||
              (filters.projectIds.includes(0) && task.project_id == null) ||
              (task.project_id != null && filters.projectIds.includes(task.project_id));

            let dueDateMatch = true;
            if (filters.dueDates.length > 0) {
                const dueDate = task.due_date;
                if (!dueDate) {
                    dueDateMatch = false;
                } else {
                    dueDateMatch = filters.dueDates.some(dueDateFilter => {
                        switch (dueDateFilter) {
                            case 'overdue':
                                return dueDate < today && !['done', 'cancelled'].includes(task.status);
                            case 'today':
                                return dueDate === today;
                            case 'this_week':
                                return dueDate >= today && dueDate <= endOfWeek;
                            default:
                                return false;
                        }
                    });
                }
            }

            return searchTermMatch && creatorMatch && priorityMatch && dueDateMatch && projectMatch;
        });
    }, [tasks, filters, timezone]);
};
