import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSettings } from '../../../context/SettingsContext';
import { supabase } from '../../../lib/supabase';
import type { Task, TimeLog, Profile, ProjectMember, Project } from '../../../types';
import type { Session } from '@supabase/supabase-js';
import { ClipboardListIcon, CheckCircleIcon, XCircleIcon, SpinnerIcon } from '../../Icons';
import { TodoCalendarView } from '../../TodoCalendarView';
import type { DataChange, TaskCounts } from '../../../app-types';
import { type SortConfig, sortTasks } from '../../../lib/taskUtils';
import type { CalendarSortState } from '../../../lib/calendar-types';
import { useCachedSupabaseQuery } from '../../../hooks/useCachedSupabaseQuery';
import { useTaskFilter } from '../../../hooks/useTaskFilter';
import { useSyncTodoChrome } from '../../../hooks/useSyncTodoChrome';
import { useTodoChrome } from '../../../TodoChromeContext';
import { matchesWorkspacePeriod } from '../../../../../lib/hub-workspace-period';
import { TaskBoardSkeleton } from '../../Skeleton';
import TaskColumn from '../../TaskColumn';
import DashboardViewToggle from '../DashboardViewToggle';

const EMPTY_TASKS: Task[] = [];
interface TaskDashboardProps {
    session: Session;
    lastDataChange: DataChange | null;
    onEditTask: (task: Task | Partial<Task> | null) => void;
    onDeleteTask: (task: Task) => void;
    onClearCancelledTasks: (tasks: Task[]) => void;
    onUpdateStatus: (task: Task, status: Task['status']) => Promise<boolean>;
    onStartTimer: (task: Task) => void;
    onStopTimer: (timeLog: TimeLog) => void;
    activeTimer: TimeLog | null;
    allUsers: Profile[];
    setTaskCounts: React.Dispatch<React.SetStateAction<TaskCounts>>;
    userProjects: ProjectMember[];
}

const EmployeeDashboard: React.FC<TaskDashboardProps> = ({
    session,
    lastDataChange,
    onEditTask,
    onDeleteTask,
    onUpdateStatus,
    onClearCancelledTasks,
    allUsers,
    setTaskCounts,
    userProjects,
}) => {
    const { t, timezone } = useSettings();
    const [view, setView] = useState<'board' | 'calendar'>('board');
    const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
    const [dragOverStatus, setDragOverStatus] = useState<Task['status'] | null>(null);
    const {
        filters,
        timeRange,
        customMonth,
        customStartDate,
        customEndDate,
    } = useTodoChrome();
    const [sortConfigs, setSortConfigs] = useState<{ [key in Task['status']]: SortConfig }>({
        todo: { field: 'compound_todo_default', direction: 'desc' },
        inprogress: { field: 'compound_inprogress_default', direction: 'desc' },
        done: { field: 'updated_at', direction: 'desc' },
        cancelled: { field: 'updated_at', direction: 'desc' },
    });
    
    const [calendarSort, setCalendarSort] = useState<CalendarSortState>({
        id: 'default',
        config: { field: 'compound_status_priority', direction: 'desc' }
    });

    const taskQuery = useCallback(async () => {
        const userId = session.user.id;
        const jsonFilter = `assignees.cs.[{"user_id": "${userId}"}]`;
        
        return supabase
            .from('tasks')
            .select('*, assignee:user_id(*), creator:created_by(*), projects:project_id(*), task_attachments(*), task_time_logs(*), task_comments(*, profiles(*))')
            .or(`user_id.eq.${userId},created_by.eq.${userId},${jsonFilter}`)
            .order('priority', { ascending: false })
            .order('created_at', { ascending: true });
    }, [session.user.id]);

    // Real-time filter must strictly mirror the database RLS to prevent "blinking"
    const realtimeFilter = useCallback((task: any) => {
        const userId = session.user.id;
        // 1. Is direct assignee
        if (task.user_id === userId) return true;
        // 2. Is creator
        if (task.created_by === userId) return true;
        // 3. Is in assignees list (multi-assignee)
        if (task.assignees && Array.isArray(task.assignees)) {
            // Check if any object in the array has the user_id
            if (task.assignees.some((a: any) => a.user_id === userId)) return true;
        }
        return false;
    }, [session.user.id]);

    const { data: tasks, loading } = useCachedSupabaseQuery<Task[]>({
        cacheKey: `user_tasks_${session.user.id}`,
        query: taskQuery,
        dependencies: [session.user.id],
        lastDataChange,
        filter: realtimeFilter
    });
    
    const tasks_safe = tasks ?? EMPTY_TASKS;

    const timeFilteredTasks = useMemo(() => {
        if (timeRange === 'all') return tasks_safe;
        const period = { range: timeRange, customMonth, customStartDate, customEndDate };
        return tasks_safe.filter((task) => matchesWorkspacePeriod(task.created_at, period));
    }, [tasks_safe, timeRange, customMonth, customStartDate, customEndDate]);


    const filteredTasksForBoard = useTaskFilter(timeFilteredTasks, filters, timezone);
    
    const handleDrop = (status: Task['status']) => {
        if (draggedTaskId === null) return;
        const taskToMove = tasks_safe.find(t => t.id === draggedTaskId);
        if (taskToMove && taskToMove.status !== status) {
            onUpdateStatus(taskToMove, status);
        }
        setDraggedTaskId(null);
        setDragOverStatus(null);
    };

    const { todo, inprogress, done, cancelled } = useMemo(() => {
        const grouped = {
            todo: filteredTasksForBoard.filter(t => t.status === 'todo'),
            inprogress: filteredTasksForBoard.filter(t => t.status === 'inprogress'),
            done: filteredTasksForBoard.filter(t => t.status === 'done'),
            cancelled: filteredTasksForBoard.filter(t => t.status === 'cancelled'),
        };
        return {
            todo: sortTasks(grouped.todo, sortConfigs.todo),
            inprogress: sortTasks(grouped.inprogress, sortConfigs.inprogress),
            done: sortTasks(grouped.done, sortConfigs.done),
            cancelled: sortTasks(grouped.cancelled, sortConfigs.cancelled),
        };
    }, [filteredTasksForBoard, sortConfigs]);
    
    useEffect(() => {
        setTaskCounts((prev) => {
            const next = {
                todo: todo.length,
                inprogress: inprogress.length,
                done: done.length,
            };
            if (
                prev.todo === next.todo &&
                prev.inprogress === next.inprogress &&
                prev.done === next.done
            ) {
                return prev;
            }
            return next;
        });
    }, [todo.length, inprogress.length, done.length, setTaskCounts]);
    
    const renderBoardColumns = () => {
        const statusConfig = {
            todo: { icon: <ClipboardListIcon size={16} className="text-orange-500" />, title: t.todo },
            inprogress: { icon: <SpinnerIcon size={16} className="text-indigo-500 animate-spin" />, title: t.inprogress },
            done: { icon: <CheckCircleIcon size={16} className="text-green-500" />, title: t.done },
            cancelled: { icon: <XCircleIcon size={16} className="text-gray-500" />, title: t.cancelled },
        };
        const columns: { tasks: Task[]; status: Task['status'] }[] = [
            { tasks: todo, status: 'todo' },
            { tasks: inprogress, status: 'inprogress' },
            { tasks: done, status: 'done' },
            { tasks: cancelled, status: 'cancelled' },
        ];

        return (
            <div className="grid min-h-[60vh] grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {columns.map(({ tasks, status }) => (
                    <TaskColumn
                        key={status}
                        status={status}
                        title={statusConfig[status].title}
                        icon={statusConfig[status].icon}
                        tasks={tasks}
                        sortConfig={sortConfigs[status]}
                        onSortChange={(newConfig) => setSortConfigs(prev => ({ ...prev, [status]: newConfig }))}
                        dragOverStatus={dragOverStatus}
                        onDrop={handleDrop}
                        setDragOverStatus={setDragOverStatus}
                        setDraggedTaskId={setDraggedTaskId}
                        onEditTask={onEditTask}
                        onDeleteTask={onDeleteTask}
                        onUpdateStatus={onUpdateStatus}
                        onClearCancelledTasks={onClearCancelledTasks}
                        lastDataChange={lastDataChange}
                    />
                ))}
            </div>
        );
    };

    const projectsForFilter = userProjects.map(p => p.projects).filter((p): p is Project => p !== null);

    useSyncTodoChrome({
        projects: projectsForFilter,
        allUsers,
        timeFilteredTasks: session ? timeFilteredTasks : [],
        filterToolbarLeading: session ? <DashboardViewToggle view={view} setView={setView} /> : null,
    });

    if (!session) {
         return <div className="text-center p-8">{t.signInToManageTasks}</div>;
    }

    return (
        <div className="w-full min-h-0 flex-1">
            {loading && tasks_safe.length === 0 ? (
                <TaskBoardSkeleton />
            ) : view === 'board' ? (
                renderBoardColumns()
            ) : (
                <TodoCalendarView
                    tasks={filteredTasksForBoard}
                    onTaskClick={onEditTask}
                    calendarSort={calendarSort}
                    onCalendarSortChange={setCalendarSort}
                />
            )}
        </div>
    );
};

export default EmployeeDashboard;
