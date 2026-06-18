import { useMemo } from 'react';

import { Task } from '../types';
import { formatTaskId } from '../lib/taskId';
import { extractNumericSearchTerm } from '../lib/taskSearchHighlight';

import type { TodoFilters } from '../todo-filters';

import { getTodayDateString, getEndOfWeekDateString } from '../lib/taskUtils';

function taskTextMatches(task: Task, lower: string): boolean {  return task.title.toLowerCase().includes(lower) ||
    Boolean(task.description && task.description.toLowerCase().includes(lower)) ||
    Boolean(task.task_comments && task.task_comments.some(c => c.content.toLowerCase().includes(lower)));
}

export function matchesTodoTaskSearch(task: Task, searchTerm: string): boolean {
  const trimmedSearch = searchTerm.trim();
  if (!trimmedSearch) return true;

  const paddedId = formatTaskId(task.id);
  const numericOnly = extractNumericSearchTerm(trimmedSearch);

  if (numericOnly !== null) {
    return paddedId.includes(numericOnly);
  }

  const lower = trimmedSearch.toLowerCase();
  const digits = trimmedSearch.replace(/\D/g, '');
  const letters = trimmedSearch.replace(/[\d#]/g, '').trim().toLowerCase();

  if (digits && letters) {
    return paddedId.includes(digits) && taskTextMatches(task, letters);
  }

  return taskTextMatches(task, lower) || (digits.length > 0 && paddedId.includes(digits));
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
