import { CalendarDays, LayoutGrid } from "lucide-react";
import { HubSegmentToggle, hubSegmentIconSize } from "@tool-workspace/hub-ui";
import { useSettings } from "../../context/SettingsContext";

export type TodoDashboardView = "board" | "calendar";

type Props = {
  view: TodoDashboardView;
  setView: (view: TodoDashboardView) => void;
};

const DashboardViewToggle = ({ view, setView }: Props) => {
  const { t } = useSettings();
  const iconSize = hubSegmentIconSize();
  return (
    <HubSegmentToggle
      value={view}
      onChange={setView}
      options={[
        {
          value: "board",
          label: t.boardView,
          icon: <LayoutGrid size={iconSize} aria-hidden />,
        },
        {
          value: "calendar",
          label: t.calendarView,
          icon: <CalendarDays size={iconSize} aria-hidden />,
        },
      ]}
    />
  );
};

export default DashboardViewToggle;
