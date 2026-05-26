import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/supabase", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

import { supabase } from "../../lib/supabase";
import { fetchPublicShareNote } from "./publicShareRepository";

const rpc = vi.mocked(supabase.rpc);
type RpcResponse = Awaited<ReturnType<typeof supabase.rpc>>;

describe("fetchPublicShareNote", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("keeps password-protected shares locked before unlock", async () => {
    rpc.mockResolvedValueOnce({
      error: null,
      data: {
        ok: true,
        locked: true,
        note: {
          id: "note-1",
          title: "Private share",
          body_md: "",
          cookie_snapshot: [],
          share_enabled: true,
          share_token: "token",
          requires_password: true,
        },
      },
      success: true,
      count: null,
      status: 200,
      statusText: "OK",
    } as RpcResponse);

    const res = await fetchPublicShareNote("token");

    expect(res.ok).toBe(true);
    expect(res.locked).toBe(true);
    if (res.ok) {
      expect(res.note.body_md).toBe("");
      expect(res.note.requires_password).toBe(true);
    }
  });

  it("returns unlocked content after password verification", async () => {
    rpc.mockResolvedValueOnce({
      error: null,
      data: {
        ok: true,
        locked: false,
        note: {
          id: "note-1",
          title: "Private share",
          body_md: "Unlocked body",
          cookie_snapshot: [{ line: "sid=abcd...wxyz" }],
          share_enabled: true,
          share_token: "token",
          requires_password: false,
        },
      },
      success: true,
      count: null,
      status: 200,
      statusText: "OK",
    } as RpcResponse);

    const res = await fetchPublicShareNote("token", "pass");

    expect(rpc).toHaveBeenCalledWith("note_public_share_get", {
      p_token: "token",
      p_password: "pass",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.note.body_md).toBe("Unlocked body");
  });
});
