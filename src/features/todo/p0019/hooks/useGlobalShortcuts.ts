// @ts-nocheck
import { useEffect } from 'react';
import type { useModalManager } from '@/hooks/useModalManager';

interface UseGlobalShortcutsProps {
    modals: ReturnType<typeof useModalManager>['modals'];
    canAddTask: boolean;
}

export const useGlobalShortcuts = ({ modals, canAddTask }: UseGlobalShortcutsProps) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

            if (event.ctrlKey || event.metaKey || event.altKey) return;

            if (event.key === 'Escape' || event.key === 'Esc') {
                event.preventDefault();
                if (modals.action.isOpen) {
                    modals.action.close();
                } else if (modals.taskDefaults.isOpen) {
                    modals.taskDefaults.close();
                } else if (modals.task.isOpen) {
                    modals.task.close();
                } else if (modals.editEmployee.isOpen) {
                    modals.editEmployee.close();
                } else if (modals.editProject.isOpen) {
                    modals.editProject.close();
                } else if (modals.account.isOpen) {
                    modals.account.close();
                } else if (modals.activityLog.isOpen) {
                    modals.activityLog.close();
                } else if (modals.notifications.isOpen) {
                    modals.notifications.close();
                } else if (modals.userGuide.isOpen) {
                    modals.userGuide.close();
                } else if (modals.auth.isOpen) {
                    modals.auth.close();
                }
                return;
            }

            if (isTyping) return;

            if (event.key.toLowerCase() === 'n' && canAddTask) {
                event.preventDefault();
                const anyModalOpen = Object.values(modals).some(m => m.isOpen);
                if (!anyModalOpen) {
                    modals.task.open(null);
                }
            }

            if (event.key.toLowerCase() === 'f') {
                event.preventDefault();
                const searchInputs = Array.from(document.querySelectorAll<HTMLInputElement>(
                    'input[name="searchTerm"], #user-management-search, #project-management-search'
                ));
                const visibleSearchInput = searchInputs.find(input => input.offsetParent !== null);
                if (visibleSearchInput) {
                    visibleSearchInput.focus();
                    visibleSearchInput.select();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [canAddTask, modals]);
};
