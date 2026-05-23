// @ts-nocheck


import React from 'react';
import SessionInfo from '@/components/SessionInfo';
import ActivityTicker from '@/components/ActivityTicker';
import type { Session } from '@supabase/supabase-js';
import { PlusIcon, HistoryIcon, BellIcon } from '@/components/Icons';
import { useSettings } from '@/context/SettingsContext';
import { Profile, Task } from '@/types';
import { TaskCounts, AdminView } from '@/App';

interface TopBarProps {
    session: Session | null;
    onAddNewTask: () => void;
    profile: Profile | null;
    adminView: AdminView;
    onEditTask: (task: Task | Partial<Task> | null) => void;
    onDeleteTask: (task: Task) => void;
    onUpdateStatus: (task: Task, status: Task['status']) => void;
    onOpenActivityLog: () => void;
    onOpenNotifications: () => void;
    unreadCount: number;
    taskCounts: TaskCounts;
}

const TopBar: React.FC<TopBarProps> = ({ session, onAddNewTask, profile, adminView, onEditTask, onDeleteTask, onUpdateStatus, onOpenActivityLog, onOpenNotifications, unreadCount, taskCounts }) => {
    const { t } = useSettings();
    const canAddTask = !!(session && profile);

    return (
        <div className="relative z-10 bg-slate-100 dark:bg-black/20 text-gray-600 dark:text-gray-400 animate-fadeInDown border-b border-black/5 dark:border-white/5">
            <div className="container mx-auto px-4 h-10 flex items-center justify-between gap-4">
                
                {/* Left Side */}
                <div className="hidden md:flex flex-1 justify-start">
                    <SessionInfo />
                </div>
                
                {/* Center Ticker */}
                <div className="flex-1 flex justify-center">
                     <ActivityTicker 
                        session={session}
                        onEditTask={onEditTask}
                        onDeleteTask={onDeleteTask}
                        onUpdateStatus={onUpdateStatus}
                        taskCounts={taskCounts}
                    />
                </div>

                {/* Right Side */}
                <div className="flex-1 flex justify-end items-center gap-2">
                   {canAddTask && (
                     <button
                        onClick={onAddNewTask}
                        className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-[var(--gradient-from)] to-[var(--gradient-to)] rounded-full shadow-sm transform transition-all duration-300 hover:scale-105 hover:shadow-md focus:outline-none"
                    >
                        <PlusIcon size={14}/>
                        <span className="hidden sm:inline">{t.addNewTask}</span>
                    </button>
                   )}
                   {session && (
                     <button
                        onClick={onOpenActivityLog}
                        className="p-2 rounded-full text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        title={t.activityLog}
                    >
                        <HistoryIcon size={18} />
                    </button>
                   )}
                   {session && (
                     <button
                        onClick={onOpenNotifications}
                        className="relative p-2 rounded-full text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        title={t.notifications}
                    >
                        <BellIcon size={18} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 justify-center items-center text-[9px] text-white">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            </span>
                        )}
                    </button>
                   )}
                </div>

            </div>
        </div>
    );
};

export default React.memo(TopBar);