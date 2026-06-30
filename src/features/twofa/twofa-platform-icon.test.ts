import { describe, expect, it, beforeEach } from "vitest";
import { clearHubBrandIconMatchCache } from "@tool-workspace/hub-ui";
import { resolveTwofaPlatformIcon } from "./twofa-platform-icon";

describe("resolveTwofaPlatformIcon", () => {
  beforeEach(() => {
    clearHubBrandIconMatchCache();
  });
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

  it("maps Capcut to local CapCut brand icon (bare shell)", () => {
    const hit = resolveTwofaPlatformIcon("Capcut");
    expect(hit?.label).toBe("CapCut");
    expect(hit?.src).toBe("/assets/brand-icons/capcut.png");
    expect(hit?.shell).toBe("bare");
  });

  it("maps Adobe and Augment Code as bare colored icons", () => {
    expect(resolveTwofaPlatformIcon("Adobe")?.src).toBe("/assets/brand-icons/adobe.ico");
    expect(resolveTwofaPlatformIcon("Adobe")?.shell).toBe("bare");
    expect(resolveTwofaPlatformIcon("Augment Code")?.shell).toBe("bare");
  });

  it("maps WhatsApp as bare green app icon", () => {
    const hit = resolveTwofaPlatformIcon("WhatsApp");
    expect(hit?.src).toBe("/assets/brand-icons/whatsapp.png");
    expect(hit?.shell).toBe("bare");
  });

  it("maps Binance to local favicon PNG (bare shell)", () => {
    const hit = resolveTwofaPlatformIcon("Binance");
    expect(hit?.label).toBe("Binance");
    expect(hit?.src).toBe("/assets/brand-icons/binance.png");
    expect(hit?.shell).toBe("bare");
  });

  it("maps Github to tile shell for dark mark", () => {
    const hit = resolveTwofaPlatformIcon("Github");
    expect(hit?.shell).toBe("tile");
  });

  it("maps Grizzlysms to local favicon PNG", () => {
    const hit = resolveTwofaPlatformIcon("Grizzlysms");
    expect(hit?.label).toBe("Grizzlysms");
    expect(hit?.src).toBe("/assets/brand-icons/grizzlysms.png");
  });

  it("maps ElevenLabs to local favicon PNG when synced", () => {
    const hit = resolveTwofaPlatformIcon("ElevenLabs");
    expect(hit?.label).toBe("ElevenLabs");
    expect(hit?.src).toMatch(/elevenlabs/);
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
    expect(resolveTwofaPlatformIcon("Github")?.src).toBe("/assets/brand-icons/github.png");
  });

  it("maps Acc Weibo and Acc Douyin to local brand icons", () => {
    expect(resolveTwofaPlatformIcon("Acc Weibo")?.src).toBe("/assets/brand-icons/weibo.png");
    expect(resolveTwofaPlatformIcon("Acc Douyin")?.src).toBe("/assets/brand-icons/douyin.png");
  });

  it("returns null for unknown platform", () => {
    expect(resolveTwofaPlatformIcon("UnknownPlatformXYZ")).toBeNull();
  });
});
