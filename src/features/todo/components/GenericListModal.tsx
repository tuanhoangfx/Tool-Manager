
import React from "react";
import { XIcon } from "@/todo/components/Icons";
import { useSettings } from "@/todo/context/SettingsContext";
import { TODO_HUB } from "@/todo/styles/todo-hub-classes";

interface GenericListModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    filterContent?: React.ReactNode;
    footerContent?: React.ReactNode;
    scrollRef?: React.RefObject<HTMLDivElement | null>;
    maxWidth?: string;
}

const GenericListModal: React.FC<GenericListModalProps> = ({ 
    isOpen, onClose, title, children, filterContent, footerContent, scrollRef, maxWidth = "max-w-4xl"
}) => {
    const { t } = useSettings();

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-[1000] flex animate-fadeIn justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div 
                className={`${TODO_HUB.modalShell} my-auto w-full ${maxWidth} max-h-[90vh] animate-fadeInUp`}
                onClick={e => e.stopPropagation()}
            >
                <div className={TODO_HUB.modalHeader}>
                    <h2 id="modal-title" className="text-xl font-bold text-[var(--text)]">{title}</h2>
                    <button 
                        type="button"
                        onClick={onClose} 
                        className="text-[var(--muted)] transition-colors hover:text-[var(--text)]"
                        aria-label={t.close}
                    >
                        <XIcon size={24} />
                    </button>
                </div>

                {filterContent && (
                    <div className="flex-shrink-0 border-b border-white/5 bg-[var(--panel-2)] p-3">
                        {filterContent}
                    </div>
                )}

                <div ref={scrollRef} className="flex-grow overflow-y-auto">
                    {children}
                </div>
                
                {footerContent && (
                     <div className="flex-shrink-0 border-t border-white/5 bg-[var(--panel-2)] p-2 text-right">
                        {footerContent}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GenericListModal;
