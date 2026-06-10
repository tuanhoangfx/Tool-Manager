
import React from 'react';
import { Task } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { TodoHubBadge } from './TodoHubBadge';

const PRIORITY_ICON: Record<Task['priority'], string> = {
  low: '💤',
  medium: '⚡',
  high: '🚨',
};

const PriorityIndicator: React.FC<{ priority: Task['priority'] }> = ({ priority }) => {
    const { t } = useSettings();
    const labels: Record<Task['priority'], string> = {
      low: t.low,
      medium: t.medium,
      high: t.high,
    };

    return (
        <TodoHubBadge
          kind="priority"
          priority={priority}
          label={labels[priority]}
          icon={PRIORITY_ICON[priority]}
        />
    );
}

export default React.memo(PriorityIndicator);
