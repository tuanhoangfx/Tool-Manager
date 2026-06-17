import { DirectorySearchToolbar } from "@tool-workspace/hub-ui";
import type { ComponentProps } from "react";
import type { FilterDef } from "../../components/sales-shell";
import type { WorkspaceScreen } from "../../lib/workspace-screen";
import { WorkspaceDisplayBandToolbar } from "./WorkspaceDisplayBandToolbar";

type Props = ComponentProps<typeof DirectorySearchToolbar> & {
  screen: WorkspaceScreen;
  screenFilters?: FilterDef[];
};

/** Golden directory toolbar — Display panel wired per workspace tab. */
export function WorkspaceDirectorySearchToolbar({
  screen,
  screenFilters,
  displayBand,
  ...props
}: Props) {
  return (
    <DirectorySearchToolbar
      displayBand={displayBand ?? <WorkspaceDisplayBandToolbar screen={screen} screenFilters={screenFilters} />}
      {...props}
    />
  );
}
