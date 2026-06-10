
import React from 'react';
import { supabase } from '../../../lib/supabase';
import { DocumentTextIcon, TrashIcon, DownloadIcon, SpinnerIcon } from '../../Icons';
import { TODO_HUB } from '../../../styles/todo-hub-classes';

const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
};


const AttachmentItem: React.FC<{
    file: { name: string; type?: string; size: number; id?: number, file_path?: string, file_type?: string, dataUrl?: string };
    onRemove: () => void;
    onPreview: () => void;
    isNew: boolean;
    isSaving: boolean;
}> = React.memo(({ file, onRemove, onPreview, isNew, isSaving }) => {
    
    const handleDownload = async () => {
        if (isNew || !file.file_path) return;
        try {
            const { data, error } = await supabase.storage.from('task-attachments').download(file.file_path);
            if (error) throw error;
            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (error: any) {
            console.error('Error downloading file:', error.message);
            alert('Could not download file.');
        }
    };

    const isPreviewable = file.file_type?.startsWith('image/') || file.file_type?.startsWith('video/');

    return (
        <div className={TODO_HUB.attachmentRow}>
            <div className="flex items-center gap-3 overflow-hidden">
                {isPreviewable ? (
                     <div className={TODO_HUB.attachmentThumb} onClick={onPreview}>
                        {file.file_type?.startsWith('image/') && <img src={file.dataUrl} alt={file.name} className="h-full w-full rounded object-cover" />}
                        {file.file_type?.startsWith('video/') && <video src={file.dataUrl} className="h-full w-full rounded object-cover" />}
                    </div>
                ) : (
                     <div className={TODO_HUB.attachmentThumb}>
                        <DocumentTextIcon size={24} className="text-[var(--muted)]" />
                    </div>
                )}
                <div className="flex flex-col overflow-hidden">
                    <span className="truncate text-sm font-medium text-[var(--text)]">{file.name}</span>
                     {isNew && isSaving ? (
                        <span className="flex items-center gap-1 text-xs text-sky-400">
                            <SpinnerIcon size={12} className="animate-spin" />
                            Uploading...
                        </span>
                    ) : (
                        <span className="text-xs text-[var(--muted)]">{formatBytes(file.size)}</span>
                    )}
                </div>
            </div>
            <div className="flex flex-shrink-0 items-center">
                {!isNew && (
                     <button type="button" onClick={handleDownload} className={TODO_HUB.iconBtn} title="Download">
                        <DownloadIcon size={16} />
                    </button>
                )}
                <button type="button" onClick={onRemove} disabled={isNew && isSaving} className={`${TODO_HUB.iconBtn} todo-hub-icon-btn--danger disabled:cursor-not-allowed disabled:opacity-50`} title="Remove">
                    <TrashIcon size={16} />
                </button>
            </div>
        </div>
    );
});

export default AttachmentItem;
