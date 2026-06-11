import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSettings } from '../../../context/SettingsContext';
import { fetchUserTasks } from '../../../lib/userTasksQuery';
import type { Task, TimeLog, Profile, ProjectMember, Project } from '../../../types';
import type { Session } from '@supabase/supabase-js';
import { todoKanbanStatusConfig } from '../../../todo-kanban-status';
import { TodoCalendarView } from '../../TodoCalendarView';
import type { DataChange, TaskCounts } from '../../../app-types';
import { type SortConfig, sortTasks } from '../../../lib/taskUtils';
import type { CalendarSortState } from '../../../lib/calendar-types';
import { useCachedSupabaseQuery } from '../../../hooks/useCachedSupabaseQuery';
import { useKanbanDrag } from '../../../hooks/useKanbanDrag';
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

    const taskQuery = useCallback(async () => fetchUserTasks(session.user.id), [session.user.id]);

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

    const findTaskById = useCallback(
        (id: number) => tasks_safe.find((t) => t.id === id),
        [tasks_safe],
    );
    const kanbanDrag = useKanbanDrag(findTaskById, onUpdateStatus);

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
        const statusConfig = todoKanbanStatusConfig(t);
        const columns: { tasks: Task[]; status: Task['status'] }[] = [
            { tasks: todo, status: 'todo' },
            { tasks: inprogress, status: 'inprogress' },
            { tasks: done, status: 'done' },
            { tasks: cancelled, status: 'cancelled' },
        ];

        return (
            <div className={`grid min-h-[60vh] grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4${kanbanDrag.isDragging ? ' todo-kanban-board--dragging' : ''}`}>
                {columns.map(({ tasks, status }) => (
                    <TaskColumn
                        key={status}
                        status={status}
                        title={statusConfig[status].title}
                        icon={statusConfig[status].icon}
                        tasks={tasks}
                        sortConfig={sortConfigs[status]}
                        onSortChange={(newConfig) => setSortConfigs(prev => ({ ...prev, [status]: newConfig }))}
                        isDragOver={kanbanDrag.dragOverStatus === status}
                        draggingTaskId={kanbanDrag.draggingTaskId}
                        onDrop={kanbanDrag.dropOnColumn}
                        onEnterColumn={kanbanDrag.enterColumn}
                        onLeaveColumn={kanbanDrag.leaveColumn}
                        onBeginDrag={kanbanDrag.beginDrag}
                        onEndDrag={kanbanDrag.endDrag}
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
        shownCount: filteredTasksForBoard.length,
        totalCount: timeFilteredTasks.length,
        filterToolbarLeading: session ? <DashboardViewToggle view={view} setView={setView} /> : null,
        sectionRuleLabel: view === 'board' ? t.boardView : t.calendarView,
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
