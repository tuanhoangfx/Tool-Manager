import { ensureStealthBrowserReady } from "./ensure-stealth-browser.mjs";
import { startCursorOAuth, completeCursorOAuth, cancelCursorOAuth } from "./cursor-oauth.mjs";
import { startGeminiOAuth, completeGeminiOAuth, cancelGeminiOAuth } from "./gemini-oauth.mjs";
import { upsertCockpitCursorAccount, refreshCockpitCursorAccount } from "./cockpit-cursor-store.mjs";
import { upsertCockpitGeminiAccount } from "./cockpit-gemini-store.mjs";

const DEFAULT_PROFILES = ["0012", "0021", "0069"];

async function loadStealthClient() {
  return import("../../../scripts/lib/stealth-browser-client.mjs");
}

async function resolveProfile(profileName) {
  const { listStealthProfiles, findStealthProfileByName, launchStealthProfile } = await loadStealthClient();
  const profiles = await listStealthProfiles();
  const profile = findStealthProfileByName(profiles, profileName);
  if (!profile) {
    throw new Error(
      `Stealth profile "${profileName}" not found. Available: ${profiles.map((p) => p.name).join(", ") || "none"}`,
    );
  }
  try {
    await launchStealthProfile(profile.id);
  } catch {
    /* already running */
  }
  return profile;
}

/**
 * Cockpit-style OAuth start — opens verification URL inside P0003 profile (fast return).
 */
export async function startStealthQuotaEnroll(platform, profileName = "0069") {
  const name = String(profileName).trim() || "0069";
  if (!DEFAULT_PROFILES.includes(name)) {
    throw new Error(`Profile must be one of ${DEFAULT_PROFILES.join(", ")}`);
  }

  await ensureStealthBrowserReady();
  const profile = await resolveProfile(name);
  const { openStealthUrl } = await loadStealthClient();

  if (platform === "cursor") {
    const start = startCursorOAuth();
    await openStealthUrl({
      profileId: profile.id,
      profileName: name,
      targetUrl: start.verificationUri,
      closeWhenDone: false,
    });
    return {
      platform,
      profileName: name,
      loginId: start.loginId,
      verificationUri: start.verificationUri,
      expiresIn: start.expiresIn,
      intervalSeconds: start.intervalSeconds,
    };
  }

  if (platform === "gemini") {
    const start = await startGeminiOAuth();
    await openStealthUrl({
      profileId: profile.id,
      profileName: name,
      targetUrl: start.verificationUri,
      closeWhenDone: false,
    });
    return {
      platform,
      profileName: name,
      loginId: start.loginId,
      verificationUri: start.verificationUri,
      callbackUrl: start.callbackUrl,
      expiresIn: start.expiresIn,
      intervalSeconds: start.intervalSeconds,
    };
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

async function enrollFromOAuthPayload(platform, oauthPayload, enrollFn) {
  if (platform === "cursor") {
    let account = upsertCockpitCursorAccount(oauthPayload);
    account = await refreshCockpitCursorAccount(account);
    return enrollFn("cursor", account);
  }
  if (platform === "gemini") {
    const account = upsertCockpitGeminiAccount(oauthPayload);
    return enrollFn("gemini", account);
  }
  throw new Error(`Unsupported platform: ${platform}`);
}

/** Short server-side poll slice — client calls repeatedly (non-blocking UX). */
export async function pollStealthQuotaEnroll(platform, loginId, enrollFn, { maxPolls = 1 } = {}) {
  if (platform === "cursor") {
    try {
      const oauthPayload = await completeCursorOAuth(loginId, { maxPolls, keepPendingOnWait: true });
      return enrollFromOAuthPayload(platform, oauthPayload, enrollFn);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/still waiting/i.test(msg)) return null;
      throw err;
    }
  }

  if (platform === "gemini") {
    try {
      const oauthPayload = await Promise.race([
        completeGeminiOAuth(loginId),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Gemini OAuth still waiting")), 12_000)),
      ]);
      return enrollFromOAuthPayload(platform, oauthPayload, enrollFn);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/still waiting|timeout/i.test(msg)) return null;
      throw err;
    }
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

export function cancelStealthQuotaEnroll(platform, loginId) {
  if (platform === "cursor") cancelCursorOAuth(loginId);
  else if (platform === "gemini") cancelGeminiOAuth(loginId);
}
