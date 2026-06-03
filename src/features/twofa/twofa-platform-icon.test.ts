import { describe, expect, it } from "vitest";
import { resolveTwofaPlatformIcon } from "./twofa-platform-icon";

describe("resolveTwofaPlatformIcon", () => {
  it("maps Gmail to Google icon", () => {
    const hit = resolveTwofaPlatformIcon("Gmail");
    expect(hit?.label).toBe("Google");
    expect(hit?.src).toContain("/icons/google.svg");
  });

  it("maps ChatGPT to OpenAI icon", () => {
    const hit = resolveTwofaPlatformIcon("ChatGPT");
    expect(hit?.label).toBe("OpenAI");
    expect(hit?.src).toContain("/icons/openai.svg");
  });

  it("returns null for unknown platform", () => {
    expect(resolveTwofaPlatformIcon("UnknownPlatformXYZ")).toBeNull();
  });
});
