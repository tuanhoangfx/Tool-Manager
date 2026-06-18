import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { useSettings } from '../../../context/SettingsContext';
import type { Profile, Task, Project } from '../../../types';
import { todoKanbanStatusConfig } from '../../../todo-kanban-status';
import type { DataChange, TaskCounts } from '../../../app-types';
import { type SortConfig, sortTasks } from '../../../lib/taskUtils';
import { useCachedSupabaseQuery } from '../../../hooks/useCachedSupabaseQuery';
import { useKanbanDrag } from '../../../hooks/useKanbanDrag';
import { useTaskFilter } from '../../../hooks/useTaskFilter';
import { useSyncTodoChrome } from '../../../hooks/useSyncTodoChrome';
import { useTodoChrome } from '../../../TodoChromeContext';
import { matchesWorkspacePeriod } from '../../../../../lib/hub-workspace-period';
import { TaskBoardSkeleton } from '../../Skeleton';
import TaskColumn from '../../TaskColumn';
import { HubMultiFilterDropdown } from '@tool-workspace/hub-ui';
import { buildTodoMultiFilterDef, profileFilterOptions } from '../../../todo-hub-filter-helpers';

const EMPTY_TASKS: Task[] = [];

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
    const { t, timezone } = useSettings();
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
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
    
    const allTasks_safe = allTasks ?? EMPTY_TASKS;
    
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
        if (timeRange === 'all') return filteredTasksByAssignee;
        const period = { range: timeRange, customMonth, customStartDate, customEndDate };
        return filteredTasksByAssignee.filter((task) => matchesWorkspacePeriod(task.created_at, period));
    }, [filteredTasksByAssignee, timeRange, customMonth, customStartDate, customEndDate]);


    const filteredTasksForBoard = useTaskFilter(tasksForSummaryAndChart, filters, timezone);

    const findTaskById = useCallback(
        (id: number) => allTasks_safe.find((t) => t.id === id),
        [allTasks_safe],
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
    
    const employeeFilterDef = useMemo(
        () => buildTodoMultiFilterDef('employee', t.employee, profileFilterOptions(allUsers)),
        [allUsers, t.employee],
    );

    const statusConfig = todoKanbanStatusConfig(t);
    const columns: { tasks: Task[]; status: Task['status'] }[] = [
        { tasks: todo, status: 'todo' },
        { tasks: inprogress, status: 'inprogress' },
        { tasks: done, status: 'done' },
        { tasks: cancelled, status: 'cancelled' },
    ];

    const employeeFilter = (
        <HubMultiFilterDropdown
            filter={employeeFilterDef}
            selected={selectedUserIds}
            onChange={setSelectedUserIds}
        />
    );

    useSyncTodoChrome({
        projects: allProjects,
        allUsers,
        timeFilteredTasks: tasksForSummaryAndChart,
        shownCount: filteredTasksForBoard.length,
        totalCount: tasksForSummaryAndChart.length,
        filterRowLeading: employeeFilter,
        sectionRuleLabel: t.boardView,
    });

    return (
        <div className="w-full min-h-0 flex-1">
                {loading && allTasks_safe.length === 0 ? <TaskBoardSkeleton /> : (
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
                                searchTerm={filters.searchTerm}
                            />
                        ))}
                    </div>
                )}
        </div>
    );
}

export default React.memo(AllTasksView);
