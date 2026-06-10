import React, { useState, useEffect, useRef, useMemo } from "react";
import { HubFilterSelect } from "@tool-workspace/hub-ui";
import type { TimeRange } from "../PerformanceSummary";

type Props = {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  options: { value: TimeRange; label: string }[];
};

const TimeRangeSelect: React.FC<Props> = ({ value, onChange, options }) => (
  <HubFilterSelect
    filterKey="timeRange"
    label="Period"
    value={value}
    onChange={onChange}
    options={options.map((o) => ({ value: o.value, label: o.label }))}
    usePortal={false}
    className="w-full"
  />
);

export default TimeRangeSelect;
