import { createToolSessionCache, type ToolSessionSnapshot } from "@tool-workspace/hub-identity";

export type TwofaSessionSnapshot = ToolSessionSnapshot;

const twofaSession = createToolSessionCache({
  storageKey: "p0020:twofa-session-v2",
  eventName: "p0020:twofa-session",
  legacySessionStorageKeys: ["p0020:twofa-session-v1"],
});

export const cacheTwofaSession = twofaSession.cache;
export const readTwofaSession = twofaSession.read;
export const clearTwofaSession = twofaSession.clear;
export const sessionFromTwofaSnapshot = twofaSession.sessionFromSnapshot;
export const getTwofaAccessToken = twofaSession.getAccessToken;
