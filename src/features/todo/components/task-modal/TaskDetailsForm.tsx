
import React, { useMemo } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { Task, Profile, Project } from '../../types';
import StatusPrioritySelect, { CustomSelectOption } from '../common/StatusPrioritySelect';
import { PROJECT_COLORS } from '../../constants';
import CustomDatePicker from '../common/CustomDatePicker';
import MultiSelectDropdown from '../dashboard/admin/MultiSelectEmployeeDropdown';
import { ProjectIcon, UsersIcon } from '../../components/Icons';
import { TODO_HUB } from '../../styles/todo-hub-classes';
interface TaskDetailsFormProps {
    taskData: {
        title: string;
        description: string;
        priority: Task['priority'];
        dueDate: string;
        assigneeIds: string[]; // Changed to array
        projectIds: string[]; // Changed to array
    };
    onFieldChange: (field: keyof TaskDetailsFormProps['taskData'], value: any) => void;
    allUsers: Profile[];
    userProjects: Project[];
    validationError: 'title' | 'assignee' | null;
}

const TaskDetailsForm: React.FC<TaskDetailsFormProps> = ({ taskData, onFieldChange, allUsers, userProjects, validationError }) => {
    const { t, language } = useSettings();

    const projectOptions = useMemo(() => [
        { id: 'personal', label: t.personalProject, icon: <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#6b7280' }}></span> },
        ...userProjects.map(p => ({ 
            id: p.id.toString(), 
            label: p.name, 
            icon: <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color || PROJECT_COLORS[p.id % PROJECT_COLORS.length] }}></span> 
        }))
    ], [userProjects, t]);

    const assigneeOptions = useMemo(() => allUsers.map(user => ({
        id: user.id,
        label: user.full_name || user.email || 'Unknown',
        avatarUrl: user.avatar_url || undefined
    })), [allUsers]);

    const priorityConfig: { [key in Task['priority']]: CustomSelectOption } = {
        low: { label: t.low, icon: '💤', color: 'text-green-400' },
        medium: { label: t.medium, icon: '⚡', color: 'text-yellow-400' },
        high: { label: t.high, icon: '🚨', color: 'text-red-400' },
    };

    const getProjectLabel = (selectedCount: number, totalCount: number) => {
        if (selectedCount === 0) return 'Select Project';
        if (selectedCount === 1) {
            const project = projectOptions.find(p => p.id === taskData.projectIds[0]);
            return project?.label || '1 Project';
        }
        return `${selectedCount} Projects`;
    };

    const getAssigneeLabel = (selectedCount: number, totalCount: number) => {
        if (selectedCount === 0) return t.selectEmployee;
        if (selectedCount === 1) {
            const user = assigneeOptions.find(u => u.id === taskData.assigneeIds[0]);
            return user?.label || '1 User';
        }
        const plural = language === 'vi' ? 'người' : 'Users';
        return `${selectedCount} ${plural}`;
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
                    <MultiSelectDropdown
                        options={projectOptions}
                        selectedIds={taskData.projectIds}
                        onChange={(ids) => {
                            // If personal selected, clear others. If others selected, clear personal.
                            if (ids.includes('personal') && !taskData.projectIds.includes('personal')) {
                                onFieldChange('projectIds', ['personal']);
                            } else if (ids.includes('personal') && ids.length > 1) {
                                onFieldChange('projectIds', ids.filter(id => id !== 'personal'));
                            } else {
                                onFieldChange('projectIds', ids);
                            }
                        }}
                        buttonLabel={getProjectLabel}
                        buttonIcon={<ProjectIcon size={16} />}
                        searchPlaceholder="Search projects..."
                        allLabel="All Projects"
                        widthClass="w-full"
                    />
                </div>
                <div className={`flex flex-col ${validationError === 'assignee' ? 'ring-2 ring-red-500/50 rounded-md animate-shake' : ''}`}>
                    <label className={TODO_HUB.labelHiddenMd}>{t.assignee}</label>
                    <MultiSelectDropdown
                        options={assigneeOptions}
                        selectedIds={taskData.assigneeIds}
                        onChange={(ids) => onFieldChange('assigneeIds', ids)}
                        buttonLabel={getAssigneeLabel}
                        buttonIcon={<UsersIcon size={16} />}
                        searchPlaceholder={t.searchUsers}
                        allLabel={t.allEmployees}
                        widthClass="w-full"
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
                        options={priorityConfig}
                        onChange={(value) => onFieldChange('priority', value)}
                    />
                </div>
            </div>
        </div>
    );
};

export default TaskDetailsForm;
