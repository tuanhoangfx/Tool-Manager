
import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { TaskComment, Profile } from '../../types';
import { formatAbsoluteDateTime } from '../../lib/taskUtils';
import { ChatBubbleIcon, SendIcon, SpinnerIcon } from '../../components/Icons';
import Avatar from '../common/Avatar';
import { TODO_HUB } from '../../styles/todo-hub-classes';

export interface TempComment {
    id: string;
    content: string;
    profiles: Profile;
    user_id: string;
    created_at: string;
    task_id: number;
    isSending?: boolean;
}

interface CommentSectionProps {
    comments: (TaskComment | TempComment)[];
    onPostComment: (comment: string) => Promise<void>;
    isPostingComment: boolean;
}

const CommentSection: React.FC<CommentSectionProps> = ({ comments, onPostComment, isPostingComment }) => {
    const { t, language, timezone } = useSettings();
    const [newComment, setNewComment] = useState('');
    const [isCommentInputVisible, setCommentInputVisible] = useState(false);

    const handlePost = async () => {
        if (!newComment.trim()) return;
        await onPostComment(newComment);
        setNewComment('');
    };

    return (
        <div className="flex h-full flex-col">
            <label className={`${TODO_HUB.labelSection} sm:text-sm`}>
              {t.comments} ({comments.length})
            </label>
            <div className={TODO_HUB.panelInset}>
                {comments.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center text-[var(--muted)]">
                        <ChatBubbleIcon size={32} className="mb-2 opacity-50" />
                        <p className="text-sm font-medium">{t.noCommentsYet}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                    {comments.map(comment => (
                        <div key={comment.id} className={`flex items-start gap-2.5 transition-opacity ${'isSending' in comment && comment.isSending ? 'opacity-60' : ''}`}>
                            <div className="flex-shrink-0">
                                <Avatar user={comment.profiles} title={comment.profiles.full_name || ''} size={28} />
                            </div>
                            <div className="flex-grow">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-[var(--text)]">{comment.profiles?.full_name}</span>
                                    <time className="text-xs tabular-nums text-[var(--muted)]">
                                        {'isSending' in comment && comment.isSending ? 'Sending...' : formatAbsoluteDateTime(comment.created_at, language, timezone)}
                                    </time>
                                </div>
                                <p className="whitespace-pre-wrap break-words text-sm text-[var(--muted)]">{comment.content}</p>
                            </div>
                        </div>
                    ))}
                    </div>
                )}
            </div>
            <div className="mt-2">
                {isCommentInputVisible ? (
                    <div className="flex items-center gap-2">
                        <textarea
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            placeholder={t.addComment}
                            rows={1}
                            autoFocus
                            disabled={isPostingComment}
                            className={TODO_HUB.fieldGrow}
                        />
                        <button
                            type="button"
                            onClick={handlePost}
                            disabled={isPostingComment || !newComment.trim()}
                            className="rounded-full bg-gradient-to-r from-[var(--gradient-from)] to-[var(--gradient-to)] p-2 text-white transition-opacity hover:scale-110 disabled:opacity-50"
                            aria-label={t.post}
                        >
                            {isPostingComment ? <SpinnerIcon size={20} className="animate-spin" /> : <SendIcon size={20} />}
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setCommentInputVisible(true)}
                        className={TODO_HUB.btnGhost}
                    >
                        {t.addComment}
                    </button>
                )}
            </div>
        </div>
    );
};

export default CommentSection;
