
import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Profile } from '../types';
import { AdminView, DataChange } from '../app-types';
import { subscribeHubIdentity } from '../../../lib/hub-identity-session';
import { ensureWorkspaceAuthReady } from '../../../lib/workspace-profile';
import { fetchWorkspaceUserDirectory } from '../../../lib/workspace-user-directory';
import { warmWorkspaceRoleFromDirectory } from '../../../lib/workspace-role-ssot';
import { useWorkspaceProfile } from '../../workspace/useWorkspaceProfile';
import { supabase } from '../lib/supabase';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const useProfileAndUsers = (
    session: Session | null,
    lastDataChange: DataChange | null,
    enabled = true,
    hubIdentity?: { hubUserId?: string | null; hubEmail?: string | null },
) => {
    const { profile, loadingProfile, profileError, refreshProfile } = useWorkspaceProfile(session);
    const [allUsers, setAllUsers] = useState<Profile[]>([]);
    const [usersWarning, setUsersWarning] = useState<string | null>(null);
    const [adminView, setAdminView] = useState<AdminView>('myTasks');

    const getAllUsers = useCallback(async () => {
        if (!session?.user) {
            setAllUsers([]);
            setUsersWarning(null);
            return;
        }

        let attempts = 0;
        const maxAttempts = 3;
        let success = false;

        while (attempts < maxAttempts && !success) {
            try {
                const { users, warning } = await fetchWorkspaceUserDirectory(session);
                setAllUsers(users);
                setUsersWarning(warning);
                warmWorkspaceRoleFromDirectory(users, {
                    dataBoxUserId: session.user.id,
                    hubUserId: hubIdentity?.hubUserId,
                    hubEmail: hubIdentity?.hubEmail ?? session.user.email,
                });
                success = true;
            } catch (error: unknown) {
                attempts++;
                const message = error instanceof Error ? error.message : String(error);
                const isNetworkError = message === 'Failed to fetch' || message.includes('NetworkError');

                if (attempts >= maxAttempts || !isNetworkError) {
                    console.error('Error fetching workspace user directory:', message);
                    setUsersWarning(message);
                } else {
                    await wait(500 * Math.pow(2, attempts - 1));
                }
            }
        }
    }, [session, hubIdentity?.hubEmail, hubIdentity?.hubUserId]);

    const getProfile = useCallback(async (user: Session['user']) => {
        await refreshProfile(user);
    }, [refreshProfile]);

    useEffect(() => {
        if (!enabled) return;

        let heartbeatInterval: number | undefined;

        const updateLastActive = async () => {
            if (!navigator.onLine || !session?.user) return;
            const ready = await ensureWorkspaceAuthReady();
            if (!ready) return;

            const { error } = await supabase.from('profiles').update({
                last_sign_in_at: new Date().toISOString()
            }).eq('id', session.user.id);

            if (error) {
                console.error("Failed to update last active timestamp:", error.message);
            }
        };

        if (session?.user) {
            getAllUsers();
            updateLastActive();
            heartbeatInterval = window.setInterval(updateLastActive, 5 * 60 * 1000);

        } else {
            setAllUsers([]);
            setUsersWarning(null);
            setAdminView('myTasks');
        }

        const handleFocus = () => {
            if (session?.user && document.visibilityState === 'visible') {
                getAllUsers();
                updateLastActive();
            }
        };

        window.addEventListener('focus', handleFocus);
        window.addEventListener('visibilitychange', handleFocus);
        const unsubHubIdentity = subscribeHubIdentity(handleFocus);

        return () => {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('visibilitychange', handleFocus);
            unsubHubIdentity();
        };
    }, [enabled, session, getAllUsers]);

     useEffect(() => {
        if(!lastDataChange) return;

        if(lastDataChange.type === 'batch_update' && (lastDataChange.payload as { table?: string })?.table === 'profiles') {
            getAllUsers();
        }
        if(lastDataChange.type === 'profile_change') {
            if (session?.user) void refreshProfile(session.user);
            getAllUsers();
        }
    }, [lastDataChange, getAllUsers, session, refreshProfile]);

    return { profile, allUsers, usersWarning, loadingProfile, profileError, adminView, setAdminView, getProfile, getAllUsers };
};
