import crypto from "node:crypto";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { resolveCockpitDataDir } from "./cockpit-quota-import.mjs";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const CLIENT_ID = String(process.env.GEMINI_OAUTH_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID || "").trim();
const CLIENT_SECRET = String(
  process.env.GEMINI_OAUTH_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
).trim();
const CALLBACK_PATH = "/oauth2callback";
const TIMEOUT_SEC = 300;
const SUCCESS_URL = "https://developers.google.com/gemini-code-assist/auth_success_gemini";
const FAILURE_URL = "https://developers.google.com/gemini-code-assist/auth_failure_gemini";
const SCOPES = [
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

const STATE_FILE = "gemini_oauth_pending.json";

/** @type {object | null} */
let pending = null;

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function nowMs() {
  return Date.now();
}

function b64url(bytes) {
  return Buffer.from(bytes).toString("base64url");
}

function randomToken() {
  return b64url(crypto.randomBytes(24));
}

function statePath(dataDir) {
  return path.join(dataDir, STATE_FILE);
}

function persistPending(dataDir) {
  if (!pending) {
    try {
      fs.unlinkSync(statePath(dataDir));
    } catch {
      /* ignore */
    }
    return;
  }
  fs.writeFileSync(statePath(dataDir), JSON.stringify(pending), "utf8");
}

function loadPending(dataDir) {
  if (pending) return pending;
  try {
    const raw = fs.readFileSync(statePath(dataDir), "utf8");
    const parsed = JSON.parse(raw);
    if (parsed.cancelled || nowSec() > parsed.expiresAt) return null;
    pending = parsed;
    return pending;
  } catch {
    return null;
  }
}

function findPort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
}

function buildAuthUrl(callbackUrl, stateToken) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: callbackUrl,
    access_type: "offline",
    scope: SCOPES.join(" "),
    state: stateToken,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function startGeminiOAuth(dataDir = resolveCockpitDataDir()) {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      "Gemini OAuth requires GEMINI_OAUTH_CLIENT_ID and GEMINI_OAUTH_CLIENT_SECRET in the environment.",
    );
  }
  const existing = loadPending(dataDir);
  if (existing && !existing.cancelled && nowSec() < existing.expiresAt) {
    return {
      loginId: existing.loginId,
      verificationUri: existing.authUrl,
      expiresIn: Math.max(0, existing.expiresAt - nowSec()),
      intervalSeconds: 1,
      callbackUrl: existing.callbackUrl,
    };
  }

  pending = null;
  const callbackPort = await findPort();
  const callbackUrl = `http://127.0.0.1:${callbackPort}${CALLBACK_PATH}`;
  const stateToken = randomToken();
  const authUrl = buildAuthUrl(callbackUrl, stateToken);
  const loginId = randomToken();

  pending = {
    loginId,
    callbackPort,
    callbackUrl,
    authUrl,
    stateToken,
    expiresAt: nowSec() + TIMEOUT_SEC,
    cancelled: false,
    manualCode: null,
  };
  persistPending(dataDir);

  return {
    loginId,
    verificationUri: authUrl,
    expiresIn: TIMEOUT_SEC,
    intervalSeconds: 1,
    callbackUrl,
  };
}

export function cancelGeminiOAuth(loginId, dataDir = resolveCockpitDataDir()) {
  loadPending(dataDir);
  if (!pending) return;
  if (!loginId || pending.loginId === loginId) {
    pending.cancelled = true;
    pending = null;
    persistPending(dataDir);
  }
}

function parseJwtClaim(token, key) {
  const part = token.split(".")[1];
  if (!part) return null;
  const padded = part.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (part.length % 4)) % 4);
  try {
    const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    const val = payload[key];
    return typeof val === "string" && val.trim() ? val.trim() : null;
  } catch {
    return null;
  }
}

async function exchangeCode(code, redirectUri) {
  const body = new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function fetchUserInfo(accessToken) {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json();
}

function waitForCallback(loginId, dataDir) {
  return new Promise((resolve, reject) => {
    loadPending(dataDir);
    if (!pending || pending.loginId !== loginId) {
      reject(new Error("Gemini OAuth session not found"));
      return;
    }

    const { callbackPort, stateToken, expiresAt, callbackUrl } = pending;
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://127.0.0.1:${callbackPort}`);
      if (url.pathname !== CALLBACK_PATH) {
        res.writeHead(301, { Location: FAILURE_URL });
        res.end();
        return;
      }
      const error = url.searchParams.get("error");
      if (error) {
        res.writeHead(301, { Location: FAILURE_URL });
        res.end();
        server.close();
        reject(new Error(`Google OAuth error: ${error}`));
        return;
      }
      const state = url.searchParams.get("state");
      if (state !== stateToken) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("State mismatch.");
        server.close();
        reject(new Error("Gemini OAuth state mismatch"));
        return;
      }
      const code = url.searchParams.get("code")?.trim();
      if (!code) {
        res.writeHead(301, { Location: FAILURE_URL });
        res.end();
        server.close();
        reject(new Error("Google OAuth callback missing code"));
        return;
      }
      res.writeHead(301, { Location: SUCCESS_URL });
      res.end();
      server.close();
      resolve({ code, callbackUrl });
    });

    server.listen(callbackPort, "127.0.0.1");

    const timer = setInterval(() => {
      loadPending(dataDir);
      if (!pending || pending.loginId !== loginId) {
        clearInterval(timer);
        server.close();
        reject(new Error("Gemini OAuth cancelled"));
        return;
      }
      if (pending.manualCode) {
        clearInterval(timer);
        server.close();
        resolve({ code: pending.manualCode, callbackUrl });
        return;
      }
      if (nowSec() > expiresAt) {
        clearInterval(timer);
        server.close();
        reject(new Error("Gemini OAuth timed out"));
      }
    }, 1000);
  });
}

export function submitGeminiManualCallback(loginId, callbackInput, dataDir = resolveCockpitDataDir()) {
  loadPending(dataDir);
  if (!pending || pending.loginId !== loginId) throw new Error("Gemini OAuth session not found");
  let code = callbackInput.trim();
  if (code.includes("code=")) {
    try {
      const url = code.startsWith("http") ? new URL(code) : new URL(`http://127.0.0.1${CALLBACK_PATH}?${code.replace(/^\?/, "")}`);
      code = url.searchParams.get("code") ?? code;
    } catch {
      /* use raw */
    }
  }
  if (!code) throw new Error("Callback URL must include code");
  pending.manualCode = code;
  persistPending(dataDir);
}

export async function completeGeminiOAuth(loginId, dataDir = resolveCockpitDataDir()) {
  loadPending(dataDir);
  if (!pending || pending.loginId !== loginId) throw new Error("Gemini OAuth session not found");
  if (pending.cancelled) throw new Error("Gemini OAuth cancelled");
  if (nowSec() > pending.expiresAt) throw new Error("Gemini OAuth expired");

  const { code, callbackUrl } = await waitForCallback(loginId, dataDir);
  const tokens = await exchangeCode(code, callbackUrl);
  const accessToken = tokens.access_token;
  if (!accessToken) throw new Error("Google OAuth missing access_token");

  const userInfo = await fetchUserInfo(accessToken);
  const email =
    userInfo?.email?.trim() ||
    parseJwtClaim(tokens.id_token ?? "", "email") ||
    "unknown@gmail.com";
  const authId = userInfo?.id?.trim() || parseJwtClaim(tokens.id_token ?? "", "sub") || null;
  const name = userInfo?.name?.trim() || parseJwtClaim(tokens.id_token ?? "", "name") || null;
  const expiryDate = tokens.expires_in ? nowMs() + Number(tokens.expires_in) * 1000 : null;

  pending = null;
  persistPending(dataDir);

  const geminiAuthRaw = {
    access_token: accessToken,
    ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
    ...(tokens.id_token ? { id_token: tokens.id_token } : {}),
    ...(tokens.token_type ? { token_type: tokens.token_type } : {}),
    ...(tokens.scope ? { scope: tokens.scope } : {}),
    ...(expiryDate ? { expiry_date: expiryDate } : {}),
    email,
    ...(authId ? { sub: authId } : {}),
  };

  return {
    email,
    auth_id: authId,
    name,
    access_token: accessToken,
    refresh_token: tokens.refresh_token ?? null,
    id_token: tokens.id_token ?? null,
    token_type: tokens.token_type ?? null,
    scope: tokens.scope ?? null,
    expiry_date: expiryDate,
    gemini_auth_raw: geminiAuthRaw,
  };
}
