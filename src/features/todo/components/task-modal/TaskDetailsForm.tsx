import React, { useMemo, type ReactNode } from 'react';
import { HubFormFieldLabel, HubMultiFilterDropdown, HubSingleFilterDropdown } from '@tool-workspace/hub-ui';
import { useSettings } from '../../context/SettingsContext';
import { Task, Profile, Project } from '../../types';
import CustomDatePicker from '../common/CustomDatePicker';
import { TODO_HUB } from '../../styles/todo-hub-classes';
import {
    buildTodoPriorityFilterOptions,
    buildTodoTaskDetailAssigneeFilterDef,
    buildTodoTaskDetailProjectFilterDef,
    TODO_FILTER_FIELD_EMOJI,
    TODO_TASK_DETAIL_DUE_DATE_EMOJI,
} from '../../todo-hub-filter-helpers';
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
        () => buildTodoTaskDetailProjectFilterDef(t, userProjects),
        [userProjects, t.personalProject, t.project],
    );

    const assigneeFilterDef = useMemo(
        () => buildTodoTaskDetailAssigneeFilterDef(t, allUsers),
        [allUsers, t.assignee],
    );

    const assigneeTriggerTitle = useMemo(() => {
        if (taskData.assigneeIds.length !== 1) return undefined;
        const user = allUsers.find((u) => u.id === taskData.assigneeIds[0]);
        return user ? todoProfileAssigneeTooltip(user) : undefined;
    }, [allUsers, taskData.assigneeIds]);

    const priorityOptions = useMemo(() => buildTodoPriorityFilterOptions(t), [t]);

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
                    <label htmlFor="description" className="hub-form-field-label block">
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
                        <div className={TODO_HUB.taskDetailFilterCell}>
                            <HubFormFieldLabel emoji={TODO_FILTER_FIELD_EMOJI.project}>{t.project}</HubFormFieldLabel>
                            <HubMultiFilterDropdown
                                className="w-full min-w-0"
                                triggerClassName={TODO_HUB.taskDetailFilterTrigger}
                                triggerFormat="value"
                                filter={projectFilterDef}
                                selected={taskData.projectIds}
                                onChange={(ids) => onFieldChange('projectIds', handleProjectSelection(taskData.projectIds, ids))}
                            />
                        </div>
                        <div className={TODO_HUB.taskDetailFilterCell}>
                            <HubFormFieldLabel emoji={TODO_FILTER_FIELD_EMOJI.assignee}>{t.assignee}</HubFormFieldLabel>
                            <HubMultiFilterDropdown
                                className={`w-full min-w-0${validationError === 'assignee' ? ' ring-2 ring-red-500/50 rounded-lg animate-shake' : ''}`}
                                triggerClassName={TODO_HUB.taskDetailFilterTrigger}
                                triggerFormat="value"
                                triggerTitle={assigneeTriggerTitle}
                                filter={assigneeFilterDef}
                                selected={taskData.assigneeIds}
                                onChange={(ids) => onFieldChange('assigneeIds', ids)}
                            />
                        </div>
                        <div className={TODO_HUB.taskDetailFilterCell}>
                            <HubFormFieldLabel emoji={TODO_FILTER_FIELD_EMOJI.dueDate}>{t.dueDateLabel}</HubFormFieldLabel>
                            <CustomDatePicker
                                value={taskData.dueDate}
                                onChange={(val) => onFieldChange('dueDate', val)}
                                placeholder={t.dueDateLabel}
                                className="w-full min-w-0"
                                triggerClassName={TODO_HUB.taskDetailFilterTrigger}
                                triggerEmoji={TODO_TASK_DETAIL_DUE_DATE_EMOJI}
                                compactTrigger
                            />
                        </div>
                        <div className={TODO_HUB.taskDetailFilterCell}>
                            <HubFormFieldLabel emoji={TODO_FILTER_FIELD_EMOJI.priority}>{t.priority}</HubFormFieldLabel>
                            <HubSingleFilterDropdown
                                filterKey="priority"
                                label={t.priority}
                                options={priorityOptions}
                                value={taskData.priority}
                                onChange={(val) => onFieldChange('priority', val as Task['priority'])}
                                triggerFormat="value"
                                triggerClassName={TODO_HUB.taskDetailFilterTrigger}
                                className="w-full min-w-0"
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
