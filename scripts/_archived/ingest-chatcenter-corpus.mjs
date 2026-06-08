#!/usr/bin/env node
/**
 * Ingest P0016 hub.ai_corpus.v1 export → P0020 notes (domain: chatcenter-corpus).
 * Usage: node scripts/ingest-chatcenter-corpus.mjs [--worker=http://127.0.0.1:3921] [--limit=5000]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { fetchHubSmokeToken } from "../../P0016-ChatCenter/scripts/lib/fetch-hub-smoke-token.mjs";
import { runMgmtDbQuery } from "../../scripts/lib/supabase-mgmt-query.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const CORPUS_DOMAIN = "chatcenter-corpus";
const CORPUS_SCHEMA = "hub.ai_corpus.v1";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function parseArgs() {
  const worker =
    process.argv.find((a) => a.startsWith("--worker="))?.split("=")[1] ??
    "http://127.0.0.1:3921";
  const limit = Number(
    process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 5000,
  );
  const dryRun = process.argv.includes("--dry-run");
  return { worker: worker.replace(/\/$/, ""), limit, dryRun };
}

function formatThreadBody(threadId, rows, summary) {
  const header = [
    `# Chat Center thread ${threadId}`,
    summary ? `\n## Summary\n${summary}\n` : "",
    "## Messages",
  ].join("\n");

  const lines = rows.map((r) => {
    const who = r.role === "assistant" ? "Bot" : r.senderName || "User";
    const body =
      r.contentType === "image"
        ? `[Photo${r.mediaRef ? ` ${r.mediaRef}` : ""}]`
        : r.content;
    const ts = r.createdAt ? new Date(r.createdAt).toISOString() : "";
    return `- **${who}** (${ts}): ${body}`;
  });

  return `${header}\n${lines.join("\n")}\n`;
}

async function resolveCorpusUserId(projectRef, serviceKey, url) {
  const explicit = process.env.P0020_CORPUS_USER_ID?.trim();
  if (explicit) return explicit;

  const rows = await runMgmtDbQuery(
    projectRef,
    `select u.id from auth.users u
     join public.profiles p on p.id = u.id
     where lower(p.role) = 'admin'
     order by u.created_at asc
     limit 1`,
  );
  const id = rows?.[0]?.id;
  if (id) return id;

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  const fallback = data?.users?.[0]?.id;
  if (!fallback) throw new Error("No P0020 user for corpus notes — set P0020_CORPUS_USER_ID");
  return fallback;
}

async function fetchCorpus(worker, token, limit) {
  const q = new URLSearchParams({ limit: String(limit) });
  const res = await fetch(`${worker}/api/ai/corpus/export?${q}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`corpus export ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

async function main() {
  const { worker, limit, dryRun } = parseArgs();
  const env = {
    ...loadEnvFile(path.resolve(root, "../../.env.shared")),
    ...loadEnvFile(path.join(root, ".env.local")),
  };

  const url = (env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = (env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !serviceKey) throw new Error("Missing P0020 VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");

  const projectRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? "bklxcjrkhrevdcqjscku";
  const token = await fetchHubSmokeToken();
  const payload = await fetchCorpus(worker, token, limit);

  if (payload.schema !== CORPUS_SCHEMA) {
    throw new Error(`Unexpected schema ${payload.schema} (expected ${CORPUS_SCHEMA})`);
  }

  const byThread = new Map();
  for (const row of payload.rows ?? []) {
    const tid = String(row.threadId);
    const bucket = byThread.get(tid) ?? { rows: [], summary: row.threadSummary ?? null, meta: row };
    bucket.rows.push(row);
    if (row.threadSummary) bucket.summary = row.threadSummary;
    byThread.set(tid, bucket);
  }

  const userId = await resolveCorpusUserId(projectRef, serviceKey, url);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  let notesUpserted = 0;
  let logUpserted = 0;

  for (const [threadId, bucket] of byThread) {
    const title =
      bucket.meta.threadName?.trim() ||
      `ChatCenter ${threadId.slice(0, 12)}${threadId.length > 12 ? "…" : ""}`;
    const slug = `thread-${threadId.replace(/[^a-zA-Z0-9_-]/g, "_")}`.slice(0, 120);
    const body_md = formatThreadBody(threadId, bucket.rows, bucket.summary);

    if (dryRun) {
      notesUpserted += 1;
      continue;
    }

    const { data: existing } = await admin
      .from("notes")
      .select("id")
      .eq("user_id", userId)
      .eq("domain", CORPUS_DOMAIN)
      .eq("slug", slug)
      .maybeSingle();

    let noteId = existing?.id ?? null;
    if (noteId) {
      const { error } = await admin
        .from("notes")
        .update({ title, body_md, updated_at: new Date().toISOString() })
        .eq("id", noteId);
      if (error) throw new Error(`note update ${threadId}: ${error.message}`);
    } else {
      const { data, error } = await admin
        .from("notes")
        .insert({
          user_id: userId,
          title,
          slug,
          domain: CORPUS_DOMAIN,
          body_md,
          sync_status: "synced",
        })
        .select("id")
        .single();
      if (error) throw new Error(`note insert ${threadId}: ${error.message}`);
      noteId = data.id;
    }

    notesUpserted += 1;

    const { error: logErr } = await admin.from("hub_corpus_ingest_log").upsert(
      {
        source: "p0016",
        bot_id: payload.botId ?? "default",
        thread_id: threadId,
        note_id: noteId,
        row_count: bucket.rows.length,
        schema_version: CORPUS_SCHEMA,
        ingested_at: new Date().toISOString(),
      },
      { onConflict: "source,bot_id,thread_id" },
    );
    if (logErr && !/does not exist|hub_corpus_ingest_log/i.test(logErr.message)) {
      console.warn(`ingest log ${threadId}: ${logErr.message}`);
    } else if (!logErr) {
      logUpserted += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun,
        schema: CORPUS_SCHEMA,
        threads: byThread.size,
        messages: payload.exported ?? payload.rows?.length ?? 0,
        notesUpserted,
        logUpserted,
        worker,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
