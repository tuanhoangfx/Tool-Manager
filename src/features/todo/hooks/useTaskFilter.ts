import { useMemo } from 'react';

import { Task } from '../types';

import type { TodoFilters } from '../todo-filters';

import { getTodayDateString, getEndOfWeekDateString } from '../lib/taskUtils';



export const useTaskFilter = (tasks: Task[], filters: TodoFilters, timezone: string): Task[] => {

    return useMemo(() => {

        const today = getTodayDateString(timezone);

        const endOfWeek = getEndOfWeekDateString(timezone);



        return tasks.filter(task => {

            const trimmedSearch = filters.searchTerm.trim();



            let searchTermMatch = true;

            if (trimmedSearch) {

                let searchId: number | null = null;



                if (trimmedSearch.startsWith('#')) {

                    const numericPart = trimmedSearch.substring(1);

                    if (/^\d+$/.test(numericPart)) {

                        searchId = parseInt(numericPart, 10);

                    }

                } else if (/^\d+$/.test(trimmedSearch)) {

                    searchId = parseInt(trimmedSearch, 10);

                }



                if (searchId !== null) {

                    searchTermMatch = task.id === searchId;

                } else {

                    const lowerCaseSearch = trimmedSearch.toLowerCase();

                    searchTermMatch = task.title.toLowerCase().includes(lowerCaseSearch) ||

                        Boolean(task.description && task.description.toLowerCase().includes(lowerCaseSearch)) ||

                        Boolean(task.task_comments && task.task_comments.some(c => c.content.toLowerCase().includes(lowerCaseSearch)));

                }

            }



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

