import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search } from "lucide-react";
import {
  HUB_FILTER_DROPDOWN_PANEL_CLASS,
  HUB_FILTER_DROPDOWN_ROW_CLASS,
  HubFilterDropdownCircle,
  HubFilterDropdownTrigger,
} from "@tool-workspace/hub-ui";
import { compactIconSize } from "../../../../../lib/ui-scale";
import { PlusIcon } from "../../Icons";
import Avatar from "../../common/Avatar";

export interface MultiSelectOption {
  id: string;
  label: string;
  avatarUrl?: string;
  icon?: React.ReactNode;
}

interface MultiSelectDropdownProps {
  options: MultiSelectOption[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  buttonLabel: (selectedCount: number, totalCount: number) => string;
  buttonIcon: React.ReactNode;
  searchPlaceholder: string;
  allLabel: string;
  widthClass?: string;
  onConfirmSelection?: () => void;
  confirmLabel?: string | ((count: number) => string);
  confirmIcon?: React.ReactNode;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selectedIds,
  onChange,
  buttonLabel,
  buttonIcon,
  searchPlaceholder,
  allLabel,
  widthClass = "sm:w-52",
  onConfirmSelection,
  confirmLabel,
  confirmIcon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) setSearchTerm("");
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [options, searchTerm]);

  const handleToggleOption = (optionId: string) => {
    const newSelection = selectedIds.includes(optionId)
      ? selectedIds.filter((id) => id !== optionId)
      : [...selectedIds, optionId];
    onChange(newSelection);
  };

  const isAllSelected = options.length > 0 && selectedIds.length === options.length;
  const isPartial =
    selectedIds.length > 0 && selectedIds.length < options.length;

  const handleToggleAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange(options.map((u) => u.id));
    }
  };

  const handleConfirm = () => {
    if (onConfirmSelection) {
      onConfirmSelection();
      setIsOpen(false);
    }
  };

  const label = buttonLabel(selectedIds.length, options.length);

  return (
    <div className={`relative ${widthClass}`} ref={ref}>
      <HubFilterDropdownTrigger
        active={isPartial || (selectedIds.length > 0 && !isAllSelected)}
        open={isOpen}
        label={label}
        count={selectedIds.length > 1 ? selectedIds.length : undefined}
        icon={buttonIcon}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
      />

      {isOpen && (
        <div className={`${HUB_FILTER_DROPDOWN_PANEL_CLASS} left-0 right-auto w-full min-w-[12rem]`}>
          <div className="border-b border-white/5 p-2">
            <div className="relative">
              <Search
                size={compactIconSize(12)}
                className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-[var(--muted)]"
                aria-hidden
              />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="field text-xs"
                style={{ paddingLeft: 25, paddingTop: 4, paddingBottom: 4 }}
                autoFocus
              />
            </div>
          </div>

          <ul className="max-h-72 overflow-y-auto p-1">
            <li>
              <button
                type="button"
                onClick={handleToggleAll}
                className={`${HUB_FILTER_DROPDOWN_ROW_CLASS} font-medium`}
              >
                <HubFilterDropdownCircle checked={isAllSelected} indeterminate={isPartial} />
                <span className="truncate">{allLabel}</span>
              </button>
            </li>
            {filteredOptions.map((option) => {
              const checked = selectedIds.includes(option.id);
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => handleToggleOption(option.id)}
                    className={HUB_FILTER_DROPDOWN_ROW_CLASS}
                  >
                    <HubFilterDropdownCircle checked={checked} />
                    {option.avatarUrl ? (
                      <Avatar
                        user={{ avatar_url: option.avatarUrl, full_name: option.label }}
                        title={option.label}
                        size={24}
                      />
                    ) : option.icon ? (
                      <span className="flex w-6 shrink-0 items-center justify-center">{option.icon}</span>
                    ) : (
                      <span className="w-6 shrink-0" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-left">{option.label}</span>
                  </button>
                </li>
              );
            })}
            {filteredOptions.length === 0 && (
              <li className="px-3 py-2 text-center text-xs text-[var(--muted)]">
                No options match your search.
              </li>
            )}
          </ul>

          {onConfirmSelection && (
            <div className="flex-shrink-0 border-t border-white/5 p-2">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={selectedIds.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-[var(--gradient-from)] to-[var(--gradient-to)] px-3 py-1.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
              >
                {confirmIcon || <PlusIcon size={16} />}
                <span>
                  {typeof confirmLabel === "function"
                    ? confirmLabel(selectedIds.length)
                    : confirmLabel || "Add Selected"}
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
