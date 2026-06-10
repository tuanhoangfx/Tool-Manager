import React, { useState, useRef, useEffect } from "react";
import {
  HUB_FILTER_DROPDOWN_PANEL_CLASS,
  HUB_FILTER_DROPDOWN_ROW_CLASS,
  HubFilterDropdownTrigger,
} from "@tool-workspace/hub-ui";
import { useSettings } from "../context/SettingsContext";
import { type SortConfig } from "../lib/taskUtils";
import { SortIcon, CheckIcon } from "./Icons";

export type CalendarSortOptionKey = "default" | "status" | "priority" | "creation_date";

export type CalendarSortOption = {
  id: CalendarSortOptionKey;
  label: string;
  config: SortConfig;
};

interface CalendarSortDropdownProps {
  currentSortId: CalendarSortOptionKey;
  onSortChange: (id: CalendarSortOptionKey, config: SortConfig) => void;
}

const CalendarSortDropdown: React.FC<CalendarSortDropdownProps> = ({
  currentSortId,
  onSortChange,
}) => {
  const { t } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sortOptions: CalendarSortOption[] = [
    {
      id: "default",
      label: t.sortDefault,
      config: { field: "compound_status_priority", direction: "desc" },
    },
    { id: "status", label: t.sortStatus, config: { field: "status", direction: "desc" } },
    { id: "priority", label: t.sortPriority, config: { field: "priority", direction: "desc" } },
    {
      id: "creation_date",
      label: t.sortCreationDate,
      config: { field: "created_at", direction: "desc" },
    },
  ];

  const selectedOption = sortOptions.find((opt) => opt.id === currentSortId) || sortOptions[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <HubFilterDropdownTrigger
        active={false}
        open={isOpen}
        label={selectedOption.label}
        icon={<SortIcon size={14} className="shrink-0 opacity-75" aria-hidden />}
        onClick={() => setIsOpen(!isOpen)}
        className="min-w-[8rem] justify-between"
        title={t.sortBy}
      />
      {isOpen && (
        <div className={`${HUB_FILTER_DROPDOWN_PANEL_CLASS} right-0 left-auto w-48`}>
          <div className="p-1">
            {sortOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onSortChange(option.id, option.config);
                  setIsOpen(false);
                }}
                className={`${HUB_FILTER_DROPDOWN_ROW_CLASS} justify-between`}
              >
                <span
                  className={
                    currentSortId === option.id
                      ? "font-semibold text-[var(--accent-color)]"
                      : undefined
                  }
                >
                  {option.label}
                </span>
                {currentSortId === option.id && (
                  <CheckIcon size={16} className="text-[var(--accent-color)]" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarSortDropdown;
