// @ts-nocheck

import React, { useState, useEffect, useCallback, Suspense, lazy, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { translations } from '@/translations';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Task, ProjectMember, Profile, Project, Notification, MemberDetails } from '@/types';
import { QuestionMarkCircleIcon, ClipboardListIcon, SpinnerIcon, CheckCircleIcon } from '@/components/Icons';
import { SettingsContext, ColorScheme, useSettings } from '@/context/SettingsContext';
import { ToastProvider } from '@/context/ToastContext';
import { useToasts } from '@/context/ToastContext';

// Custom Hooks
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useModalManager } from '@/hooks/useModalManager';
import { useProfileAndUsers } from '@/hooks/useProfileAndUsers';
import { useNotifications } from '@/hooks/useNotifications';
import { useAppActions } from '@/hooks/useAppActions';
import useIdleTimer from '@/hooks/useIdleTimer';
import { useProjects } from '@/hooks/useProjects';
import { useRealtime } from '@/hooks/useRealtime';
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// Direct imports for critical shell components to avoid layout shift/black screen
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { TaskBoardSkeleton } from '@/components/Skeleton';

// Lazy load heavy content components
const ScrollToTopButton = lazy(() => import('@/components/ScrollToTopButton'));
const EmployeeDashboard = lazy(() => import('@/components/dashboard/employee/EmployeeDashboard'));
const AdminTaskDashboard = lazy(() => import('@/components/dashboard/admin/AdminTaskDashboard'));
const ManagementDashboard = lazy(() => import('@/components/dashboard/admin/ManagementDashboard'));
const ToastContainer = lazy(() => import('@/components/ToastContainer'));
const AppModals = lazy(() => import('@/components/AppModals'));


export type DataChange = {
  type: 'add' | 'update' | 'delete' | 'delete_many' | 'batch_update' | 'profile_change';
  payload: any;
  timestamp: number;
};

export interface TaskCounts {
  todo: number;
  inprogress: number;
  done: number;
}

export type AdminView = 'myTasks' | 'taskDashboard' | 'management';

const SupabaseNotConfigured: React.FC = () => (
  <div className="flex flex-col justify-center items-center text-center flex-grow animate-fadeIn bg-amber-100 dark:bg-amber-900/30 p-8 rounded-lg border border-amber-300 dark:border-amber-700">
    <h2 className="text-2xl font-bold text-amber-700 dark:text-amber-300">Supabase Not Configured</h2>
    <p className="mt-4 text-lg text-amber-800 dark:text-amber-400">
      To enable authentication and task management features, you need to configure your Supabase credentials.
    </p>
    <p className="mt-2">Please update the following file with your project's URL and anon key:</p>
    <p className="mt-2 font-mono bg-amber-200 dark:bg-gray-700 p-2 rounded text-sm text-amber-900 dark:text-amber-200">
      lib/supabase.ts
    </p>
     <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
      Note: Remember to run the SQL provided in the response to set up your database tables.
    </p>
  </div>
);

const LoadingSpinner: React.FC = () => (
  <div className="suspense-loader">
    <div className="suspense-spinner"></div>
  </div>
);

const DashboardManager: React.FC<{
    session: ReturnType<typeof useSupabaseAuth>['session'];
    loadingProfile: boolean;
    authLoading: boolean;
    profile: Profile | null;
    t: (typeof translations)['en'];
    adminView: AdminView;
    modals: ReturnType<typeof useModalManager>['modals'];
    taskActions: ReturnType<typeof useAppActions>['taskActions'];
    timerActions: ReturnType<typeof useAppActions>['timerActions'];
    activeTimer: ReturnType<typeof useAppActions>['activeTimer'];
    allUsers: Profile[];
    setTaskCounts: React.Dispatch<React.SetStateAction<TaskCounts>>;
    userProjects: ProjectMember[];
    lastDataChange: DataChange | null;
    getAllUsers: () => Promise<void>;
    onEditUser: (employee: Profile) => void;
    onEditProject: (project: Project | null) => void;
}> = React.memo(({
    session, loadingProfile, authLoading, profile, t, adminView, modals,
    taskActions, timerActions, activeTimer, allUsers, setTaskCounts,
    userProjects, lastDataChange, getAllUsers, onEditUser, onEditProject
}) => {
    // Show skeleton if auth is loading or if we have a session but profile is still loading
    if (authLoading || (session && loadingProfile)) {
        return (
             <div className="w-full h-full">
                <TaskBoardSkeleton />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="flex flex-col justify-center items-center text-center flex-grow animate-fadeIn p-4">
                <div className="w-full max-w-xs mx-auto mb-8">
                    <div className="flex justify-between items-center text-center mb-2">
                        <div className="w-24 text-center">
                            <ClipboardListIcon size={28} className="text-orange-400 mx-auto" />
                            <span className="mt-2 font-semibold text-sm block">{t.todo}</span>
                        </div>
                        <div className="w-24 text-center">
                            <SpinnerIcon size={28} className="text-indigo-400 mx-auto animate-spin" />
                            <span className="mt-2 font-semibold text-sm block">{t.inprogress}</span>
                        </div>
                        <div className="w-24 text-center">
                            <CheckCircleIcon size={28} className="text-green-400 mx-auto" />
                            <span className="mt-2 font-semibold text-sm block">{t.done}</span>
                        </div>
                    </div>
                    <div className="relative w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-4">
                        <div className="h-full bg-gradient-to-r from-[var(--gradient-from)] to-[var(--gradient-to)] rounded-full animate-progress-fill"></div>
                    </div>
                </div>
                <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">{t.signInToManageTasks}</h2>
                <p className="mt-2 text-gray-500 dark:text-gray-400">Track progress, manage deadlines, and collaborate seamlessly.</p>
            </div>
        );
    }

    if (!profile) {
        return <div className="text-center p-8 text-xl text-red-500">Could not load user profile. Please try refreshing.</div>;
    }

    const isMyTasksVisible = (profile.role === 'employee') || ((profile.role === 'admin' || profile.role === 'manager') && adminView === 'myTasks');
    const dummySetTaskCounts = () => {};

    return (
        <>
            <div className={isMyTasksVisible ? 'block' : 'hidden'}>
                <Suspense fallback={<TaskBoardSkeleton />}>
                    <EmployeeDashboard
                        session={session}
                        lastDataChange={lastDataChange}
                        onEditTask={modals.task.open}
                        onDeleteTask={taskActions.handleDeleteTask}
                        onClearCancelledTasks={taskActions.handleClearCancelledTasks}
                        onUpdateStatus={taskActions.handleUpdateStatus}
                        onStartTimer={timerActions.handleStartTimer}
                        onStopTimer={timerActions.handleStopTimer}
                        activeTimer={activeTimer}
                        allUsers={allUsers}
                        setTaskCounts={isMyTasksVisible ? setTaskCounts : dummySetTaskCounts}
                        userProjects={userProjects}
                    />
                </Suspense>
            </div>

            {(profile.role === 'admin' || profile.role === 'manager') && (
                <div className={adminView === 'taskDashboard' ? 'block' : 'hidden'}>
                    <Suspense fallback={<TaskBoardSkeleton />}>
                        <AdminTaskDashboard
                            profile={profile}
                            lastDataChange={lastDataChange}
                            allUsers={allUsers}
                            onEditTask={modals.task.open}
                            onDeleteTask={taskActions.handleDeleteTask}
                            onClearCancelledTasks={taskActions.handleClearCancelledTasks}
                            onUpdateStatus={taskActions.handleUpdateStatus}
                            onStartTimer={timerActions.handleStartTimer}
                            onStopTimer={timerActions.handleStopTimer}
                            activeTimer={activeTimer}
                            setTaskCounts={adminView === 'taskDashboard' ? setTaskCounts : dummySetTaskCounts}
                        />
                    </Suspense>
                </div>
            )}
            
            {(profile.role === 'admin' || profile.role === 'manager') && (
                <div className={adminView === 'management' ? 'block' : 'hidden'}>
                    <Suspense fallback={<div className="flex justify-center p-8"><SpinnerIcon className="animate-spin text-[var(--accent-color)]" size={40} /></div>}>
                        <ManagementDashboard
                            allUsers={allUsers}
                            onUsersChange={getAllUsers}
                            currentUserProfile={profile}
                            onEditUser={onEditUser}
                            onEditProject={onEditProject}
                            lastDataChange={lastDataChange}
                        />
                    </Suspense>
                </div>
            )}
        </>
    );
});

const AppContent: React.FC = () => {
  const { session, loading: authLoading, handleSignOut } = useSupabaseAuth();
  const { modals } = useModalManager();
  const { addToast } = useToasts();
  const { t } = useSettings();
  
  const locallyUpdatedTaskIds = useRef(new Set<number>());
  const [lastDataChange, setLastDataChange] = useState<DataChange | null>(null);
  const notifyDataChange = useCallback((change: Omit<DataChange, 'timestamp'>) => {
    setLastDataChange({ ...change, timestamp: Date.now() });
  }, []);

  const [taskCounts, setTaskCounts] = useState<TaskCounts>({ todo: 0, inprogress: 0, done: 0 });

  const {
      profile, allUsers, loadingProfile, adminView, setAdminView, getProfile, getAllUsers
  } = useProfileAndUsers(session, lastDataChange);

  const { userProjects, handleSaveProject } = useProjects({
      session,
      profile,
      lastDataChange,
      notifyDataChange,
      closeProjectModal: modals.editProject.close,
  });
  
  const { unreadCount, setUnreadCount } = useNotifications(session);

  const {
      activeTimer,
      taskActions,
      timerActions,
  } = useAppActions({
      session,
      setActionModal: modals.action.setState,
      notifyDataChange: notifyDataChange,
      t,
      locallyUpdatedTaskIds,
  });
  
  const canAddTask = !!(session && profile);
  useRealtime({ session, locallyUpdatedTaskIds, notifyDataChange });
  useGlobalShortcuts({ modals, canAddTask });

  const handleIdle = useCallback(() => {
    if (session && navigator.onLine) {
        console.log('User is idle. Refreshing data in the background...');
        notifyDataChange({ type: 'batch_update', payload: { reason: 'idle_refresh' } });
        addToast(t.dataRefreshed, 'info');
    }
  }, [session, notifyDataChange, addToast, t.dataRefreshed]);

  useIdleTimer(handleIdle, 5 * 60 * 1000);

  useEffect(() => {
    if (!session) setTaskCounts({ todo: 0, inprogress: 0, done: 0 });
  }, [session]);

  const handleNotificationClick = useCallback(async (notification: Notification) => {
      if ((notification.type === 'new_task_assigned' || notification.type === 'new_comment') && notification.data.task_id) {
          try {
              const { data, error } = await supabase.from('tasks').select('*, assignee:user_id(*), creator:created_by(*), projects:project_id(*), task_attachments(*), task_time_logs(*), task_comments(*, profiles(*))').eq('id', notification.data.task_id).single();
              if (error) {
                  if (error.code === 'PGRST116') modals.action.setState({ isOpen: true, title: t.taskNotFound, message: t.taskDeleted });
                  else throw error;
              } else if (data) {
                  modals.task.open(data as Task, t.notifications);
              }
          } catch (error: any) {
              console.error("Error fetching task from notification:", error.message);
              modals.action.setState({ isOpen: true, title: 'Error', message: `Could not load task: ${error.message}` });
          }
      } else if (notification.type === 'new_project_created' && notification.data.project_id) {
           if (profile?.role === 'admin') {
                setAdminView('management');
                const { data: project, error } = await supabase.from('projects').select('*').eq('id', notification.data.project_id).single();
                if (error) {
                    addToast(`Error fetching project: ${error.message}`, 'error');
                } else if (project) {
                    modals.editProject.open(project);
                }
           }
      }
  }, [modals, t, profile, setAdminView, addToast]);

  return (
      <div className="bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-0 h-full font-sans flex flex-col transition-colors duration-300">
        <Suspense fallback={null}>
            <ToastContainer />
        </Suspense>
        
        {/* Shell Components (Header) are rendered immediately */}
        <Header 
          session={session}
          profile={profile}
          handleSignOut={handleSignOut}
          onSignInClick={modals.auth.open}
          onAccountClick={modals.account.open}
          adminView={adminView}
          setAdminView={setAdminView}
          onAddNewTask={() => modals.task.open(null)}
          onEditTask={modals.task.open}
          onDeleteTask={taskActions.handleDeleteTask}
          onUpdateStatus={taskActions.handleUpdateStatus}
          onOpenActivityLog={modals.activityLog.open}
          onOpenNotifications={modals.notifications.open}
          unreadCount={unreadCount}
          taskCounts={taskCounts}
        />

        <main className="container mx-auto px-4 py-8 flex-grow flex flex-col relative">
          {isSupabaseConfigured ? (
             <DashboardManager 
                session={session}
                loadingProfile={loadingProfile}
                authLoading={authLoading}
                profile={profile}
                t={t}
                adminView={adminView}
                modals={modals}
                taskActions={taskActions}
                timerActions={timerActions}
                activeTimer={activeTimer}
                allUsers={allUsers}
                setTaskCounts={setTaskCounts}
                userProjects={userProjects}
                lastDataChange={lastDataChange}
                getAllUsers={getAllUsers}
                onEditUser={modals.editEmployee.open}
                onEditProject={modals.editProject.open}
              />
          ) : (
            <SupabaseNotConfigured />
          )}
        </main>
        
        <Footer />

        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            <Suspense fallback={null}>
                <ScrollToTopButton />
            </Suspense>
            <button
              type="button"
              onClick={modals.userGuide.open}
              aria-label={t.openUserGuideAria}
              title={t.howToUseThisApp}
              className="p-2 rounded-full bg-gradient-to-br from-[var(--gradient-from)] to-[var(--gradient-to)] text-white shadow-lg hover:shadow-xl transform-gpu transition-all duration-300 ease-in-out hover:scale-110"
            >
              <QuestionMarkCircleIcon size={20} />
            </button>
        </div>
        
        <Suspense fallback={null}>
            <AppModals
                session={session}
                profile={profile}
                allUsers={allUsers}
                userProjects={userProjects}
                modals={modals}
                taskActions={taskActions}
                getProfile={getProfile}
                getAllUsers={getAllUsers}
                setUnreadCount={setUnreadCount}
                handleNotificationClick={handleNotificationClick}
                handleSaveProject={handleSaveProject}
            />
        </Suspense>
      </div>
  );
}

/** Theme scope: P0020 hub embed uses .todo-p0019-root; standalone P0019 uses documentElement */
function getP0019ThemeRoot(): HTMLElement {
  return document.querySelector(".todo-p0019-root") ?? document.documentElement;
}

const AppContextProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'dark');
    const [rawColorScheme, setRawColorScheme] = useLocalStorage<ColorScheme | 'ocean'>('colorScheme', 'sky');
    const [language, setLanguage] = useLocalStorage<keyof typeof translations>('language', 'en');
    const [defaultDueDateOffset, setDefaultDueDateOffset] = useLocalStorage<number>('taskDefaults_dueDateOffset', 0);
    const [defaultPriority, setDefaultPriority] = useLocalStorage<Task['priority']>('taskDefaults_priority', 'medium');
    const [timezone, setTimezone] = useLocalStorage<string>('timezone', 'Asia/Ho_Chi_Minh');

    // Simple migration for old theme
    const colorScheme = rawColorScheme === 'ocean' ? 'amethyst' : (rawColorScheme as ColorScheme);
    const setColorScheme = (scheme: ColorScheme) => {
      setRawColorScheme(scheme);
    };

    const t = translations[language];

    useEffect(() => {
        const root = getP0019ThemeRoot();
        root.classList.remove('dark', 'light');
        root.classList.add(theme);
    }, [theme]);

    useEffect(() => {
        const root = getP0019ThemeRoot();
        root.classList.remove('theme-sky', 'theme-ocean', 'theme-sunset', 'theme-amethyst', 'theme-emerald', 'theme-crimson');
        root.classList.add(`theme-${colorScheme}`);
    }, [colorScheme]);

    const settingsValue = { theme, setTheme, colorScheme, setColorScheme, language, setLanguage, t, defaultDueDateOffset, setDefaultDueDateOffset, defaultPriority, setDefaultPriority, timezone, setTimezone };

    return (
        <SettingsContext.Provider value={settingsValue}>
            <ToastProvider>
                {children}
            </ToastProvider>
        </SettingsContext.Provider>
    );
};

export default function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AppContextProviders>
        <AppContent />
      </AppContextProviders>
    </Suspense>
  );
}
