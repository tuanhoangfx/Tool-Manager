// @ts-nocheck
import React from 'react';
import TopBar from '@/components/TopBar';
import SettingsController from '@/components/SettingsController';
import { LogoIcon } from '@/components/Icons';
import type { Session } from '@supabase/supabase-js';
import { useSettings } from '@/context/SettingsContext';
import type { Profile, Task } from '@/types';
import { TaskCounts, AdminView } from '@/App';
import UserMenu from '@/components/header/UserMenu';
import AdminNav from '@/components/header/AdminNav';

interface HeaderProps {
  session: Session | null;
  profile: Profile | null;
  handleSignOut: () => void;
  onSignInClick: () => void;
  onAccountClick: () => void;
  adminView: AdminView;
  setAdminView: (view: AdminView) => void;
  onAddNewTask: () => void;
  onEditTask: (task: Task | Partial<Task> | null) => void;
  onDeleteTask: (task: Task) => void;
  onUpdateStatus: (task: Task, status: Task['status']) => void;
  onOpenActivityLog: () => void;
  onOpenNotifications: () => void;
  unreadCount: number;
  taskCounts: TaskCounts;
}

const Header: React.FC<HeaderProps> = ({ session, profile, handleSignOut, onSignInClick, onAccountClick, adminView, setAdminView, onAddNewTask, onEditTask, onDeleteTask, onUpdateStatus, onOpenActivityLog, onOpenNotifications, unreadCount, taskCounts }) => {
  const { t } = useSettings();

  return (
    <header className="sticky top-0 z-40 bg-white/70 dark:bg-gray-900/70 backdrop-blur-lg shadow-sm flex flex-col">
      <TopBar 
        session={session}
        onAddNewTask={onAddNewTask}
        profile={profile}
        adminView={adminView}
        onEditTask={onEditTask}
        onDeleteTask={onDeleteTask}
        onUpdateStatus={onUpdateStatus}
        onOpenActivityLog={onOpenActivityLog}
        onOpenNotifications={onOpenNotifications}
        unreadCount={unreadCount}
        taskCounts={taskCounts}
      />
      <div className="container mx-auto px-4 py-2 md:py-0 md:h-16 flex flex-wrap items-center">
        
        {/* Center Logo (spans full width on mobile, takes middle on desktop) */}
        <div className="w-full md:flex-1 flex justify-center order-1 md:order-2 mb-2 md:mb-0">
            <div 
              className="flex items-center gap-2 cursor-pointer" 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              role="button"
              aria-label={t.backToTopAria}
            >
              <LogoIcon />
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--gradient-from)] to-[var(--gradient-to)] dark:from-[var(--accent-color-dark)] dark:to-[var(--gradient-to)]">
                Infi Project
              </span>
            </div>
        </div>

        {/* Left Side (half width on mobile, auto on desktop) */}
        <div className="w-1/2 md:flex-1 flex justify-start order-2 md:order-1">
            {session && (profile?.role === 'admin' || profile?.role === 'manager') && <AdminNav activeView={adminView} setView={setAdminView} profile={profile} />}
        </div>
        
        {/* Right Side (half width on mobile, auto on desktop) */}
        <div className="w-1/2 md:flex-1 flex justify-end items-center space-x-3 order-3 md:order-3">
          {session ? (
            <UserMenu session={session} profile={profile} onAccountClick={onAccountClick} handleSignOut={handleSignOut} />
          ) : (
             <button 
                onClick={onSignInClick}
                className="px-4 py-1.5 text-sm font-semibold text-white bg-gradient-to-r from-[var(--gradient-from)] to-[var(--gradient-to)] rounded-full shadow-md transform transition-all duration-300 hover:scale-105 hover:shadow-xl focus:outline-none"
            >
                {t.signIn}
            </button>
          )}
          <SettingsController />
        </div>
      </div>
    </header>
  );
};

export default React.memo(Header);