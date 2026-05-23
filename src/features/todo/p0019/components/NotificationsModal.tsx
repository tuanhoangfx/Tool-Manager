// @ts-nocheck

import React, { useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { SpinnerIcon, BellIcon, SearchIcon } from '@/components/Icons';
import type { Notification } from '@/types';
import { formatAbsoluteDateTime } from '@/lib/taskUtils';
import Avatar from '@/components/common/Avatar';
import MultiSelectDropdown, { MultiSelectOption } from '@/components/dashboard/admin/MultiSelectEmployeeDropdown';
import CopyIdButton from '@/components/common/CopyIdButton';
import GenericListModal from '@/components/GenericListModal';
import { useCachedSupabaseQuery } from '@/hooks/useCachedSupabaseQuery';
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
    const [filterActors, setFilterActors] = useState<string[]>([]);
    const [filterTypes, setFilterTypes] = useState<string[]>([]);
    const [filterReadStatuses, setFilterReadStatuses] = useState<string[]>([]);

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

    const actorOptions: MultiSelectOption[] = useMemo(() => {
        const actors = new Map<string, { id: string; label: string, avatarUrl?: string }>();
        safeNotifications.forEach(notif => {
            if (notif.profiles && !actors.has(notif.profiles.id)) {
                actors.set(notif.profiles.id, { id: notif.profiles.id, label: notif.profiles.full_name || 'Unknown', avatarUrl: notif.profiles.avatar_url || undefined });
            }
        });
        return Array.from(actors.values()).sort((a, b) => a.label.localeCompare(b.label));
    }, [safeNotifications]);

    const typeOptions: MultiSelectOption[] = useMemo(() => {
        const typeLabels: { [key: string]: string } = {
            new_task_assigned: t.notif_type_new_task,
            new_comment: t.notif_type_new_comment,
            new_project_created: t.notif_type_new_project,
            new_user_registered: t.notif_type_new_user,
            task_part_completed: t.notif_type_task_part_completed,
        };
        return (Array.from(new Set(safeNotifications.map(n => n.type))) as string[])
            .map(type => ({ id: type, label: typeLabels[type] || type }));
    }, [safeNotifications, t]);
    
    const statusOptions: MultiSelectOption[] = [
        { id: 'unread', label: t.notif_status_unread },
        { id: 'read', label: t.notif_status_read },
    ];

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
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div className="relative sm:col-span-1">
                <input
                    type="text"
                    placeholder={t.notif_searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)] text-sm"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon size={16} className="text-gray-400" />
                </div>
            </div>
            <MultiSelectDropdown 
                options={actorOptions} 
                selectedIds={filterActors} 
                onChange={setFilterActors} 
                buttonLabel={(s, t) => s === 0 || s === t ? 'All Actors' : `${s} Actors`}
                buttonIcon={<></>}
                allLabel={t.notif_allActors}
                searchPlaceholder={t.searchUsers}
                widthClass="w-full"
                />
                <MultiSelectDropdown 
                options={typeOptions} 
                selectedIds={filterTypes} 
                onChange={setFilterTypes} 
                buttonLabel={(s) => s === 0 ? 'All Types' : `${s} Types`}
                buttonIcon={<></>}
                allLabel={t.notif_allTypes}
                searchPlaceholder="Search types..."
                widthClass="w-full"
                />
                <MultiSelectDropdown 
                options={statusOptions} 
                selectedIds={filterReadStatuses} 
                onChange={setFilterReadStatuses} 
                buttonLabel={(s) => s === 0 ? 'All Statuses' : `${s} Statuses`}
                buttonIcon={<></>}
                allLabel={t.notif_allStatuses}
                searchPlaceholder="Search status..."
                widthClass="w-full"
                />
        </div>
    );

    const footerContent = safeNotifications.length > 0 ? (
        <div className="flex justify-between items-center px-2">
            {loading && <span className="text-[10px] text-gray-400 italic">Refreshing...</span>}
            <button 
                onClick={handleMarkAllAsRead} 
                disabled={!hasUnread}
                className="text-xs font-semibold text-[var(--accent-color)] hover:underline disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
            >
                {t.mark_all_as_read}
            </button>
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
                <div className="text-center text-gray-500 dark:text-gray-400 py-10 flex flex-col items-center h-full justify-center">
                    <BellIcon size={40} className="mb-4 text-gray-400 dark:text-gray-500" />
                    <p>{safeNotifications.length === 0 ? t.notifications_empty : "No notifications match your filters."}</p>
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
