#!/usr/bin/env node
/**
 * E2E: CS00761 sees shared Cookie route as member (not owner).
 *
 * Layers:
 *  1. SQL member rows (verify-cookie-share-cs00761)
 *  2. RPC note_cookie_routes_accessible_v2 as grantee (JWT impersonation)
 *  3. Optional live sign-in when COOKIE_E2E_MEMBER_PASSWORD or argv password is set
 *
 * Usage:
 *   node scripts/e2e-cookie-member-cs00761.mjs [boxRef] [loginId] [password]
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { runMgmtDbQuery } from "../../scripts/lib/supabase-mgmt-query.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sharedEnv = resolve(root, "../../.env.shared");
const localEnv = resolve(root, ".env.local");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1).trim();
  }
}

loadEnvFile(sharedEnv);
loadEnvFile(localEnv);

const boxRef = process.argv[2] || "bklxcjrkhrevdcqjscku";
const loginId = (process.argv[3] || "cs00761").toLowerCase();
const password = process.argv[4] || process.env.COOKIE_E2E_MEMBER_PASSWORD || "";
const canonicalEmail = `${loginId}@infix1.io.vn`;

const boxUrl = process.env.DATABOX_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const boxAnon = process.env.DATABOX_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
console.log(`E2E cookie member ${loginId} on ${boxRef}…`);

const grantee = await runMgmtDbQuery(
  boxRef,
  `select id, lower(email) as email from auth.users
   where lower(email) = '${canonicalEmail}'
      or lower(split_part(email, '@', 1)) = '${loginId}'
   limit 1`,
);
if (!grantee?.length) {
  console.error("FAIL: no auth.users for", loginId);
  process.exit(1);
}
const granteeId = grantee[0].id;
console.log("OK: grantee", grantee[0].email);

/** Same member branch as note_cookie_routes_accessible_v2 (mgmt API cannot set auth.uid()). */
const routesSql = `
select
  coalesce(nullif(trim(n.title), ''), nullif(trim(r.note_title), '')) as note_title,
  r.domain,
  'member'::text as access_role,
  m.can_apply,
  m.can_manage
from public.note_cookie_members m
join public.cookie_bridge_routes r
  on r.note_id = m.note_id
 and r.user_id = m.owner_user_id
 and r.enabled is true
left join public.notes n on n.id = r.note_id
where (m.expires_at is null or m.expires_at > now())
  and m.can_apply is true
  and (
    m.grantee_user_id = '${granteeId}'
    or lower(coalesce(m.grantee_email, '')) = '${canonicalEmail}'
  )
order by r.updated_at desc`;
const routes = await runMgmtDbQuery(boxRef, routesSql);

if (!routes?.length) {
  console.error("FAIL: no shared member routes for", loginId);
  process.exit(1);
}

console.log("OK: accessible member routes", routes.length);
for (const r of routes) {
  console.log("  -", r.note_title ?? r.domain, "|", r.domain, "| apply:", r.can_apply);
}

const cursor = routes.find((r) => String(r.domain ?? "").includes("cursor.com"));
if (!cursor) {
  console.warn("WARN: no .cursor.com route in member list — share may point elsewhere");
} else {
  console.log("OK: shared Cursor route visible:", cursor.note_title ?? cursor.domain);
}

const boxServiceRole = process.env.DATABOX_SUPABASE_SERVICE_ROLE;

async function liveRpcAsGrantee() {
  if (!boxUrl || !boxAnon) return false;
  const box = createClient(boxUrl, boxAnon);

  if (password) {
    const emails = [canonicalEmail, `${loginId}@id.hub.x1z10.local`];
    for (const email of emails) {
      const { data, error } = await box.auth.signInWithPassword({ email, password });
      if (!error && data.session) {
        console.log("OK: Data Box sign-in", data.session.user.email);
        const rpc = await box.rpc("note_cookie_routes_accessible_v2");
        if (rpc.error) throw new Error(rpc.error.message);
        const liveMember = (rpc.data ?? []).filter((r) => r.access_role === "member");
        if (!liveMember.length) throw new Error("live RPC returned no member routes");
        console.log("OK: live RPC member routes", liveMember.length);
        return true;
      }
    }
    throw new Error("Data Box sign-in failed");
  }

  if (!boxServiceRole) return false;
  const admin = createClient(boxUrl, boxServiceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: canonicalEmail,
  });
  if (link.error || !link.data?.properties?.hashed_token) {
    throw new Error(link.error?.message ?? "generateLink missing hashed_token");
  }
  const otp = await box.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.data.properties.hashed_token,
  });
  if (otp.error || !otp.data.session) {
    throw new Error(otp.error?.message ?? "verifyOtp failed");
  }
  console.log("OK: magic-link session", otp.data.session.user.email);
  const rpc = await box.rpc("note_cookie_routes_accessible_v2");
  if (rpc.error) throw new Error(rpc.error.message);
  const liveMember = (rpc.data ?? []).filter((r) => r.access_role === "member");
  if (!liveMember.length) throw new Error("live RPC returned no member routes");
  console.log("OK: live RPC member routes", liveMember.length);
  for (const r of liveMember) {
    console.log("  live:", r.note_title ?? r.domain, "|", r.domain);
  }
  return true;
}

try {
  const ran = await liveRpcAsGrantee();
  if (!ran) console.log("SKIP: live RPC (no service role / anon config)");
} catch (e) {
  console.error("FAIL: live RPC:", e.message ?? e);
  process.exit(1);
}

console.log("E2E passed.");
