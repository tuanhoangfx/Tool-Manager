
import { useEffect, MutableRefObject } from 'react';
import type { RealtimeChannel, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { Profile } from "../types";
import type { DataChange } from "../app-types";

interface UseRealtimeProps {
    session: Session | null;
    // FIX: Use MutableRefObject directly instead of React.MutableRefObject
    locallyUpdatedTaskIds: MutableRefObject<Set<number>>;
    notifyDataChange: (change: Omit<DataChange, 'timestamp'>) => void;
}

export const useRealtime = ({ session, locallyUpdatedTaskIds, notifyDataChange }: UseRealtimeProps) => {
    useEffect(() => {
        if (!session || !isSupabaseConfigured) return;

        const channels: RealtimeChannel[] = [];

        const tasksChannel = supabase.channel('public:tasks')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' },
                async (payload) => {
                    if (payload.eventType === 'UPDATE') {
                        const updatedTaskId = payload.new.id as number;
                        if (locallyUpdatedTaskIds.current.has(updatedTaskId)) {
                            locallyUpdatedTaskIds.current.delete(updatedTaskId);
                            return;
                        }
                    }
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        // FIX: Explicitly use 'projects:project_id(*)' here as well
                        const { data: task, error } = await supabase.from('tasks').select('*, assignee:user_id(*), creator:created_by(*), projects:project_id(*), task_attachments(*), task_time_logs(*), task_comments(*, profiles(*))').eq('id', payload.new.id).single();
                        if (error) { console.error('Error fetching task from realtime update:', error); return; }
                        if (task) notifyDataChange({ type: payload.eventType === 'INSERT' ? 'add' : 'update', payload: task });
                    } else if (payload.eventType === 'DELETE') {
                        notifyDataChange({ type: 'delete', payload: { id: (payload.old as any).id } });
                    }
                }
            ).subscribe();
        channels.push(tasksChannel);

        const tablesToWatch = ['task_attachments', 'task_comments', 'projects', 'project_members', 'profiles'];
        tablesToWatch.forEach(table => {
            const channel = supabase.channel(`public:${table}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: table },
                    (payload) => {
                        if (table === 'profiles' && payload.eventType !== 'DELETE' && (payload.new as Profile).id === session?.user.id) {
                            notifyDataChange({ type: 'profile_change', payload: payload.new });
                        } else {
                            notifyDataChange({ type: 'batch_update', payload: { table } });
                        }
                    }
                ).subscribe();
            channels.push(channel);
        });

        return () => {
            channels.forEach(channel => supabase.removeChannel(channel));
        };
    }, [session, notifyDataChange, locallyUpdatedTaskIds]);
};
