import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  HUB_FILTER_DROPDOWN_PANEL_PORTAL_CLASS,
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
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (!isOpen || !containerRef.current) {
      setPanelPos(null);
      return;
    }
    const update = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      setPanelPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 200),
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const selectedOption = options[value];
  const Icon = selectedOption?.icon;

  const triggerIcon =
    typeof Icon === "string" ? (
      <span className="text-base">{Icon}</span>
    ) : Icon ? (
      <Icon size={14} className={`${selectedOption.color} ${selectedOption.iconClass ?? ""}`} />
    ) : null;

  const panel =
    isOpen && panelPos ? (
      <div
        ref={panelRef}
        className={HUB_FILTER_DROPDOWN_PANEL_PORTAL_CLASS}
        style={{ top: panelPos.top, left: panelPos.left, width: panelPos.width }}
      >
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
    ) : null;

  return (
    <div className="relative min-w-0" ref={containerRef}>
      <HubFilterDropdownTrigger
        active={Boolean(value)}
        open={isOpen}
        label={selectedOption?.label ?? value}
        icon={triggerIcon}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
      />
      {panel ? createPortal(panel, document.body) : null}
    </div>
  );
};

export default StatusPrioritySelect;
