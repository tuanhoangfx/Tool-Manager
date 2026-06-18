import { describe, expect, it } from "vitest";
import { resolveTodoProfile } from "./todo-resolve-profile";
import type { Profile } from "./types";

const directoryAdmin: Profile = {
  id: "user-1",
  full_name: "CZP Go",
  avatar_url: null,
  email: "czpgo@outlook.com",
  role: "admin",
  updated_at: null,
};

describe("resolveTodoProfile", () => {
  it("prefers Hub directory role over embedded employee profile", () => {
    const embedded = {
      id: "user-1",
      full_name: "CZP Go",
      avatar_url: null,
      email: "czpgo@outlook.com",
      role: "employee" as const,
    };

    const resolved = resolveTodoProfile("user-1", embedded, [directoryAdmin]);
    expect(resolved.role).toBe("admin");
  });

  it("keeps directory display when embedded only has email", () => {
    const embedded = { email: "czpgo@outlook.com", role: "employee" as const };

    const resolved = resolveTodoProfile("user-1", embedded, [directoryAdmin]);
    expect(resolved.role).toBe("admin");
    expect(resolved.full_name).toBe("CZP Go");
  });
});
