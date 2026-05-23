// @ts-nocheck

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { useSettings } from '../../../context/SettingsContext';
import type { Profile, Task, Project } from '../../../types';
import { ClipboardListIcon, CheckCircleIcon, XCircleIcon, SpinnerIcon, UsersIcon } from '../../Icons';
import PerformanceSummary, { TimeRange } from '../../PerformanceSummary';
import FilterBar, { Filters } from '../../FilterBar';
import type { DataChange, TaskCounts } from '../../../App';
import { type SortConfig, sortTasks } from '../../../lib/taskUtils';
import { useCachedSupabaseQuery } from '../../../hooks/useCachedSupabaseQuery';
import { useTaskFilter } from '../../../hooks/useTaskFilter';
import { TaskBoardSkeleton } from '../../Skeleton';
import TaskColumn from '../../TaskColumn';
import MultiSelectDropdown from './MultiSelectEmployeeDropdown';

interface AllTasksViewProps {
    profile: Profile | null;
    lastDataChange: DataChange | null;
    allUsers: Profile[];
    allProjects: Project[];
    onEditTask: (task: Task | Partial<Task> | null) => void;
    onDeleteTask: (task: Task) => void;
    onUpdateStatus: (task: Task, status: Task['status']) => Promise<boolean>;
    onClearCancelledTasks: (tasks: Task[]) => void;
    setTaskCounts: React.Dispatch<React.SetStateAction<TaskCounts>>;
}

const AllTasksView: React.FC<AllTasksViewProps> = ({ profile, lastDataChange, allUsers, allProjects, onEditTask, onDeleteTask, onUpdateStatus, onClearCancelledTasks, setTaskCounts }) => {
    const { t, language, timezone } = useSettings();
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
    const [dragOverStatus, setDragOverStatus] = useState<Task['status'] | null>(null);
    const [filters, setFilters] = useState<Filters>({ searchTerm: '', creatorIds: [], priorities: [], dueDates: [], projectIds: [] });
    const [sortConfigs, setSortConfigs] = useState<{ [key in Task['status']]: SortConfig }>({
        todo: { field: 'compound_todo_default', direction: 'desc' },
        inprogress: { field: 'compound_inprogress_default', direction: 'desc' },
        done: { field: 'updated_at', direction: 'desc' },
        cancelled: { field: 'updated_at', direction: 'desc' },
    });
    
    const [timeRange, setTimeRange] = useState<TimeRange>('last30Days');
    const [customMonth, setCustomMonth] = useState(new Date().toISOString().slice(0, 7));
    const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);

    // Optimize dependency: Create a stable string key for projects to avoid refetch loops
    const projectIdsString = useMemo(() => {
        return allProjects.map(p => p.id).sort().join(',');
    }, [allProjects]);

    const allTasksQuery = useCallback(async () => {
        if (!profile) return { data: [], error: null };

        // FIX: Explicitly use 'projects:project_id(*)' here as well
        let query = supabase.from('tasks').select('*, assignee:user_id(*), creator:created_by(*), projects:project_id(*), task_attachments(*), task_time_logs(*), task_comments(*, profiles(*))').order('priority', { ascending: false }).order('created_at', { ascending: true });

        if (profile.role === 'manager') {
            const currentProjectIds = projectIdsString ? projectIdsString.split(',').map(Number) : [];
            if (currentProjectIds.length === 0) {
                 return { data: [], error: null };
            }
            query = query.in('project_id', currentProjectIds);
        }
        
        return query;

    }, [profile, projectIdsString]);

    // Filter for realtime updates for Managers (restrict to their projects)
    const realtimeFilter = useCallback((task: any) => {
        if (!profile) return false;
        if (profile.role === 'admin') return true; // Admins see everything
        
        if (profile.role === 'manager') {
            const currentProjectIds = projectIdsString ? projectIdsString.split(',').map(Number) : [];
            // Only allow tasks that belong to the manager's projects
            if (task.project_id && currentProjectIds.includes(task.project_id)) {
                return true;
            }
            return false;
        }
        return false;
    }, [profile, projectIdsString]);

    const { data: allTasks, loading } = useCachedSupabaseQuery<Task[]>({
        cacheKey: `admin_all_tasks_${profile?.id}`,
        query: allTasksQuery,
        dependencies: [profile?.id, projectIdsString],
        lastDataChange,
        filter: realtimeFilter
    });
    
    const allTasks_safe = allTasks || [];
    
    const filteredTasksByAssignee = useMemo(() => {
        if (selectedUserIds.length === 0) {
            return allTasks_safe;
        }
        return allTasks_safe.filter(task => {
            return selectedUserIds.some(selectedId => {
                const isCreator = task.created_by === selectedId;
                
                const isAssignee = task.user_id === selectedId || 
                                 (task.assignees && Array.isArray(task.assignees) && task.assignees.some((a: any) => a.user_id === selectedId));

                // If user is not involved at all, don't show.
                if (!isCreator && !isAssignee) {
                    return false;
                }

                // Check for the exclusion case: purely self-assigned task.
                // A task is assigned to others if the primary assignee is someone else,
                // OR if the multi-assignee list contains someone else.
                const isAssignedToOthers = (task.user_id && task.user_id !== selectedId) ||
                                         (task.assignees && Array.isArray(task.assignees) && task.assignees.some((a: any) => a.user_id !== selectedId));

                // If the user created it, is an assignee, but no one else is assigned, hide it.
                if (isCreator && isAssignee && !isAssignedToOthers) {
                    return false;
                }

                // In all other cases of involvement, show the task.
                return true;
            });
        });
    }, [allTasks_safe, selectedUserIds]);

    const tasksForSummaryAndChart = useMemo(() => {
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
                if (!customMonth) return filteredTasksByAssignee;
                const [year, month] = customMonth.split('-').map(Number);
                startDate = new Date(year, month - 1, 1);
                endDate = new Date(year, month, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'customRange':
                if (!customStartDate) return filteredTasksByAssignee;
                startDate = new Date(customStartDate);
                startDate.setHours(0, 0, 0, 0);
                endDate = customEndDate ? new Date(customEndDate) : new Date(customStartDate);
                endDate.setHours(23, 59, 59, 999);
                break;
            default:
                // Default to last 30 days
                startDate = new Date(todayStart);
                startDate.setDate(todayStart.getDate() - 30);
                endDate = todayEnd;
        }

        return filteredTasksByAssignee.filter(task => {
            const taskDate = new Date(task.created_at);
            return taskDate >= startDate && taskDate <= endDate;
        });
    }, [filteredTasksByAssignee, timeRange, customMonth, customStartDate, customEndDate]);


    const filteredTasksForBoard = useTaskFilter(tasksForSummaryAndChart, filters, timezone);


    const handleDrop = (status: Task['status']) => {
        if (draggedTaskId === null) return;
        const taskToMove = allTasks_safe.find(t => t.id === draggedTaskId);
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
    
    const getEmployeeLabel = (selectedCount: number, totalCount: number) => {
        if (selectedCount === 0 || selectedCount === totalCount) {
          return t.allEmployees;
        }
        if (selectedCount === 1) {
            const user = allUsers.find(u => u.id === selectedUserIds[0]);
            return user?.full_name || `1 ${t.employee}`;
        }
        const pluralEmployee = language === 'vi' ? t.employee : `${t.employee}s`;
        return `${selectedCount}/${allUsers.length} ${pluralEmployee}`;
    };

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
        <div className="w-full">
            <div className="space-y-6">
                 <FilterBar 
                    filters={filters} 
                    onFilterChange={setFilters} 
                    allUsers={allUsers}
                    projects={allProjects}
                    timeRange={timeRange}
                    setTimeRange={setTimeRange}
                    customMonth={customMonth}
                    setCustomMonth={setCustomMonth}
                    customStartDate={customStartDate}
                    setCustomStartDate={setCustomStartDate}
                    customEndDate={customEndDate}
                    setCustomEndDate={setCustomEndDate}
                >
                    <MultiSelectDropdown
                        options={allUsers.map(u => ({ id: u.id, label: u.full_name || '', avatarUrl: u.avatar_url || undefined }))}
                        selectedIds={selectedUserIds}
                        onChange={setSelectedUserIds}
                        buttonLabel={getEmployeeLabel}
                        buttonIcon={<UsersIcon size={16} />}
                        searchPlaceholder={t.searchUsers}
                        allLabel={t.allEmployees}
                    />
                </FilterBar>
                <PerformanceSummary
                    title={t.allTasksBoard}
                    tasks={tasksForSummaryAndChart}
                />
                {loading && allTasks_safe.length === 0 ? <TaskBoardSkeleton /> : (
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
                )}
            </div>
        </div>
    );
}

export default React.memo(AllTasksView);
