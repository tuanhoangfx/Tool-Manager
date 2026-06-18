import { describe, expect, it } from "vitest";
import { mergeHubDirectoryOntoDataBox } from "./workspace-user-directory";
import type { Profile } from "../features/todo/types";

describe("mergeHubDirectoryOntoDataBox", () => {
  it("maps Hub roster onto Data Box UUID by synthetic email", () => {
    const dataBox: Profile[] = [
      {
        id: "databox-uuid-1",
        full_name: null,
        avatar_url: null,
        email: "czpgo@infix1.io.vn",
        role: "employee",
        updated_at: null,
      },
    ];
    const hubUsers = [
      {
        id: "hub-uuid-other",
        full_name: "CZP Go",
        avatar_url: null,
        email: "czpgo@infix1.io.vn",
        role: "admin" as const,
        updated_at: null,
      },
    ];

    const merged = mergeHubDirectoryOntoDataBox(hubUsers, dataBox);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe("databox-uuid-1");
    expect(merged[0].full_name).toBe("CZP Go");
    expect(merged[0].role).toBe("admin");
  });

  it("keeps Data Box-only users when Hub has no match", () => {
    const dataBox: Profile[] = [
      {
        id: "local-only",
        full_name: "Local",
        avatar_url: null,
        email: "local@example.com",
        role: "employee",
        updated_at: null,
      },
    ];
    const merged = mergeHubDirectoryOntoDataBox([], dataBox);
    expect(merged).toEqual(dataBox);
  });
});
