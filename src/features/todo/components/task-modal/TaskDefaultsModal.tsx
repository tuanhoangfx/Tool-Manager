import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useSettings } from '../../context/SettingsContext';
import { useToasts } from '../../context/ToastContext';
import { Profile, Project, Task, ProjectMember } from '../../types';
import ActionModal from '../ActionModal';
import { SpinnerIcon, ChevronDownIcon } from '../Icons';
import StatusPrioritySelect, { CustomSelectOption } from '../common/StatusPrioritySelect';
import { PROJECT_COLORS } from '../../constants';

interface TaskDefaultsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    currentUser: Profile | null;
    userProjects: ProjectMember[];
}

const TaskDefaultsModal: React.FC<TaskDefaultsModalProps> = ({ isOpen, onClose, onSave, currentUser, userProjects }) => {
    const { t, defaultDueDateOffset, setDefaultDueDateOffset, defaultPriority, setDefaultPriority } = useSettings();
    const { addToast } = useToasts();

    const [tempDueDateOffset, setTempDueDateOffset] = useState(defaultDueDateOffset);
    const [tempPriority, setTempPriority] = useState<Task['priority']>(defaultPriority);
    const [tempProjectId, setTempProjectId] = useState<string>('personal');
    const [isSaving, setIsSaving] = useState(false);

    const [isProjectOpen, setIsProjectOpen] = useState(false);
    const projectRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTempDueDateOffset(defaultDueDateOffset);
            setTempPriority(defaultPriority);
            const latestProject = userProjects.length > 0 ? userProjects[0] : null;
            setTempProjectId(
                currentUser?.default_project_id?.toString() ||
                latestProject?.project_id.toString() ||
                'personal'
            );
        }
    }, [isOpen, defaultDueDateOffset, defaultPriority, currentUser, userProjects]);

     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (projectRef.current && !projectRef.current.contains(event.target as Node)) {
                setIsProjectOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const projectsForSelect = useMemo(
        () => userProjects.map((p) => p.projects).filter((p): p is NonNullable<typeof p> => p != null),
        [userProjects],
    );

    const projectOptions = useMemo(() => [
        { id: 'personal', name: t.personalProject, color: '#6b7280' },
        ...projectsForSelect.map(p => ({ id: p.id.toString(), name: p.name, color: p.color || PROJECT_COLORS[p.id % PROJECT_COLORS.length] }))
    ], [projectsForSelect, t]);

    const selectedProject = projectOptions.find(p => p.id === tempProjectId) || projectOptions[0];

    const priorityConfig: { [key in Task['priority']]: CustomSelectOption } = {
        low: { label: t.low, icon: '💤', color: 'text-green-600 dark:text-green-400' },
        medium: { label: t.medium, icon: '⚡', color: 'text-yellow-600 dark:text-yellow-400' },
        high: { label: t.high, icon: '🚨', color: 'text-red-600 dark:text-red-400' },
    };

    const handleSave = async () => {
        if (!currentUser) return;
        setIsSaving(true);

        // Save to localStorage via context
        setDefaultDueDateOffset(tempDueDateOffset);
        setDefaultPriority(tempPriority);

        // Save to database
        const projectIdToSave = tempProjectId === 'personal' ? null : parseInt(tempProjectId, 10);
        const { error } = await supabase
            .from('profiles')
            .update({ default_project_id: projectIdToSave })
            .eq('id', currentUser.id);

        setIsSaving(false);

        if (error) {
            addToast(`Error saving defaults: ${error.message}`, 'error');
        } else {
            addToast('Task defaults saved!', 'success');
            onSave();
            onClose();
        }
    };

    return (
        <ActionModal
            isOpen={isOpen}
            onClose={onClose}
            title="Default Task Settings"
            // FIX: Add missing 'message' prop to satisfy the ActionModalProps interface.
            message=""
            maxWidth="max-w-md"
        >
            <div className="p-6 space-y-4">
                <div>
                    <label htmlFor="defaultProject" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.defaultProject}</label>
                     <div className="relative mt-1" ref={projectRef}>
                        <button type="button" onClick={() => setIsProjectOpen(!isProjectOpen)} className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-left">
                            <div className="flex items-center gap-2">
                                {selectedProject && <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedProject.color }}></span>}
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{selectedProject?.name || 'Select Project'}</span>
                            </div>
                            <ChevronDownIcon size={16} className="text-gray-400" />
                        </button>
                        {isProjectOpen && (
                            <div className="absolute z-20 top-full mt-1 w-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-md shadow-lg border dark:border-gray-600 animate-fadeIn max-h-48 overflow-y-auto">
                                {projectOptions.map((option) => (
                                    <button key={option.id} type="button" onClick={() => { setTempProjectId(option.id); setIsProjectOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-[var(--accent-color)]/10 dark:hover:bg-[var(--accent-color)]/20">
                                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: option.color }}></span>
                                        <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{option.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <label htmlFor="defaultPriority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.priority}</label>
                    <div className="mt-1">
                       <StatusPrioritySelect
                            value={tempPriority}
                            options={priorityConfig}
                            onChange={(value) => setTempPriority(value as Task['priority'])}
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="dueDateOffset" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.defaultDueDateIn}</label>
                    <div className="flex items-center gap-2 mt-1">
                        <input type="number" id="dueDateOffset" min="0" value={tempDueDateOffset} onChange={e => setTempDueDateOffset(Number(e.target.value))} className="w-24 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm" />
                        <span>{t.days}</span>
                    </div>
                </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 flex justify-end items-center space-x-3 rounded-b-2xl">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 shadow-sm transition-colors">{t.cancel}</button>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[var(--gradient-from)] to-[var(--gradient-to)] rounded-md shadow-md transform transition-all duration-300 hover:scale-105 hover:shadow-xl focus:outline-none w-24 flex justify-center items-center"
                >
                    {isSaving ? <SpinnerIcon size={20} className="animate-spin" /> : t.save}
                </button>
            </div>
        </ActionModal>
    );
};

export default TaskDefaultsModal;