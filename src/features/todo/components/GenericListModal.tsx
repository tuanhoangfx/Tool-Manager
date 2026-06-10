import type { ReactNode, RefObject } from "react";
import { HubDetailModal } from "@tool-workspace/hub-ui";
import { TODO_HUB } from "../styles/todo-hub-classes";

interface GenericListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  filterContent?: ReactNode;
  footerContent?: ReactNode;
  scrollRef?: RefObject<HTMLDivElement | null>;
  maxWidth?: string;
}

/** List modal — golden HubDetailModal shell + edge close (Notify, Activity log). */
const GenericListModal = ({
  isOpen,
  onClose,
  title,
  children,
  filterContent,
  footerContent,
  scrollRef,
  maxWidth = "max-w-4xl",
}: GenericListModalProps) => (
  <HubDetailModal
    open={isOpen}
    onClose={onClose}
    ariaLabelledBy="modal-title"
    size="compact"
    shellClassName={`hub-tool-detail-modal--fit ${maxWidth} w-full max-h-[90vh]`}
    header={
      <div className={TODO_HUB.modalHeader}>
        <h2 id="modal-title" className="text-xl font-bold text-[var(--text)]">
          {title}
        </h2>
      </div>
    }
    footer={
      footerContent ? (
        <div className={TODO_HUB.modalFooter}>{footerContent}</div>
      ) : undefined
    }
  >
    {filterContent ? (
      <div className="flex-shrink-0 border-b border-white/5 bg-[var(--panel-2)] p-3">{filterContent}</div>
    ) : null}
    <div ref={scrollRef} className="flex-grow overflow-y-auto">
      {children}
    </div>
  </HubDetailModal>
);

export default GenericListModal;
