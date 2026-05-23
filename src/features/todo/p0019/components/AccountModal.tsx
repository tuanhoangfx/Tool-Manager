// @ts-nocheck

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { XIcon, UserIcon, SpinnerIcon } from '@/components/Icons';
import type { Session } from '@supabase/supabase-js';
import { useSettings } from '@/context/SettingsContext';
import { useToasts } from '@/context/ToastContext';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
}

const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, session }) => {
    const { t } = useSettings();
    const { addToast } = useToasts();
    
    const [loading, setLoading] = useState(false);
    const [fullName, setFullName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState<string | null>(null);


    const fileInputRef = useRef<HTMLDivElement>(null);

    const getProfile = useCallback(async () => {
        if (!session) return;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select(`full_name, avatar_url`)
                .eq('id', session.user.id)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;

            if (data) {
                setFullName(data.full_name || '');
                setAvatarUrl(data.avatar_url || null);
            }
        } catch (error: any) {
            console.error('Error fetching profile:', error.message);
        }
    }, [session]);

    useEffect(() => {
        if (isOpen && session) {
            getProfile();
            setPassword('');
            setConfirmPassword('');
            setAvatarFile(null);
            setPasswordError(null);
            setLoading(false);
        }
    }, [isOpen, session, getProfile]);
    
    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAvatarFile(e.target.files[0]);
            setAvatarUrl(URL.createObjectURL(e.target.files[0]));
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session) return;

        // Validation
        setPasswordError(null);
        if (password || confirmPassword) {
             if (password !== confirmPassword) {
                setPasswordError(t.passwordsDoNotMatch);
                return;
            }
             if (password.length < 6) {
                 setPasswordError("Password must be at least 6 characters");
                 return;
             }
        }

        setLoading(true);
        const errors: string[] = [];
        const successes: string[] = [];

        try {
            // 1. Update Profile
            let newAvatarUrl = avatarUrl;
            
            // Upload avatar if changed
            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const filePath = `${session.user.id}/${Math.random()}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile);
                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
                newAvatarUrl = urlData.publicUrl;
            }

            const updates = {
                id: session.user.id,
                full_name: fullName,
                avatar_url: newAvatarUrl,
                updated_at: new Date().toISOString(),
            };

            const { error: profileError } = await supabase.from('profiles').upsert(updates);
            if (profileError) {
                errors.push(`Profile update failed: ${profileError.message}`);
            } else {
                 await supabase.auth.updateUser({ data: { full_name: fullName, avatar_url: newAvatarUrl } });
                 successes.push(t.profileUpdated);
            }

            // 2. Update Password (if provided)
            if (password) {
                const { error: pwError } = await supabase.auth.updateUser({ password });
                if (pwError) {
                    errors.push(`Password update failed: ${pwError.message}`);
                } else {
                    successes.push(t.passwordUpdated);
                }
            }

        } catch (error: any) {
            errors.push(error.message);
        } finally {
            setLoading(false);
            
            if (errors.length > 0) {
                addToast(errors.join(', '), 'error');
            } 
            if (successes.length > 0) {
                if (successes.length > 1) {
                     addToast("Account updated successfully", 'success');
                } else {
                     addToast(successes[0], 'success');
                }
                
                // Reset password fields on success
                if (password && errors.length === 0) {
                    setPassword('');
                    setConfirmPassword('');
                }
                // Reset avatar file state so we don't re-upload unnecessarily next time
                setAvatarFile(null);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1010] flex justify-center overflow-y-auto p-4 animate-fadeIn"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-modal-title"
        >
            <div 
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 ease-out animate-fadeInUp my-auto max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <form onSubmit={handleUpdate} className="flex flex-col h-full">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 relative">
                        <button 
                            type="button"
                            onClick={onClose} 
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                            aria-label={t.close}
                        >
                            <XIcon size={24} />
                        </button>
                        <h2 id="account-modal-title" className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t.accountSettings}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">{session?.user?.email}</p>
                    </div>

                    <div className="overflow-y-auto p-6 space-y-8 flex-grow">
                        {/* Profile Section */}
                        <section>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                                {t.profile}
                            </h3>
                            
                            <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
                                <div className="flex-shrink-0 text-center">
                                    <div className="relative group">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover ring-4 ring-gray-100 dark:ring-gray-700" />
                                        ) : (
                                            <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center ring-4 ring-gray-100 dark:ring-gray-700">
                                                <UserIcon size={40} className="text-gray-400" />
                                            </div>
                                        )}
                                        <button 
                                            type="button" 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="absolute bottom-0 right-0 bg-[var(--accent-color)] text-white p-1.5 rounded-full shadow-lg hover:bg-[var(--accent-color-dark)] transition-colors"
                                            title={t.uploadAvatar}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                        </button>
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/png, image/jpeg" className="hidden"/>
                                </div>
                                
                                <div className="flex-grow w-full space-y-4">
                                    <div>
                                        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.fullName}</label>
                                        <input 
                                            type="text" 
                                            id="fullName" 
                                            value={fullName} 
                                            onChange={e => setFullName(e.target.value)} 
                                            className="block w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] sm:text-sm transition-colors" 
                                            placeholder="Enter your name"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div className="border-t border-gray-200 dark:border-gray-700"></div>

                        {/* Password Section */}
                        <section>
                             <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                                {t.password}
                            </h3>
                            <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-200 dark:border-gray-700/50">
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.newPassword}</label>
                                        <input type="password" id="newPassword" value={password} onChange={e => setPassword(e.target.value)} className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] sm:text-sm" placeholder="Leave blank to keep current" />
                                    </div>
                                    <div>
                                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.confirmNewPassword}</label>
                                        <input type="password" id="confirmPassword" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] sm:text-sm" placeholder="Confirm new password" />
                                    </div>
                                </div>
                                {passwordError && <p className="mt-3 text-xs text-red-500 text-center animate-shake">{passwordError}</p>}
                            </div>
                        </section>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 flex justify-end items-center space-x-3 rounded-b-2xl flex-shrink-0">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 shadow-sm transition-colors">{t.cancel}</button>
                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="px-6 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[var(--gradient-from)] to-[var(--gradient-to)] rounded-md shadow-md transform transition-all duration-300 hover:scale-105 hover:shadow-xl focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading && <SpinnerIcon size={16} className="animate-spin" />}
                            {loading ? t.updating : t.update}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AccountModal;
