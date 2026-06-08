#!/usr/bin/env node
/**
 * Mirror Hub (x1z10 P01) synthetic auth emails → Data Box auth.users.
 * Keeps signInWorkspaceDual JWT mirror aligned after @infix1.io.vn migration.
 *
 * Usage: node scripts/mirror-databox-auth-from-hub.mjs [--dry-run]
 */
import { runMgmtDbQuery } from "../../scripts/lib/supabase-mgmt-query.mjs";

const hubRef = process.env.HUB_PROJECT_REF ?? "fmnrafpzctuhxjaaomzt";
const boxRef = process.env.DATABOX_PROJECT_REF ?? "bklxcjrkhrevdcqjscku";
const dryRun = process.argv.includes("--dry-run");
const syntheticSuffixes = ["@infix1.io.vn", "@id.hub.x1z10.local"];

async function main() {
  const hubUsers = await runMgmtDbQuery(
    hubRef,
    `select lower(u.email) as email,
            lower(split_part(u.email, '@', 1)) as login_id
     from auth.users u
     where lower(u.email) like '%@infix1.io.vn'
        or lower(u.email) like '%@id.hub.x1z10.local'
     order by u.created_at`,
  );

  if (!hubUsers?.length) {
    console.log("No Hub synthetic users found.");
    return;
  }

  console.log(dryRun ? "[DRY RUN]" : "[MIRROR]", hubUsers.length, "Hub user(s) → Data Box", boxRef);

  let updated = 0;
  let created = 0;
  let skipped = 0;
  let missing = 0;

  for (const hub of hubUsers) {
    const loginId = hub.login_id;
    const canonical = `${loginId}@infix1.io.vn`;
    if (!loginId) {
      skipped += 1;
      continue;
    }

    const boxRows = await runMgmtDbQuery(
      boxRef,
      `select id, lower(email) as email
       from auth.users
       where lower(split_part(email, '@', 1)) = '${loginId}'
         and (
           lower(email) like '%@infix1.io.vn'
           or lower(email) like '%@id.hub.x1z10.local'
           or position('@' in email) = 0
         )
       order by created_at
       limit 3`,
    );

    if (!boxRows?.length) {
      console.log("MISSING Data Box user for", loginId, "(Hub:", hub.email, ")");
      missing += 1;
      continue;
    }

    const box = boxRows[0];
    if (box.email === canonical) {
      skipped += 1;
      continue;
    }

    const conflict = await runMgmtDbQuery(
      boxRef,
      `select id from auth.users where lower(email) = '${canonical}' and id <> '${box.id}' limit 1`,
    );
    if (conflict?.length) {
      console.log("SKIP", loginId, "— canonical email taken by another user");
      skipped += 1;
      continue;
    }

    console.log(dryRun ? "WOULD UPDATE" : "UPDATE", box.email, "→", canonical);
    if (!dryRun) {
      await runMgmtDbQuery(
        boxRef,
        `update auth.users
         set email = '${canonical}',
             raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
               || jsonb_build_object('email', '${canonical}')
         where id = '${box.id}'`,
      );
    }
    updated += 1;
  }

  console.log("\nDone.", { updated, created, skipped, missing, dryRun });
  if (missing > 0) {
    console.log("Note: missing users sign up on first Data Box login (authenticateDataBox mirror).");
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
