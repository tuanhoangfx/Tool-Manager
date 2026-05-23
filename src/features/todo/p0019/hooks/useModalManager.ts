// @ts-nocheck

import { useState, useCallback } from 'react';
import type { Task, Profile, Project } from '../types';

export interface ActionModalState {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
    confirmText?: string;
    confirmButtonClass?: string;
}

export const useModalManager = () => {
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isTaskDefaultsModalOpen, setIsTaskDefaultsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | Partial<Task> | null>(null);
    const [openedFrom, setOpenedFrom] = useState<string | null>(null);
    
    const [isEditEmployeeModalOpen, setIsEditEmployeeModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Profile | null>(null);

    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);

    const [actionModal, setActionModal] = useState<ActionModalState>({
        isOpen: false,
        title: '',
        message: '',
    });

    const handleOpenTaskModal = useCallback((task: Task | Partial<Task> | null = null, from: string | null = null) => {
        setEditingTask(task);
        setOpenedFrom(from);
        setIsTaskModalOpen(true);
    }, []);

    const handleCloseTaskModal = useCallback(() => {
        setIsTaskModalOpen(false);
        setEditingTask(null);
        setOpenedFrom(null);
    }, []);

    const handleOpenEditEmployeeModal = useCallback((employee: Profile) => {
        setEditingEmployee(employee);
        setIsEditEmployeeModalOpen(true);
    }, []);

    const handleCloseEditEmployeeModal = useCallback(() => {
        setIsEditEmployeeModalOpen(false);
        setEditingEmployee(null);
    }, []);
    
    const handleOpenProjectModal = useCallback((project: Project | null) => {
        setEditingProject(project);
        setIsProjectModalOpen(true);
    }, []);

    const handleCloseProjectModal = useCallback(() => {
        setIsProjectModalOpen(false);
        setEditingProject(null);
    }, []);


    return {
        modals: {
            auth: { isOpen: isAuthModalOpen, open: () => setIsAuthModalOpen(true), close: () => setIsAuthModalOpen(false) },
            account: { isOpen: isAccountModalOpen, open: () => setIsAccountModalOpen(true), close: () => setIsAccountModalOpen(false) },
            userGuide: { isOpen: isUserGuideOpen, open: () => setIsUserGuideOpen(true), close: () => setIsUserGuideOpen(false) },
            activityLog: { isOpen: isActivityLogOpen, open: () => setIsActivityLogOpen(true), close: () => setIsActivityLogOpen(false) },
            notifications: { isOpen: isNotificationsOpen, open: () => setIsNotificationsOpen(true), close: () => setIsNotificationsOpen(false) },
            taskDefaults: { isOpen: isTaskDefaultsModalOpen, open: () => setIsTaskDefaultsModalOpen(true), close: () => setIsTaskDefaultsModalOpen(false) },
            task: { 
                isOpen: isTaskModalOpen, 
                open: handleOpenTaskModal, 
                close: handleCloseTaskModal, 
                editingTask,
                openedFrom
            },
            editEmployee: {
                isOpen: isEditEmployeeModalOpen,
                open: handleOpenEditEmployeeModal,
                close: handleCloseEditEmployeeModal,
                editingEmployee,
            },
            editProject: {
                isOpen: isProjectModalOpen,
                open: handleOpenProjectModal,
                close: handleCloseProjectModal,
                editingProject,
            },
            action: {
                ...actionModal,
                open: (config: Omit<ActionModalState, 'isOpen'>) => setActionModal({ ...config, isOpen: true }),
                close: () => setActionModal(prev => ({ ...prev, isOpen: false })),
                setState: setActionModal,
            }
        }
    };
};
