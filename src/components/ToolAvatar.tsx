import { MaterialIcon } from "./MaterialIcon";
import { HubToolAvatar, type HubToolAvatarProps } from "@tool-workspace/hub-ui";

type ToolAvatarProps = Omit<HubToolAvatarProps, "glyph" | "icon" | "scaled"> & {
  iconName: string;
};

export function ToolAvatar({ iconName, ...props }: ToolAvatarProps) {
  const iconPx = props.size === "lg" ? 22 : props.size === "sm" ? 16 : 18;
  return (
    <HubToolAvatar
      {...props}
      glyph={<MaterialIcon name={iconName} size={iconPx} />}
    />
  );
}
