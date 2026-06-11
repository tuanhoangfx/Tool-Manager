
import React, { useMemo } from 'react';
import { HubMultiFilterDropdown } from '@tool-workspace/hub-ui';
import { useSettings } from '../../context/SettingsContext';
import { Task, Profile, Project } from '../../types';
import { resolveTodoProfile } from "../../todo-resolve-profile";
import StatusPrioritySelect, { CustomSelectOption } from '../common/StatusPrioritySelect';
import { PROJECT_COLORS } from '../../constants';
import CustomDatePicker from '../common/CustomDatePicker';
import { TODO_HUB } from '../../styles/todo-hub-classes';
import { buildTodoMultiFilterDef, profileFilterOptions } from '../../todo-hub-filter-helpers';

interface TaskDetailsFormProps {
    taskData: {
        title: string;
        description: string;
        priority: Task['priority'];
        dueDate: string;
        assigneeIds: string[];
        projectIds: string[];
    };
    onFieldChange: (field: keyof TaskDetailsFormProps['taskData'], value: any) => void;
    allUsers: Profile[];
    userProjects: Project[];
    validationError: 'title' | 'assignee' | null;
}

function handleProjectSelection(prev: string[], ids: string[]): string[] {
    if (ids.includes('personal') && !prev.includes('personal')) return ['personal'];
    if (ids.includes('personal') && ids.length > 1) return ids.filter((id) => id !== 'personal');
    return ids;
}

const TaskDetailsForm: React.FC<TaskDetailsFormProps> = ({ taskData, onFieldChange, allUsers, userProjects, validationError }) => {
    const { t } = useSettings();

    const projectFilterDef = useMemo(
        () =>
            buildTodoMultiFilterDef('project', t.project, [
                { value: 'personal', label: t.personalProject, color: '#6b7280' },
                ...userProjects.map((p) => ({
                    value: p.id.toString(),
                    label: p.name,
                    color: p.color || PROJECT_COLORS[p.id % PROJECT_COLORS.length],
                })),
            ]),
        [userProjects, t.personalProject, t.project],
    );

    const assigneeFilterDef = useMemo(() => {
        const users = allUsers.map((user) => {
            const profile = resolveTodoProfile(user.id, user, allUsers);
            return { ...profile, full_name: profile.full_name || profile.email || 'Unknown' };
        });
        return buildTodoMultiFilterDef('assignee', t.assignee, profileFilterOptions(users));
    }, [allUsers, t.assignee]);

    const priorityConfig: { [key in Task['priority']]: CustomSelectOption } = {
        low: { label: t.low, icon: '💤', color: 'text-green-400' },
        medium: { label: t.medium, icon: '⚡', color: 'text-yellow-400' },
        high: { label: t.high, icon: '🚨', color: 'text-red-400' },
    };

    return (
        <div className="space-y-3">
            <div>
                <input
                    type="text"
                    id="title"
                    placeholder={t.taskTitleLabel}
                    value={taskData.title}
                    onChange={e => onFieldChange('title', e.target.value)}
                    required
                    className={`${TODO_HUB.fieldTitle} ${validationError === 'title' ? 'border-red-500 ring-2 ring-red-500/50 animate-shake' : ''}`}
                />
            </div>
            <div>
                <textarea
                    id="description"
                    placeholder={t.descriptionLabel}
                    rows={4}
                    value={taskData.description}
                    onChange={e => onFieldChange('description', e.target.value)}
                    className={`${TODO_HUB.field} sm:text-sm`}
                />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
                 <div className="flex flex-col">
                    <label className={TODO_HUB.labelHiddenMd}>{t.project}</label>
                    <HubMultiFilterDropdown
                        filter={projectFilterDef}
                        selected={taskData.projectIds}
                        onChange={(ids) => onFieldChange('projectIds', handleProjectSelection(taskData.projectIds, ids))}
                    />
                </div>
                <div className={`flex flex-col ${validationError === 'assignee' ? 'ring-2 ring-red-500/50 rounded-md animate-shake' : ''}`}>
                    <label className={TODO_HUB.labelHiddenMd}>{t.assignee}</label>
                    <HubMultiFilterDropdown
                        filter={assigneeFilterDef}
                        selected={taskData.assigneeIds}
                        onChange={(ids) => onFieldChange('assigneeIds', ids)}
                    />
                </div>
                <div>
                    <label htmlFor="dueDate" className={TODO_HUB.labelHiddenMd}>{t.dueDateLabel}</label>
                    <div className="w-full">
                        <CustomDatePicker
                            value={taskData.dueDate}
                            onChange={(val) => onFieldChange('dueDate', val)}
                            placeholder={t.dueDateLabel}
                            className="w-full"
                        />
                    </div>
                </div>
                <div>
                    <label className={TODO_HUB.labelHiddenMd}>{t.priority}</label>
                    <StatusPrioritySelect
                        value={taskData.priority}
                        onChange={(val) => onFieldChange('priority', val)}
                        options={priorityConfig}
                    />
                </div>
            </div>
        </div>
    );
};

export default TaskDetailsForm;
