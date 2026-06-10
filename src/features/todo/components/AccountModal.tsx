
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from "@/todo/lib/supabase";
import { XIcon, UserIcon, SpinnerIcon } from "@/todo/components/Icons";
import type { Session } from '@supabase/supabase-js';
import { useSettings } from "@/todo/context/SettingsContext";
import { useToasts } from "@/todo/context/ToastContext";
import { TODO_HUB } from "@/todo/styles/todo-hub-classes";

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


    const fileInputRef = useRef<HTMLInputElement>(null);

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
            className="fixed inset-0 z-[1010] flex animate-fadeIn justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-modal-title"
        >
            <div 
                className={`${TODO_HUB.modalShell} max-w-md max-h-[90vh] transform transition-all duration-300 ease-out animate-fadeInUp`}
                onClick={e => e.stopPropagation()}
            >
                <form onSubmit={handleUpdate} className="flex h-full flex-col">
                    <div className="relative flex-shrink-0 border-b border-white/5 p-6">
                        <button 
                            type="button"
                            onClick={onClose} 
                            className="absolute right-4 top-4 text-[var(--muted)] transition-colors hover:text-[var(--text)]"
                            aria-label={t.close}
                        >
                            <XIcon size={24} />
                        </button>
                        <h2 id="account-modal-title" className="text-2xl font-bold text-[var(--text)]">{t.accountSettings}</h2>
                        <p className="mt-1 truncate text-sm text-[var(--muted)]">{session?.user?.email}</p>
                    </div>

                    <div className="flex-grow space-y-8 overflow-y-auto p-6">
                        {/* Profile Section */}
                        <section>
                            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-[var(--text)]">
                                {t.profile}
                            </h3>
                            
                            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                                <div className="flex-shrink-0 text-center">
                                    <div className="group relative">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt="Avatar" className="h-20 w-20 rounded-full object-cover ring-4 ring-white/10" />
                                        ) : (
                                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5 ring-4 ring-white/10">
                                                <UserIcon size={40} className="text-[var(--muted)]" />
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
                                        <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-[var(--text)]">{t.fullName}</label>
                                        <input 
                                            type="text" 
                                            id="fullName" 
                                            value={fullName} 
                                            onChange={e => setFullName(e.target.value)} 
                                            className={`${TODO_HUB.field} sm:text-sm`} 
                                            placeholder="Enter your name"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div className="border-t border-white/5"></div>

                        {/* Password Section */}
                        <section>
                             <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-[var(--text)]">
                                {t.password}
                            </h3>
                            <div className="rounded-lg border border-white/5 bg-[var(--panel-2)] p-4">
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="newPassword" className="mb-1 block text-sm font-medium text-[var(--text)]">{t.newPassword}</label>
                                        <input type="password" id="newPassword" value={password} onChange={e => setPassword(e.target.value)} className={TODO_HUB.fieldOnPanel} placeholder="Leave blank to keep current" />
                                    </div>
                                    <div>
                                        <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-[var(--text)]">{t.confirmNewPassword}</label>
                                        <input type="password" id="confirmPassword" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={TODO_HUB.fieldOnPanel} placeholder="Confirm new password" />
                                    </div>
                                </div>
                                {passwordError && <p className="mt-3 text-xs text-red-500 text-center animate-shake">{passwordError}</p>}
                            </div>
                        </section>
                    </div>

                    <div className={TODO_HUB.modalFooter}>
                        <button type="button" onClick={onClose} className={TODO_HUB.btnSecondary}>{t.cancel}</button>
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
