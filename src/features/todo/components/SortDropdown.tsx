import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  HUB_FILTER_DROPDOWN_PANEL_CLASS,
  HUB_FILTER_DROPDOWN_ROW_CLASS,
} from "@tool-workspace/hub-ui";
import { useSettings } from "../context/SettingsContext";
import { type SortConfig, type SortField } from "../lib/taskUtils";
import { SortIcon, ArrowUpIcon, ArrowDownIcon, CheckIcon } from "./Icons";
import type { Task } from "../types";

interface SortDropdownProps {
  status: Task["status"];
  config: SortConfig;
  onChange: (config: SortConfig) => void;
}

type SortOption = {
  field: SortField;
  label: string;
};

const SortDropdown: React.FC<SortDropdownProps> = ({ status, config, onChange }) => {
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

  const defaultSortConfigForStatus = useMemo<SortConfig>(() => {
    if (status === "todo") return { field: "compound_todo_default", direction: "desc" };
    if (status === "inprogress") return { field: "compound_inprogress_default", direction: "desc" };
    return { field: "updated_at", direction: "desc" };
  }, [status]);

  const baseSortOptions: SortOption[] = [
    { field: "priority", label: t.priority },
    { field: "created_at", label: t.creationTime },
    { field: "due_date", label: t.dueDateLabel },
  ];

  if (status === "done" || status === "cancelled") {
    baseSortOptions.push({ field: "updated_at", label: t.completionTime });
  }

  const sortOptions: (SortOption | { field: "default"; label: string })[] = [
    { field: "default", label: t.sortDefault },
    ...baseSortOptions,
  ];

  const handleSortChange = (field: SortField | "default") => {
    if (field === "default") {
      onChange(defaultSortConfigForStatus);
    } else if (config.field === field) {
      onChange({ field, direction: config.direction === "asc" ? "desc" : "asc" });
    } else {
      const defaultDirection = field === "updated_at" || field === "created_at" ? "desc" : "asc";
      onChange({ field, direction: defaultDirection });
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full p-1 text-[var(--muted)] transition-colors hover:bg-white/5 hover:text-[var(--text)]"
        title="Sort tasks"
      >
        <SortIcon size={14} />
      </button>
      {isOpen && (
        <div className={`${HUB_FILTER_DROPDOWN_PANEL_CLASS} right-0 left-auto w-48`}>
          <div className="p-1">
            {sortOptions.map((option) => {
              const isDefaultActive =
                config.field === defaultSortConfigForStatus.field &&
                config.direction === defaultSortConfigForStatus.direction;
              const isThisOptionActive =
                option.field === "default"
                  ? isDefaultActive
                  : config.field === option.field && !isDefaultActive;

              return (
                <button
                  key={option.field}
                  type="button"
                  onClick={() => handleSortChange(option.field as SortField | "default")}
                  className={`${HUB_FILTER_DROPDOWN_ROW_CLASS} justify-between`}
                >
                  <span
                    className={
                      isThisOptionActive ? "font-semibold text-[var(--accent-color)]" : undefined
                    }
                  >
                    {option.label}
                  </span>
                  {isThisOptionActive && option.field === "default" && (
                    <CheckIcon size={16} className="text-[var(--accent-color)]" />
                  )}
                  {isThisOptionActive && option.field !== "default" &&
                    (config.direction === "asc" ? (
                      <ArrowUpIcon size={16} className="text-[var(--accent-color)]" />
                    ) : (
                      <ArrowDownIcon size={16} className="text-[var(--accent-color)]" />
                    ))}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SortDropdown;
