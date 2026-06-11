import { createToolSessionCache, type ToolSessionSnapshot } from "@tool-workspace/hub-identity";

export type DataBoxSessionSnapshot = ToolSessionSnapshot;

const dataBoxSession = createToolSessionCache({
  storageKey: "p0020:databox-session-v2",
  eventName: "p0020:databox-session",
  legacySessionStorageKeys: ["p0020:databox-session-v1"],
});

export const cacheDataBoxSession = dataBoxSession.cache;
export const readDataBoxSession = dataBoxSession.read;
export const clearDataBoxSession = dataBoxSession.clear;
export const sessionFromDataBoxSnapshot = dataBoxSession.sessionFromSnapshot;
export const getDataBoxAccessToken = dataBoxSession.getAccessToken;
