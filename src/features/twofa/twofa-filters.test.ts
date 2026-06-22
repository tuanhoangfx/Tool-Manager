import { describe, expect, it } from "vitest";
import { buildTwofaServiceFilterOptions } from "./twofa-filters";
import type { TwofaAccount } from "./types";

function row(service: string): TwofaAccount {
  return {
    id: service,
    service,
    account: "user@example.com",
    secret: "ABCDEFGHIJKLMNOP",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("buildTwofaServiceFilterOptions", () => {
  it("includes brand iconSrc for known platforms", () => {
    const options = buildTwofaServiceFilterOptions([row("Gmail"), row("ChatGPT")]);
    const gmail = options.find((opt) => opt.value === "Gmail");
    const chatgpt = options.find((opt) => opt.value === "ChatGPT");
    expect(gmail?.iconSrc).toContain("google");
    expect(chatgpt?.iconSrc).toContain("openai");
  });
});
