#!/usr/bin/env node
/**
 * Verify CS00761 share flow: grantee email normalize + member match + accessible routes.
 */
import { runMgmtDbQuery } from "../../scripts/lib/supabase-mgmt-query.mjs";

const boxRef = process.argv[2] || "bklxcjrkhrevdcqjscku";
const loginId = (process.argv[3] || "cs00761").toLowerCase();
const canonicalEmail = `${loginId}@infix1.io.vn`;

console.log(`Verifying cookie share for ${loginId} on ${boxRef}…`);

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
const granteeEmail = grantee[0].email;
console.log("OK: grantee", granteeEmail, granteeId.slice(0, 8) + "…");

const bareMembers = await runMgmtDbQuery(
  boxRef,
  `select count(*)::int as n from public.note_cookie_members
   where grantee_email is not null and position('@' in grantee_email) = 0`,
);
if ((bareMembers?.[0]?.n ?? 0) > 0) {
  console.error("FAIL: bare grantee_email rows remain:", bareMembers[0].n);
  process.exit(1);
}
console.log("OK: no bare grantee emails");

const members = await runMgmtDbQuery(
  boxRef,
  `select m.id, m.note_id, m.grantee_email, m.grantee_user_id, m.can_apply, n.title
   from public.note_cookie_members m
   join public.notes n on n.id = m.note_id
   where lower(coalesce(m.grantee_email, '')) = '${canonicalEmail}'
      or m.grantee_user_id = '${granteeId}'
   order by m.updated_at desc
   limit 10`,
);
if (!members?.length) {
  console.warn("WARN: no note_cookie_members for", loginId, "— share a route first for full E2E");
} else {
  console.log("OK: member rows", members.length);
  for (const m of members) {
    console.log("  -", m.title ?? m.note_id, "| apply:", m.can_apply, "| email:", m.grantee_email);
  }
}

const matchSql = `
select count(*)::int as matched
from public.note_cookie_members m
where (m.expires_at is null or m.expires_at > now())
  and (
    m.grantee_user_id = '${granteeId}'
    or lower(coalesce(m.grantee_email, '')) = '${granteeEmail}'
    or (
      lower(split_part(coalesce(m.grantee_email, ''), '@', 1)) = '${loginId}'
      and split_part(coalesce(m.grantee_email, ''), '@', 1) <> ''
    )
  )`;
const matched = await runMgmtDbQuery(boxRef, matchSql);
console.log("OK: member match predicate rows:", matched?.[0]?.matched ?? 0);

const routes = await runMgmtDbQuery(
  boxRef,
  `select count(distinct m.note_id)::int as shared_routes
   from public.note_cookie_members m
   where m.grantee_user_id = '${granteeId}'
      or lower(coalesce(m.grantee_email, '')) = '${canonicalEmail}'`,
);
console.log("Shared routes count:", routes?.[0]?.shared_routes ?? 0);
console.log("All checks passed.");
