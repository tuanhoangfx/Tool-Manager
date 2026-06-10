
import { useCallback } from 'react';
import { Profile, Task } from '../types';

export const usePermission = (currentUser: Profile | null) => {
    const can = useCallback((action: 'create' | 'update' | 'delete' | 'view_admin' | 'manage_users', resource: 'task' | 'user' | 'project', resourceData?: any) => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin') return true;

        if (resource === 'task') {
             const task = resourceData as Task;
             if (action === 'create') return true;
             // Managers can manage all tasks (based on previous logic in AdminTaskDashboard)
             if (currentUser.role === 'manager') return true;
             // Employees can update/delete their own tasks
             if (['update', 'delete'].includes(action) && task) {
                 return task.user_id === currentUser.id || task.created_by === currentUser.id;
             }
        }

        if (resource === 'user') {
            const targetUser = resourceData as Profile;
            if (action === 'update' && currentUser.role === 'manager' && targetUser.role === 'employee') return true;
            // Only admins can delete users
            if (action === 'delete') return false;
        }
        
        if (resource === 'project') {
            // Managers can manage members of projects they belong to (logic handled in backend/hooks, this is for UI)
             if (action === 'view_admin' && currentUser.role === 'manager') return true;
        }

        return false;
    }, [currentUser]);

    return { can };
};
