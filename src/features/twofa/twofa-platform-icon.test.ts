import { describe, expect, it } from "vitest";
import { resolveTwofaPlatformIcon } from "./twofa-platform-icon";

describe("resolveTwofaPlatformIcon", () => {
  it("maps Gmail to Google icon", () => {
    const hit = resolveTwofaPlatformIcon("Gmail");
    expect(hit?.label).toBe("Google");
    expect(hit?.src).toContain("/icons/google.svg");
  });

  it("maps ChatGPT to OpenAI brand icon (colored PNG)", () => {
    const hit = resolveTwofaPlatformIcon("ChatGPT");
    expect(hit?.label).toBe("OpenAI");
    expect(hit?.src).toBe("/assets/brand-icons/chatgpt.png");
  });

  it("maps Cursor to local brand icon", () => {
    const hit = resolveTwofaPlatformIcon("Cursor");
    expect(hit?.label).toBe("Cursor");
    expect(hit?.src).toBe("/assets/brand-icons/cursor.png");
  });

  it("maps Capcut to local CapCut brand icon", () => {
    const hit = resolveTwofaPlatformIcon("Capcut");
    expect(hit?.label).toBe("CapCut");
    expect(hit?.src).toBe("/assets/brand-icons/capcut.png");
  });

  it("maps ElevenLabs from thesvg CDN", () => {
    const hit = resolveTwofaPlatformIcon("ElevenLabs");
    expect(hit?.label).toBe("ElevenLabs");
    expect(hit?.src).toContain("elevenlabs");
  });

  it("maps Kalodata to local brand icon", () => {
    const hit = resolveTwofaPlatformIcon("Kalodata");
    expect(hit?.label).toBe("Kalodata");
    expect(hit?.src).toBe("/assets/brand-icons/kalodata.png");
  });

  it("maps VPN Surfshark before generic surf", () => {
    const hit = resolveTwofaPlatformIcon("VPN Surfshark");
    expect(hit?.label).toBe("Surfshark");
    expect(hit?.src).toContain("surfshark");
  });

  it("maps Github Copilot before Github", () => {
    expect(resolveTwofaPlatformIcon("Github Copilot")?.src).toBe("/assets/brand-icons/github-copilot.png");
    expect(resolveTwofaPlatformIcon("Github")?.src).toBe("/icons/github.svg");
  });

  it("maps Acc Weibo and Acc Douyin to local brand icons", () => {
    expect(resolveTwofaPlatformIcon("Acc Weibo")?.src).toBe("/assets/brand-icons/weibo.png");
    expect(resolveTwofaPlatformIcon("Acc Douyin")?.src).toBe("/assets/brand-icons/douyin.png");
  });

  it("returns null for unknown platform", () => {
    expect(resolveTwofaPlatformIcon("UnknownPlatformXYZ")).toBeNull();
  });
});
