
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { supabase } from "@/todo/lib/supabase";
import { useSettings } from "@/todo/context/SettingsContext";
import { SpinnerIcon } from "@/todo/components/Icons";
import type { ActivityLog } from "@/todo/types";
import { formatAbsoluteDateTime } from "@/todo/lib/taskUtils";
import Avatar from "@/todo/components/common/Avatar";
import VirtualItem from "@/todo/components/common/VirtualItem";
import { ActivityLogItemSkeleton } from "@/todo/components/Skeleton";
import MultiSelectDropdown, { MultiSelectOption } from "@/todo/components/dashboard/admin/MultiSelectEmployeeDropdown";
import CopyIdButton from "@/todo/components/common/CopyIdButton";
import { TodoHubSearchInput } from "@/todo/components/common/TodoHubSearchInput";
import GenericListModal from "@/todo/components/GenericListModal";
import { useCachedSupabaseQuery } from "@/todo/hooks/useCachedSupabaseQuery";
import type { Session } from '@supabase/supabase-js';

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogClick: (log: ActivityLog) => void;
  session: Session | null;
}

const ActivityLogModal: React.FC<ActivityLogModalProps> = ({ isOpen, onClose, onLogClick, session }) => {
    const { t, language, timezone } = useSettings();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterUsers, setFilterUsers] = useState<string[]>([]);
    const [filterActions, setFilterActions] = useState<string[]>([]);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const fetchLogsQuery = useCallback(async () => {
        if (!session?.user) return { data: [], error: null };
        return await supabase
            .from('activity_logs')
            .select('*, profiles(id, full_name, avatar_url, role)')
            .order('created_at', { ascending: false })
            .limit(200);
    }, [session?.user?.id]);

    const { data: logs, loading } = useCachedSupabaseQuery<ActivityLog[]>({
        cacheKey: 'global_activity_logs',
        query: fetchLogsQuery,
        dependencies: [session?.user?.id, isOpen],
        lastDataChange: null, // Full refresh on open or batch update
    });

    const safeLogs = logs || [];

    const formatLogMessage = useCallback((log: ActivityLog) => {
        const user = log.profiles?.full_name || t.a_user;
        const task = log.details?.task_title ? `"${log.details.task_title}"` : t.a_task;
        
        const statusMap = {
            todo: t.todo,
            inprogress: t.inprogress,
            done: t.done,
            cancelled: t.cancelled,
        };

        switch (log.action) {
            case 'created_task':
                return t.log_created_task(user, task);
            case 'updated_task':
                return t.log_updated_task(user, task);
            case 'deleted_task':
                return t.log_deleted_task(user, task);
            case 'status_changed':
                const fromStatus = statusMap[log.details?.from as keyof typeof statusMap] || log.details?.from;
                const toStatus = statusMap[log.details?.to as keyof typeof statusMap] || log.details?.to;
                return t.log_status_changed(user, task, fromStatus ?? "", toStatus ?? "");
            case 'added_attachments':
                return t.log_added_attachments(user, log.details?.count || 0, task);
            case 'removed_attachments':
                 return t.log_removed_attachments(user, log.details?.count || 0, task);
            case 'cleared_cancelled_tasks':
                return t.log_cleared_cancelled_tasks(user, log.details?.count || 0);
            default:
                return `${user} ${log.action} ${task}`;
        }
    }, [t]);

    const userOptions: MultiSelectOption[] = useMemo(() => {
        const users = new Map<string, { id: string, label: string, avatarUrl?: string }>();
        safeLogs.forEach(log => {
            if (log.profiles && !users.has(log.profiles.id)) {
                users.set(log.profiles.id, { id: log.profiles.id, label: log.profiles.full_name || 'Unknown', avatarUrl: log.profiles.avatar_url || undefined });
            }
        });
        return Array.from(users.values()).sort((a, b) => a.label.localeCompare(b.label));
    }, [safeLogs]);

    const actionTypes: { [key: string]: string } = useMemo(() => ({
        created_task: t.log_action_created_task,
        updated_task: t.log_action_updated_task,
        deleted_task: t.log_action_deleted_task,
        status_changed: t.log_action_status_changed,
        added_attachments: t.log_action_added_attachments,
        removed_attachments: t.log_action_removed_attachments,
        cleared_cancelled_tasks: t.log_action_cleared_cancelled_tasks,
    }), [t]);

    const actionOptions: MultiSelectOption[] = useMemo(() => 
        (Array.from(new Set(safeLogs.map(log => log.action))) as string[])
        .map(action => ({ id: action, label: actionTypes[action] || action }))
    , [safeLogs, actionTypes]);

    const filteredLogs = useMemo(() => {
        return safeLogs.filter(log => {
            const userMatch = filterUsers.length === 0 || (log.user_id && filterUsers.includes(log.user_id));
            const actionMatch = filterActions.length === 0 || filterActions.includes(log.action);
            
            let searchMatch = true;
            if (searchTerm.trim()) {
                const lowerCaseSearch = searchTerm.toLowerCase();
                const message = formatLogMessage(log).toLowerCase();
                searchMatch = message.includes(lowerCaseSearch);
            }
            
            return userMatch && actionMatch && searchMatch;
        });
    }, [safeLogs, searchTerm, filterUsers, filterActions, formatLogMessage]);
    
    const getUserLabel = (selectedCount: number, totalCount: number) => {
        if (selectedCount === 0 || selectedCount === totalCount) return t.log_allUsers;
        if (selectedCount === 1) {
            const user = userOptions.find(u => u.id === filterUsers[0]);
            return user?.label || '1 User';
        }
        return `${selectedCount} Users`;
    };

    const getActionLabel = (selectedCount: number, totalCount: number) => {
        if (selectedCount === 0 || selectedCount === totalCount) return t.log_allActions;
        return `${selectedCount} Actions`;
    };

    const filterContent = (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <TodoHubSearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={t.log_searchPlaceholder}
            />
            <MultiSelectDropdown
                options={userOptions}
                selectedIds={filterUsers}
                onChange={setFilterUsers}
                buttonLabel={getUserLabel}
                buttonIcon={<></>}
                searchPlaceholder={t.searchUsers}
                allLabel={t.log_allUsers}
                widthClass="w-full"
            />
            <MultiSelectDropdown
                options={actionOptions}
                selectedIds={filterActions}
                onChange={setFilterActions}
                buttonLabel={getActionLabel}
                buttonIcon={<></>}
                searchPlaceholder="Search actions..."
                allLabel={t.log_allActions}
                widthClass="w-full"
            />
        </div>
    );

    return (
        <GenericListModal
            isOpen={isOpen}
            onClose={onClose}
            title={t.activityLog}
            filterContent={filterContent}
            scrollRef={scrollContainerRef}
            footerContent={loading && safeLogs.length > 0 ? <span className="text-[10px] text-gray-400 italic px-2">Refreshing...</span> : null}
        >
            {loading && safeLogs.length === 0 ? (
                <div className="flex justify-center items-center h-40">
                    <SpinnerIcon size={32} className="animate-spin text-[var(--accent-color)]" />
                </div>
            ) : filteredLogs.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-10">{t.noActivity}</p>
            ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredLogs.map(log => {
                        const message = formatLogMessage(log);
                        const isClickable = !!log.task_id;
                        
                        return (
                        <VirtualItem key={log.id} rootRef={scrollContainerRef} placeholder={<ActivityLogItemSkeleton />}>
                            <li 
                                className={`flex items-start gap-3 p-3 transition-colors ${isClickable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50' : ''}`}
                                onClick={() => isClickable && onLogClick(log)}
                            >
                                <div className="flex-shrink-0 mt-0.5">
                                    {log.profiles && <Avatar user={log.profiles} title={log.profiles.full_name || ''} size={32} />}
                                </div>
                                <div className="flex-grow">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
                                        <span>{message}</span>
                                        {log.task_id && <CopyIdButton id={log.task_id} isInline />}
                                    </p>
                                    <time className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{formatAbsoluteDateTime(log.created_at, language, timezone)}</time>
                                </div>
                            </li>
                        </VirtualItem>
                        );
                    })}
                </ul>
            )}
        </GenericListModal>
    );
};

export default ActivityLogModal;
