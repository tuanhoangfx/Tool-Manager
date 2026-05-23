// @ts-nocheck

import React, { useMemo, useState } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { Profile, Project } from '@/types';
import { UsersIcon, CalendarIcon, ProjectIcon } from '@/components/Icons';
import MultiSelectDropdown, { MultiSelectOption } from '@/components/dashboard/admin/MultiSelectEmployeeDropdown';
import TimeRangeSelect from '@/components/performance-summary/TimeRangeSelect';
import MonthPicker from '@/components/performance-summary/MonthPicker';
import type { TimeRange } from '@/components/PerformanceSummary';
import { PROJECT_COLORS } from '@/constants';
import CustomDatePicker from '@/components/common/CustomDatePicker';

export interface Filters {
  searchTerm: string;
  creatorIds: string[];
  priorities: ('low' | 'medium' | 'high')[];
  dueDates: ('overdue' | 'today' | 'this_week')[];
  projectIds: number[];
}

interface FilterBarProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  allUsers: Profile[];
  projects: Project[];
  children?: React.ReactNode;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  customMonth: string;
  setCustomMonth: (month: string) => void;
  customStartDate: string;
  setCustomStartDate: (date: string) => void;
  customEndDate: string;
  setCustomEndDate: (date: string) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  allUsers,
  projects,
  children,
  timeRange,
  setTimeRange,
  customMonth,
  setCustomMonth,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
}) => {
  const { t, language } = useSettings();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onFilterChange({ ...filters, [name]: value });
  };

  const timeRangeOptions = useMemo(() => [
    { value: 'today' as TimeRange, label: t.today },
    { value: 'thisWeek' as TimeRange, label: t.thisWeek },
    { value: 'last30Days' as TimeRange, label: t.last30Days },
    { value: 'thisMonth' as TimeRange, label: t.thisMonth },
    { value: 'customMonth' as TimeRange, label: t.customMonth },
    { value: 'customRange' as TimeRange, label: t.customRange },
  ], [t]);

  const priorityOptions: MultiSelectOption[] = [
    { id: 'low', label: t.low, icon: <span className="text-base">💤</span> },
    { id: 'medium', label: t.medium, icon: <span className="text-base">⚡</span> },
    { id: 'high', label: t.high, icon: <span className="text-base">🚨</span> },
  ];
  
  const creatorOptions: MultiSelectOption[] = allUsers.map(user => ({ 
      id: user.id, 
      label: user.full_name || '', 
      avatarUrl: user.avatar_url || undefined
  }));
  
  const projectOptions: MultiSelectOption[] = [
      { id: '0', label: t.personalProject, icon: <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#6b7280' }}></span> },
      ...projects.map(p => ({
        id: p.id.toString(),
        label: p.name,
        icon: <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color || PROJECT_COLORS[p.id % PROJECT_COLORS.length] }}></span>
      }))
  ];
  
  const dueDateOptions: MultiSelectOption[] = [
    { id: 'overdue', label: t.overdue, icon: <span className="text-base">⏰</span> },
    { id: 'today', label: t.dueToday, icon: <span className="text-base">🗓️</span> },
    { id: 'this_week', label: t.dueThisWeek, icon: <span className="text-base">📅</span> },
  ];

  const getCreatorLabel = (selectedCount: number, totalCount: number) => {
    if (selectedCount === 0 || selectedCount === totalCount) return t.allCreators;
    if (selectedCount === 1) {
        const user = allUsers.find(u => u.id === filters.creatorIds[0]);
        return user?.full_name || '1 Creator';
    }
    return `${selectedCount} ${language === 'vi' ? 'người tạo' : 'Creators'}`;
  };
  
  const getProjectLabel = (selectedCount: number, totalCount: number) => {
    if (selectedCount === 0 || selectedCount === totalCount) return t.allProjects;
    if (selectedCount === 1) {
        const project = projectOptions.find(p => p.id === filters.projectIds[0].toString());
        return project?.label || '1 Project';
    }
    return `${selectedCount} Projects`;
  };
  
  const getPriorityLabel = (selectedCount: number) => {
    if (selectedCount === 0) return t.allPriorities;
    if (selectedCount === 1) {
      const priority = priorityOptions.find(p => p.id === filters.priorities[0]);
      return priority?.label || '1 Priority';
    }
    return `${selectedCount} ${language === 'vi' ? 'ưu tiên' : 'Priorities'}`;
  };

  const getDueDateLabel = (selectedCount: number) => {
    if (selectedCount === 0) return t.allDates;
    if (selectedCount === 1) {
      const dueDate = dueDateOptions.find(d => d.id === filters.dueDates[0]);
      return dueDate?.label || '1 Date';
    }
    return `${selectedCount} ${language === 'vi' ? 'ngày' : 'Dates'}`;
  };

  return (
    <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800/50 rounded-lg space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex-grow min-w-[200px]">
          <input
            type="text"
            name="searchTerm"
            placeholder={t.searchPlaceholder}
            value={filters.searchTerm}
            onChange={handleInputChange}
            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)]"
          />
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          {children}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MultiSelectDropdown
            buttonIcon={<ProjectIcon size={16}/>}
            selectedIds={filters.projectIds.map(String)}
            onChange={(ids) => onFilterChange({ ...filters, projectIds: ids.map(Number) })}
            options={projectOptions}
            buttonLabel={getProjectLabel}
            allLabel={t.allProjects}
            searchPlaceholder="Search projects..."
            widthClass='w-full'
        />
        <MultiSelectDropdown
            buttonIcon={<CalendarIcon size={16}/>}
            selectedIds={filters.dueDates}
            onChange={(ids) => onFilterChange({ ...filters, dueDates: ids as Filters['dueDates'] })}
            options={dueDateOptions}
            buttonLabel={getDueDateLabel}
            allLabel={t.allDates}
            searchPlaceholder="Search dates..."
            widthClass='w-full'
        />
        <MultiSelectDropdown
            buttonIcon={<UsersIcon size={16}/>}
            selectedIds={filters.creatorIds}
            onChange={(ids) => onFilterChange({ ...filters, creatorIds: ids })}
            options={creatorOptions}
            buttonLabel={getCreatorLabel}
            allLabel={t.allCreators}
            searchPlaceholder={t.searchUsers}
            widthClass='w-full'
        />
        <MultiSelectDropdown
            buttonIcon={<span className="text-gray-500">★</span>}
            selectedIds={filters.priorities}
            onChange={(ids) => onFilterChange({ ...filters, priorities: ids as Filters['priorities'] })}
            options={priorityOptions}
            buttonLabel={getPriorityLabel}
            allLabel={t.allPriorities}
            searchPlaceholder="Search priorities..."
            widthClass='w-full'
        />
        <TimeRangeSelect
          value={timeRange}
          onChange={setTimeRange}
          options={timeRangeOptions}
        />
      </div>

      {timeRange === 'customMonth' && (
          <div className="animate-fadeIn mt-4">
              <MonthPicker value={customMonth} onChange={setCustomMonth} />
          </div>
      )}

      {timeRange === 'customRange' && (
          <div className="flex items-center gap-2 animate-fadeIn mt-4">
              <div className="w-36">
                  <CustomDatePicker
                      value={customStartDate}
                      onChange={setCustomStartDate}
                      placeholder="Start Date"
                  />
              </div>
              <span className="text-gray-500 dark:text-gray-400 text-sm">to</span>
              <div className="w-36">
                  <CustomDatePicker
                      value={customEndDate}
                      onChange={setCustomEndDate}
                      placeholder="End Date"
                  />
              </div>
          </div>
      )}
    </div>
  );
};

export default React.memo(FilterBar);
