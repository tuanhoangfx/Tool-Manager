
import React, { useState, useMemo, useCallback } from 'react';
import { Bell } from "lucide-react";
import {
  HubModalDirectoryEmptyFiltered,
  HubModalDirectoryFilterBar,
  HubResultCount,
  type FilterValues,
} from "@tool-workspace/hub-ui";
import { supabase } from "../lib/supabase";
import { useSettings } from "../context/SettingsContext";
import { SpinnerIcon, BellIcon } from "./Icons";
import type { Notification } from "../types";
import { formatAbsoluteDateTime } from "../lib/taskUtils";
import Avatar from "./common/Avatar";
import { buildTodoMultiFilterDef } from "../todo-hub-filter-helpers";
import CopyIdButton from "./common/CopyIdButton";
import GenericListModal from "./GenericListModal";
import { useCachedSupabaseQuery } from "../hooks/useCachedSupabaseQuery";
import type { Session } from '@supabase/supabase-js';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick: (notification: Notification) => void;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  session: Session | null;
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose, onNotificationClick, setUnreadCount, session }) => {
    const { t, language, timezone } = useSettings();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterValues, setFilterValues] = useState<FilterValues>({});

    const formatNotificationMessage = useCallback((notification: Notification) => {
        const actorName = notification.profiles?.full_name || 'Someone';
        const taskTitle = notification.data.task_title || 'a task';

        switch (notification.type) {
            case 'new_task_assigned':
                 return t.notifications_new_task(actorName, taskTitle);
            case 'new_comment':
                return t.notifications_new_comment(actorName, taskTitle);
            case 'new_project_created':
                return t.notifications_new_project(actorName, notification.data.project_name || 'a new project');
            case 'new_user_registered':
                return t.notifications_new_user(notification.data.new_user_name || 'a new user');
            case 'task_part_completed':
                return t.notifications_task_part_completed(actorName, taskTitle, notification.data.completed_count || 0, notification.data.total_count || 0);
            default:
                return `New activity on task: ${notification.data.task_title || 'a task'}`;
        }
    }, [t]);

    const fetchNotificationsQuery = useCallback(async () => {
        if (!session?.user) return { data: [], error: null };
        return await supabase
            .from('notifications')
            .select('*, profiles!actor_id(id, full_name, avatar_url, role)')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(100);
    }, [session?.user?.id]);

    const { data: notifications, loading } = useCachedSupabaseQuery<Notification[]>({
        cacheKey: `user_notifications_${session?.user?.id}`,
        query: fetchNotificationsQuery,
        dependencies: [session?.user?.id, isOpen], // Re-run fetch when modal opens
        lastDataChange: null, // We'll rely on the manual refresh/unread count for now
    });

    const safeNotifications = notifications || [];

    const handleMarkAllAsRead = async () => {
        const unreadIds = safeNotifications.filter(n => !n.is_read).map(n => n.id);
        if (unreadIds.length === 0) return;

        // No optimistic update here for simplicity with the cache hook, 
        // but we update unread count immediately.
        setUnreadCount(0);
        
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .in('id', unreadIds);

        if (error) {
            console.error("Error marking all as read:", error);
        }
    };

    const handleNotificationClick = async (notification: Notification) => {
        onNotificationClick(notification);

        if (!notification.is_read) {
            setUnreadCount(c => Math.max(0, c - 1));
            // Mark as read in DB
            await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id);
        }
    };

    const actorFilterDef = useMemo(() => {
        const actors = new Map<string, { value: string; label: string; iconSrc?: string }>();
        safeNotifications.forEach((notif) => {
            if (notif.profiles && !actors.has(notif.profiles.id)) {
                actors.set(notif.profiles.id, {
                    value: notif.profiles.id,
                    label: notif.profiles.full_name || 'Unknown',
                    iconSrc: notif.profiles.avatar_url || undefined,
                });
            }
        });
        return buildTodoMultiFilterDef(
            'actor',
            'Actors',
            Array.from(actors.values()).sort((a, b) => a.label.localeCompare(b.label)),
        );
    }, [safeNotifications]);

    const typeFilterDef = useMemo(() => {
        const typeLabels: Record<string, string> = {
            new_task_assigned: t.notif_type_new_task,
            new_comment: t.notif_type_new_comment,
            new_project_created: t.notif_type_new_project,
            new_user_registered: t.notif_type_new_user,
            task_part_completed: t.notif_type_task_part_completed,
        };
        const options = (Array.from(new Set(safeNotifications.map((n) => n.type))) as string[]).map((type) => ({
            value: type,
            label: typeLabels[type] || type,
        }));
        return buildTodoMultiFilterDef('type', 'Types', options);
    }, [safeNotifications, t]);

    const statusFilterDef = useMemo(
        () =>
            buildTodoMultiFilterDef('readStatus', 'Status', [
                { value: 'unread', label: t.notif_status_unread },
                { value: 'read', label: t.notif_status_read },
            ]),
        [t.notif_status_read, t.notif_status_unread],
    );

    const filterActors = filterValues.actor ?? [];
    const filterTypes = filterValues.type ?? [];
    const filterReadStatuses = filterValues.readStatus ?? [];

    const notificationFilters = useMemo(
        () => [actorFilterDef, typeFilterDef, statusFilterDef],
        [actorFilterDef, statusFilterDef, typeFilterDef],
    );

    const filteredNotifications = useMemo(() => {
        return safeNotifications.filter(notification => {
            const actorMatch = filterActors.length === 0 || (notification.actor_id && filterActors.includes(notification.actor_id));
            const typeMatch = filterTypes.length === 0 || filterTypes.includes(notification.type);
            const readStatusMatch = filterReadStatuses.length === 0 || filterReadStatuses.includes(notification.is_read ? 'read' : 'unread');

            let searchMatch = true;
            if (searchTerm.trim()) {
                const lowerCaseSearch = searchTerm.toLowerCase();
                const message = formatNotificationMessage(notification).toLowerCase();
                searchMatch = message.includes(lowerCaseSearch);
            }
            
            return actorMatch && typeMatch && searchMatch && readStatusMatch;
        });
    }, [safeNotifications, searchTerm, filterActors, filterTypes, filterReadStatuses, formatNotificationMessage]);


    const hasUnread = safeNotifications.some(n => !n.is_read);

    const filterContent = (
        <HubModalDirectoryFilterBar
            shortcutScope="todo-notifications"
            placeholder={t.notif_searchPlaceholder}
            filters={notificationFilters}
            query={searchTerm}
            onQueryChange={setSearchTerm}
            values={filterValues}
            onValuesChange={setFilterValues}
            toolbar={
                <HubResultCount
                    icon={Bell}
                    shown={filteredNotifications.length}
                    total={safeNotifications.length}
                    label="notifications"
                />
            }
            row2Actions={
                safeNotifications.length > 0 ? (
                    <button
                        type="button"
                        onClick={() => void handleMarkAllAsRead()}
                        disabled={!hasUnread}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[var(--panel-2)] px-3 py-1.5 text-xs text-[var(--text)] hover:bg-white/5 disabled:opacity-50"
                    >
                        {t.mark_all_as_read}
                    </button>
                ) : null
            }
        />
    );

    const footerContent = loading && safeNotifications.length > 0 ? (
        <div className="flex justify-end px-2">
            <span className="text-[10px] text-[var(--muted)] italic">Refreshing…</span>
        </div>
    ) : null;

    return (
        <GenericListModal
            isOpen={isOpen}
            onClose={onClose}
            title={t.notifications}
            filterContent={filterContent}
            footerContent={footerContent}
        >
            {loading && safeNotifications.length === 0 ? (
                <div className="flex justify-center items-center h-40">
                    <SpinnerIcon size={32} className="animate-spin text-[var(--accent-color)]" />
                </div>
            ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center py-6">
                    {safeNotifications.length === 0 ? (
                        <>
                            <BellIcon size={40} className="mb-4 text-[var(--muted)]" />
                            <p className="text-sm text-[var(--muted)]">{t.notifications_empty}</p>
                        </>
                    ) : (
                        <HubModalDirectoryEmptyFiltered>
                            No notifications match search or filters.
                        </HubModalDirectoryEmptyFiltered>
                    )}
                </div>
            ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredNotifications.map(notification => {
                        const message = formatNotificationMessage(notification);
                        const parts = message.split(/<strong>(.*?)<\/strong>/g);
                        const isStrongFirst = message.startsWith('<strong>');

                        const content = parts.map((part, index) => {
                            const isStrongPart = (isStrongFirst && index % 2 === 1) || (!isStrongFirst && index % 2 === 1);
                            if (isStrongPart) {
                                return <strong key={index} className="font-semibold text-gray-900 dark:text-gray-100">{part}</strong>;
                            }
                            return <span key={index}>{part}</span>;
                        });

                        return (
                        <li 
                            key={notification.id} 
                            className={`p-3 flex items-start gap-3 transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 ${!notification.is_read ? 'bg-sky-50 dark:bg-sky-900/20 shadow-inner' : ''}`}
                            onClick={() => handleNotificationClick(notification)}
                        >
                            <div className="flex-shrink-0 mt-0.5">
                                {notification.profiles && <Avatar user={notification.profiles} title={notification.profiles.full_name || ''} size={32} />}
                            </div>
                            <div className="flex-grow">
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
                                    {content}
                                    {notification.data.task_id && <CopyIdButton id={notification.data.task_id} isInline />}
                                </p>
                                <time className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{formatAbsoluteDateTime(notification.created_at, language, timezone)}</time>
                            </div>
                            {!notification.is_read && (
                                <div className="w-2 h-2 bg-sky-500 rounded-full flex-shrink-0 mt-2 shadow-[0_0_8px_rgba(14,165,233,0.5)]" title="Unread"></div>
                            )}
                        </li>
                        );
                    })}
                </ul>
            )}
        </GenericListModal>
    );
};

export default NotificationsModal;
