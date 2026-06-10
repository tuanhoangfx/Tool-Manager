import { Task } from '../types';

export type SortField = 'priority' | 'created_at' | 'due_date' | 'updated_at' | 'status' | 'compound_status_priority' | 'compound_todo_default' | 'compound_inprogress_default';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

const priorityOrder: { [key in Task['priority']]: number } = { high: 3, medium: 2, low: 1 };
const statusOrder: { [key in Task['status']]: number } = { todo: 4, inprogress: 3, done: 2, cancelled: 1 };

export const sortTasks = (tasks: Task[], config: SortConfig): Task[] => {
  const sorted = [...tasks];
  sorted.sort((a, b) => {
    let { field, direction } = config;
    const dir = direction === 'asc' ? 1 : -1;

    let compareResult = 0;

    if (field === 'compound_todo_default') {
        // 1. Priority DESC
        compareResult = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (compareResult !== 0) return compareResult;
        // 2. Created At DESC (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }

    if (field === 'compound_inprogress_default') {
        // 1. Priority DESC
        compareResult = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (compareResult !== 0) return compareResult;
        // 2. Due Date ASC (nearest first, nulls last)
        const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        compareResult = dateA - dateB;
        if (compareResult !== 0) return compareResult;
        // 3. Created At DESC (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }

    if (field === 'compound_status_priority') {
      // Primary sort: status (desc)
      compareResult = statusOrder[b.status] - statusOrder[a.status];
      if (compareResult !== 0) return compareResult;

      // Secondary sort: priority (desc)
      compareResult = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (compareResult !== 0) return compareResult;

      // Tertiary sort: creation date (asc)
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateA - dateB;
    }

    if (field === 'priority') {
      compareResult = (priorityOrder[a.priority] - priorityOrder[b.priority]) * dir;
    } else if (field === 'status') {
      compareResult = (statusOrder[a.status] - statusOrder[b.status]) * dir;
    } else if (field === 'created_at' || field === 'due_date' || field === 'updated_at') {
      const dateA = a[field] ? new Date(a[field]!).getTime() : (direction === 'asc' ? Infinity : -Infinity);
      const dateB = b[field] ? new Date(b[field]!).getTime() : (direction === 'asc' ? Infinity : -Infinity);
      compareResult = (dateA - dateB) * dir;
    }

    // Secondary sort for priority and status: by creation date ASC (oldest first)
    if (compareResult === 0 && (field === 'priority' || field === 'status')) {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateA - dateB;
    }
    
    // Default secondary sort: creation date ascending for all other primary sorts if they are equal
    if (compareResult === 0) {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateA - dateB;
    }

    return compareResult;
  });
  return sorted;
};

export const formatAbsoluteDateTime = (dateString: string, lang: string, timezone: string | undefined) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        const options: Intl.DateTimeFormatOptions = {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: timezone,
            hour12: false,
        };
        // Replace slashes with a character, then replace back to format DD/MM/YYYY HH:mm
        return new Intl.DateTimeFormat(lang, options).format(date).replace(/\//g, '/').replace(',', '');
    } catch (e) {
        console.error("Error formatting date:", e);
        return dateString;
    }
};

const getDateStringInTimezone = (date: Date, timezone: string): string => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return formatter.format(date);
}

export const getTodayDateString = (timezone: string): string => {
    return getDateStringInTimezone(new Date(), timezone);
};

export const getEndOfWeekDateString = (timezone: string): string => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // Sunday - 0, Saturday - 6
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - dayOfWeek)); // Get the upcoming Saturday
    return getDateStringInTimezone(endOfWeek, timezone);
};