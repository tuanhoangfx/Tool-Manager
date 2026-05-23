// @ts-nocheck

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSettings } from '../../../context/SettingsContext';
import { supabase } from '../../../lib/supabase';
import type { Task, TimeLog, Profile, ProjectMember, Project } from '../../../types';
import type { Session } from '@supabase/supabase-js';
import { ClipboardListIcon, CheckCircleIcon, XCircleIcon, SpinnerIcon } from '../../Icons';
import CalendarView from '../../CalendarView';
import PerformanceSummary, { TimeRange } from '../../PerformanceSummary';
import FilterBar, { Filters } from '../../FilterBar';
import type { DataChange, TaskCounts } from '../../../App';
import { type SortConfig, sortTasks } from '../../../lib/taskUtils';
import { useCachedSupabaseQuery } from '../../../hooks/useCachedSupabaseQuery';
import { useTaskFilter } from '../../../hooks/useTaskFilter';
import { TaskBoardSkeleton } from '../../Skeleton';
import TaskColumn from '../../TaskColumn';
import DashboardViewToggle from '../DashboardViewToggle';
import { CalendarSortState } from '../../CalendarView';


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

const EmployeeDashboard: React.FC<TaskDashboardProps> = ({ session, lastDataChange, onEditTask, onDeleteTask, onUpdateStatus, onClearCancelledTasks, allUsers, setTaskCounts, userProjects }) => {
    const { t, timezone } = useSettings();
    const [view, setView] = useState<'board' | 'calendar'>('board');
    const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
    const [dragOverStatus, setDragOverStatus] = useState<Task['status'] | null>(null);
    const [filters, setFilters] = useState<Filters>({ searchTerm: '', creatorIds: [], priorities: [], dueDates: [], projectIds: [] });
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
    
    const [timeRange, setTimeRange] = useState<TimeRange>('last30Days');
    const [customMonth, setCustomMonth] = useState(new Date().toISOString().slice(0, 7));
    const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);

    const taskQuery = useCallback(() => {
        // Query logic updated to strictly match the RLS Policy:
        // 1. Direct assignee (user_id)
        // 2. Creator (created_by)
        // 3. Part of assignees list (JSONB contains)
        // Note: Using a raw string in .or() allows proper combination of JSON filtering with standard column equality
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
    
    const tasks_safe = tasks || [];

    const timeFilteredTasks = useMemo(() => {
        const now = new Date();
        let startDate: Date;
        let endDate: Date;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        switch (timeRange) {
            case 'today':
                startDate = todayStart;
                endDate = todayEnd;
                break;
            case 'thisWeek':
                const firstDayOfWeek = new Date(todayStart);
                firstDayOfWeek.setDate(todayStart.getDate() - todayStart.getDay());
                startDate = firstDayOfWeek;
                endDate = todayEnd;
                break;
            case 'thisMonth':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = todayEnd;
                break;
            case 'lastWeek':
                const lastWeekStart = new Date(todayStart);
                lastWeekStart.setDate(todayStart.getDate() - todayStart.getDay() - 7);
                startDate = lastWeekStart;
                
                const lastWeekEnd = new Date(lastWeekStart);
                lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
                lastWeekEnd.setHours(23, 59, 59, 999);
                endDate = lastWeekEnd;
                break;
            case 'last30Days':
                startDate = new Date(todayStart);
                startDate.setDate(todayStart.getDate() - 30);
                endDate = todayEnd;
                break;
            case 'customMonth':
                if (!customMonth) return tasks_safe;
                const [year, month] = customMonth.split('-').map(Number);
                startDate = new Date(year, month - 1, 1);
                endDate = new Date(year, month, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'customRange':
                if (!customStartDate) return tasks_safe;
                startDate = new Date(customStartDate);
                startDate.setHours(0, 0, 0, 0);
                endDate = customEndDate ? new Date(customEndDate) : new Date(customStartDate);
                endDate.setHours(23, 59, 59, 999);
                break;
            default:
                // Default to last 30 days if somehow undefined
                startDate = new Date(todayStart);
                startDate.setDate(todayStart.getDate() - 30);
                endDate = todayEnd;
        }

        return tasks_safe.filter(task => {
            const taskDate = new Date(task.created_at);
            return taskDate >= startDate && taskDate <= endDate;
        });
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
        setTaskCounts({
            todo: todo.length,
            inprogress: inprogress.length,
            done: done.length,
        });
    }, [todo, inprogress, done, setTaskCounts]);
    
    const renderBoardColumns = () => {
        const statusConfig = {
            todo: { icon: <ClipboardListIcon size={16} className="text-orange-500" />, borderColor: 'border-orange-500', title: t.todo },
            inprogress: { icon: <SpinnerIcon size={16} className="text-indigo-500 animate-spin" />, borderColor: 'border-indigo-500', title: t.inprogress },
            done: { icon: <CheckCircleIcon size={16} className="text-green-500" />, borderColor: 'border-green-500', title: t.done },
            cancelled: { icon: <XCircleIcon size={16} className="text-gray-500" />, borderColor: 'border-gray-500', title: t.cancelled },
        };
        const columns: { tasks: Task[]; status: Task['status'] }[] = [
            { tasks: todo, status: 'todo' },
            { tasks: inprogress, status: 'inprogress' },
            { tasks: done, status: 'done' },
            { tasks: cancelled, status: 'cancelled' },
        ];

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 min-h-[60vh]">
                {columns.map(({ tasks, status }) => (
                    <TaskColumn
                        key={status}
                        status={status}
                        title={statusConfig[status].title}
                        icon={statusConfig[status].icon}
                        borderColor={statusConfig[status].borderColor}
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

    if (!session) {
         return <div className="text-center p-8">{t.signInToManageTasks}</div>;
    }
    
    const projectsForFilter = userProjects.map(p => p.projects).filter((p): p is Project => p !== null);
    
    return (
        <div className="w-full animate-fadeInUp space-y-6">
            <FilterBar 
                filters={filters} 
                onFilterChange={setFilters} 
                allUsers={allUsers}
                projects={projectsForFilter}
                timeRange={timeRange}
                setTimeRange={setTimeRange}
                customMonth={customMonth}
                setCustomMonth={setCustomMonth}
                customStartDate={customStartDate}
                setCustomStartDate={setCustomStartDate}
                customEndDate={customEndDate}
                setCustomEndDate={setCustomEndDate}
            >
                <DashboardViewToggle view={view} setView={setView} />
            </FilterBar>

            <PerformanceSummary
                title={t.performanceSummary}
                tasks={timeFilteredTasks}
             />
            
            {loading && tasks_safe.length === 0 ? (
                <TaskBoardSkeleton />
            ) : view === 'board' ? (
                renderBoardColumns()
            ) : (
                <CalendarView
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
