import React, { useMemo, type ReactNode } from 'react';
import { HubMultiFilterDropdown } from '@tool-workspace/hub-ui';
import { useSettings } from '../../context/SettingsContext';
import { Task, Profile, Project } from '../../types';
import StatusPrioritySelect, { CustomSelectOption } from '../common/StatusPrioritySelect';
import { PROJECT_COLORS } from '../../constants';
import CustomDatePicker from '../common/CustomDatePicker';
import { TODO_HUB } from '../../styles/todo-hub-classes';
import { buildTodoMultiFilterDef, profileFilterOptions } from '../../todo-hub-filter-helpers';
import { todoProfileAssigneeTooltip } from '../../todo-profile-display';

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
    commentsPanel?: ReactNode;
}

function handleProjectSelection(prev: string[], ids: string[]): string[] {
    if (ids.includes('personal') && !prev.includes('personal')) return ['personal'];
    if (ids.includes('personal') && ids.length > 1) return ids.filter((id) => id !== 'personal');
    return ids;
}

const TaskDetailsForm: React.FC<TaskDetailsFormProps> = ({
    taskData,
    onFieldChange,
    allUsers,
    userProjects,
    validationError,
    commentsPanel,
}) => {
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

    const assigneeFilterDef = useMemo(
        () => buildTodoMultiFilterDef('assignee', t.assignee, profileFilterOptions(allUsers, { compactTrigger: true })),
        [allUsers, t.assignee],
    );

    const assigneeTriggerTitle = useMemo(() => {
        if (taskData.assigneeIds.length !== 1) return undefined;
        const user = allUsers.find((u) => u.id === taskData.assigneeIds[0]);
        return user ? todoProfileAssigneeTooltip(user) : undefined;
    }, [allUsers, taskData.assigneeIds]);

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
            <div className={TODO_HUB.detailsSplit}>
                <div className={TODO_HUB.detailsSplitDescription}>
                    <label htmlFor="description" className={`${TODO_HUB.labelSection} sm:text-sm`}>
                        {t.descriptionLabel}
                    </label>
                    <textarea
                        id="description"
                        placeholder={t.descriptionLabel}
                        rows={6}
                        value={taskData.description}
                        onChange={e => onFieldChange('description', e.target.value)}
                        className={`${TODO_HUB.field} sm:text-sm`}
                    />
                    <div className={TODO_HUB.taskDetailFilterRow}>
                        <HubMultiFilterDropdown
                            className="w-full min-w-0"
                            triggerFormat="value"
                            filter={projectFilterDef}
                            selected={taskData.projectIds}
                            onChange={(ids) => onFieldChange('projectIds', handleProjectSelection(taskData.projectIds, ids))}
                        />
                        <div className={validationError === 'assignee' ? 'min-w-0 w-full ring-2 ring-red-500/50 rounded-md animate-shake' : 'min-w-0 w-full'}>
                            <HubMultiFilterDropdown
                                className="w-full min-w-0"
                                triggerFormat="value"
                                triggerTitle={assigneeTriggerTitle}
                                filter={assigneeFilterDef}
                                selected={taskData.assigneeIds}
                                onChange={(ids) => onFieldChange('assigneeIds', ids)}
                            />
                        </div>
                        <CustomDatePicker
                            value={taskData.dueDate}
                            onChange={(val) => onFieldChange('dueDate', val)}
                            placeholder={t.dueDateLabel}
                            className="w-full min-w-0"
                            compactTrigger
                        />
                        <div className="min-w-0 w-full">
                            <StatusPrioritySelect
                                value={taskData.priority}
                                onChange={(val) => onFieldChange('priority', val)}
                                options={priorityConfig}
                            />
                        </div>
                    </div>
                </div>
                {commentsPanel ? (
                    <div className={TODO_HUB.detailsSplitComments}>{commentsPanel}</div>
                ) : null}
            </div>
        </div>
    );
};

export default TaskDetailsForm;
