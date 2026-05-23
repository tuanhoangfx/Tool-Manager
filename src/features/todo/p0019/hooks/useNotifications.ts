// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

export const useNotifications = (session: Session | null) => {
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (session?.user) {
            const fetchUnreadCount = async () => {
                const { count, error } = await supabase
                    .from('notifications')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', session.user.id)
                    .eq('is_read', false);
                if (error) console.error('Error fetching unread count:', error);
                else setUnreadCount(count || 0);
            };
            fetchUnreadCount();

            const channel = supabase.channel(`notifications:${session.user.id}`)
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'notifications',
                    filter: `user_id=eq.${session.user.id}`
                }, 
                () => {
                    setUnreadCount(currentCount => currentCount + 1);
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        } else {
            setUnreadCount(0);
        }
    }, [session]);
    
    return { unreadCount, setUnreadCount };
};
