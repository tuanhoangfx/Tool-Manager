import crypto from "node:crypto";

const CURSOR_LOGIN_URL = "https://cursor.com/loginDeepControl";
const CURSOR_POLL_ENDPOINT = "https://api2.cursor.sh/auth/poll";
const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 150;

/** @type {import("./cursor-oauth.mjs").PendingOAuthState | null} */
let pending = null;

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function b64url(buf) {
  return buf.toString("base64url");
}

function sha256B64url(value) {
  return b64url(crypto.createHash("sha256").update(value).digest());
}

function randomToken(bytes = 32) {
  return b64url(crypto.randomBytes(bytes));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function startCursorOAuth() {
  const codeVerifier = randomToken(32);
  const codeChallenge = sha256B64url(codeVerifier);
  const loginUuid = crypto.randomUUID();
  const verificationUri = `${CURSOR_LOGIN_URL}?challenge=${codeChallenge}&uuid=${loginUuid}&mode=login`;

  pending = {
    loginId: loginUuid,
    uuid: loginUuid,
    codeVerifier,
    expiresAt: nowSec() + 300,
    cancelled: false,
  };

  return {
    loginId: loginUuid,
    verificationUri,
    expiresIn: 300,
    intervalSeconds: 2,
  };
}

export function cancelCursorOAuth(loginId) {
  if (!pending) return;
  if (!loginId || pending.loginId === loginId) {
    pending.cancelled = true;
    pending = null;
  }
}

export async function completeCursorOAuth(loginId, { maxPolls = MAX_POLLS, keepPendingOnWait = false } = {}) {
  if (!pending) throw new Error("No active Cursor OAuth session");
  if (pending.loginId !== loginId) throw new Error(`login_id mismatch: expected ${pending.loginId}`);
  if (pending.cancelled) throw new Error("Login cancelled");
  if (nowSec() > pending.expiresAt) throw new Error("Login session expired");

  const { uuid, codeVerifier } = pending;
  const pollUrl = `${CURSOR_POLL_ENDPOINT}?uuid=${encodeURIComponent(uuid)}&verifier=${encodeURIComponent(codeVerifier)}`;
  const attempts = Math.min(Math.max(1, maxPolls), MAX_POLLS);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (!pending || pending.cancelled) throw new Error("Login cancelled");
    if (nowSec() > pending.expiresAt) throw new Error("Login session expired");

    try {
      const res = await fetch(pollUrl, { headers: { Accept: "application/json" } });
      if (res.status === 404) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }
      if (!res.ok) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      const pollData = await res.json();
      const accessToken = pollData.accessToken ?? pollData.access_token;
      const refreshToken = pollData.refreshToken ?? pollData.refresh_token;
      const authId = pollData.authId ?? pollData.auth_id ?? null;

      if (accessToken && refreshToken) {
        pending = null;
        const email =
          typeof authId === "string" && authId.includes("@") ? authId : "";
        const cursorAuthRaw = {
          accessToken,
          refreshToken,
          ...(authId ? { authId } : {}),
        };
        return {
          email,
          auth_id: authId,
          access_token: accessToken,
          refresh_token: refreshToken,
          cursor_auth_raw: cursorAuthRaw,
        };
      }
    } catch {
      await sleep(POLL_INTERVAL_MS * 2);
      continue;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  if (keepPendingOnWait || attempts < MAX_POLLS) {
    throw new Error("Cursor OAuth still waiting");
  }

  pending = null;
  throw new Error("Cursor OAuth polling timed out — try again");
}
