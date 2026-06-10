
import React, { useState, useRef } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { supabase } from '../../lib/supabase';
import { TaskAttachment } from '../../types';
import { PaperclipIcon } from '../../components/Icons';
import AttachmentItem from './attachments/AttachmentItem';
import AttachmentPreviewModal from './attachments/AttachmentPreviewModal';
import { TODO_HUB } from '../../styles/todo-hub-classes';


interface AttachmentSectionProps {
    attachments: TaskAttachment[];
    newFiles: File[];
    onAddNewFiles: (files: File[]) => void;
    onRemoveNewFile: (index: number) => void;
    onRemoveExistingAttachment: (id: number) => void;
    isSaving: boolean;
}

const AttachmentSection: React.FC<AttachmentSectionProps> = ({
    attachments,
    newFiles,
    onAddNewFiles,
    onRemoveNewFile,
    onRemoveExistingAttachment,
    isSaving
}) => {
    const { t } = useSettings();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewAttachment, setPreviewAttachment] = useState<any | null>(null);

    const getPublicUrl = (filePath: string) => {
        const { data } = supabase.storage.from('task-attachments').getPublicUrl(filePath);
        return data.publicUrl;
    }
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            onAddNewFiles(Array.from(e.target.files));
        }
    };

    return (
        <div>
            <label className={TODO_HUB.labelHiddenMd}>{t.attachments}</label>
            <div className="flex items-stretch gap-2 sm:gap-3">
                <div className={TODO_HUB.dropzone}>
                    <p>{t.pasteOrDrop}</p>
                </div>
                <button type="button" onClick={() => fileInputRef.current?.click()} className={TODO_HUB.btnAttach}>
                    <PaperclipIcon size={14} /> <span>{t.addAttachment}</span>
                </button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" />
            <div className="mt-2 space-y-2">
                {attachments.map(att => {
                    const attachmentWithUrl = { ...att, name: att.file_name, size: att.file_size, dataUrl: getPublicUrl(att.file_path) };
                    return <AttachmentItem key={att.id} file={attachmentWithUrl} onRemove={() => onRemoveExistingAttachment(att.id)} isNew={false} onPreview={() => setPreviewAttachment(attachmentWithUrl)} isSaving={false} />;
                })}
                {newFiles.map((file, index) => {
                    const fileWithUrl = { name: file.name, size: file.size, file_type: file.type, dataUrl: URL.createObjectURL(file) };
                    return <AttachmentItem key={index} file={fileWithUrl} onRemove={() => onRemoveNewFile(index)} isNew={true} onPreview={() => setPreviewAttachment(fileWithUrl)} isSaving={isSaving} />;
                })}
            </div>
            {previewAttachment && <AttachmentPreviewModal attachment={previewAttachment} onClose={() => setPreviewAttachment(null)} />}
        </div>
    );
};

export default AttachmentSection;
