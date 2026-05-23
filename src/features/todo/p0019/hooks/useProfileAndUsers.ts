// @ts-nocheck

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type { Profile } from '../types';
import { AdminView, DataChange } from '../App';
import { useLocalStorage } from './useLocalStorage';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const useProfileAndUsers = (session: Session | null, lastDataChange: DataChange | null) => {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [allUsers, setAllUsers] = useLocalStorage<Profile[]>('all_users', []);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [adminView, setAdminView] = useState<AdminView>('myTasks');

    const getAllUsers = useCallback(async () => {
        let attempts = 0;
        const maxAttempts = 3;
        let success = false;

        while (attempts < maxAttempts && !success) {
            try {
                // Fetch fresh data in the background
                const { data, error } = await supabase.from('profiles').select('*').order('full_name');
                if (error) throw error;
                // Update state and localStorage with fresh data
                if (data) {
                    setAllUsers(data);
                }
                success = true;
            } catch (error: any) {
                attempts++;
                const isNetworkError = error.message === 'Failed to fetch' || error.message.includes('NetworkError');
                
                if (attempts >= maxAttempts || !isNetworkError) {
                    console.error('Error fetching users:', error.message);
                } else {
                    await wait(500 * Math.pow(2, attempts - 1));
                }
            }
        }
    }, [setAllUsers]);

    const getProfile = useCallback(async (user: Session['user']) => {
        if (!user) return;
        setLoadingProfile(true);
        
        let attempts = 0;
        const maxAttempts = 3;
        let success = false;

        while(attempts < maxAttempts && !success) {
            try {
                const { data, error } = await supabase.from('profiles').select(`*`).eq('id', user.id).single();

                if (error && error.code !== 'PGRST116') {
                    throw error;
                }

                if (data) {
                    setProfile(data);
                } else {
                    // Insert new profile with email
                    const { data: newProfile, error: insertError } = await supabase
                        .from('profiles')
                        .insert({ 
                            id: user.id, 
                            full_name: user.user_metadata?.full_name || user.email,
                            email: user.email
                        })
                        .select().single();

                    if (insertError) throw insertError;
                    if (newProfile) setProfile(newProfile);
                }
                success = true;
            } catch (error: any) {
                attempts++;
                const isNetworkError = error.message === 'Failed to fetch' || error.message.includes('NetworkError');
                
                if (attempts >= maxAttempts || !isNetworkError) {
                    console.error('Error fetching or creating profile:', error.message);
                    setProfile(null);
                } else {
                    await wait(500 * Math.pow(2, attempts - 1));
                }
            }
        }
        setLoadingProfile(false);
    }, []);

    useEffect(() => {
        let heartbeatInterval: number | undefined;

        // Function to update the last active timestamp
        const updateLastActive = async () => {
            // Check network status to avoid errors if user is offline
            if (!navigator.onLine || !session?.user) return;

            const { error } = await supabase.from('profiles').update({
                last_sign_in_at: new Date().toISOString()
            }).eq('id', session.user.id);
            
            if (error) {
                console.error("Failed to update last active timestamp:", error.message);
            }
        };

        if (session?.user) {
            if (!profile || profile.id !== session.user.id) {
                getProfile(session.user);
            } else {
                setLoadingProfile(false);
            }
            getAllUsers();

            // 1. Update immediately on mount/session start
            updateLastActive();

            // 2. Set up a heartbeat to update every 5 minutes (300,000 ms)
            heartbeatInterval = window.setInterval(updateLastActive, 5 * 60 * 1000);

        } else {
            setProfile(null);
            setAllUsers([]); // Clear users on sign out
            setLoadingProfile(false);
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

        // Cleanup interval on unmount or session change
        return () => {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('visibilitychange', handleFocus);
        };
    }, [session, getProfile, getAllUsers, setAllUsers]);

     useEffect(() => {
        if(!lastDataChange) return;

        if(lastDataChange.type === 'batch_update' && lastDataChange.payload?.table === 'profiles') {
            getAllUsers();
        }
        if(lastDataChange.type === 'profile_change') {
            setProfile(lastDataChange.payload as Profile);
            getAllUsers(); // Also refresh the full list
        }
    }, [lastDataChange, getAllUsers]);

    return { profile, allUsers, loadingProfile, adminView, setAdminView, getProfile, getAllUsers };
};
