import React, { useState, useEffect, useRef } from "react";
import {
  HUB_FILTER_DROPDOWN_PANEL_CLASS,
  HUB_FILTER_DROPDOWN_ROW_CLASS,
  HubFilterDropdownTrigger,
} from "@tool-workspace/hub-ui";

export interface CustomSelectOption {
  label: string;
  icon: string | React.FC<{ size?: number; className?: string }>;
  color: string;
  iconClass?: string;
}

const StatusPrioritySelect = ({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { [key: string]: CustomSelectOption };
  onChange: (value: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options[value];
  const Icon = selectedOption?.icon;

  const triggerIcon =
    typeof Icon === "string" ? (
      <span className="text-base">{Icon}</span>
    ) : Icon ? (
      <Icon size={14} className={`${selectedOption.color} ${selectedOption.iconClass ?? ""}`} />
    ) : null;

  return (
    <div className="relative mt-1" ref={ref}>
      <HubFilterDropdownTrigger
        active={Boolean(value)}
        open={isOpen}
        label={selectedOption?.label ?? value}
        icon={triggerIcon}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
      />
      {isOpen && (
        <div className={`${HUB_FILTER_DROPDOWN_PANEL_CLASS} left-0 right-0 w-full`}>
          <div className="max-h-60 overflow-y-auto p-1">
            {Object.entries(options).map(([key, option]) => {
              const ItemIcon = option.icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onChange(key);
                    setIsOpen(false);
                  }}
                  className={`${HUB_FILTER_DROPDOWN_ROW_CLASS} ${value === key ? "bg-white/5" : ""}`}
                >
                  {typeof ItemIcon === "string" ? (
                    <span className="text-base">{ItemIcon}</span>
                  ) : (
                    <ItemIcon size={16} className={`${option.color} ${option.iconClass ?? ""}`} />
                  )}
                  <span className="font-medium">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusPrioritySelect;
