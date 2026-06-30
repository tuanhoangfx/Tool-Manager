#!/usr/bin/env node
/**
 * MCP stdio server — pricing catalog tools (P0020 Supabase SSOT).
 * Cursor mcp.json: "pricing-catalog" → node scripts/pricing-mcp-server.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { INFI28_PRICING_CATALOG_ID } from "./lib/pricing-sheet-ingest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnv() {
  const env = { ...process.env };
  const p = path.resolve(root, "../../.env.shared");
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq > 0) env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
    }
  }
  return env;
}

const env = loadEnv();
const sb = createClient(
  (env.DATABOX_SUPABASE_URL || "").replace(/\/$/, ""),
  env.DATABOX_SUPABASE_SERVICE_ROLE || env.DATABOX_SUPABASE_ANON_KEY || "",
  { auth: { persistSession: false } },
);

const TOOLS = [
  {
    name: "pricing_lookup",
    description: "Lookup product pricing from a catalog by free-text query (platform name, báo giá …).",
    inputSchema: {
      type: "object",
      properties: {
        catalog_id: { type: "string", description: "Catalog id, e.g. infi28-payment" },
        query: { type: "string", description: "User message or platform name" },
      },
      required: ["catalog_id", "query"],
    },
  },
  {
    name: "pricing_list_catalogs",
    description: "List available pricing catalogs (id, label, last_synced_at).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "pricing_list_platforms",
    description: "List platform keys/labels in a catalog.",
    inputSchema: {
      type: "object",
      properties: {
        catalog_id: { type: "string" },
      },
      required: ["catalog_id"],
    },
  },
];

async function runTool(name, args) {
  if (name === "pricing_lookup") {
    const catalogId = String(args.catalog_id ?? INFI28_PRICING_CATALOG_ID);
    const query = String(args.query ?? "");
    const { data, error } = await sb.rpc("pricing_lookup", {
      p_catalog_id: catalogId,
      p_query: query,
    });
    if (error) throw error;
    return data;
  }
  if (name === "pricing_list_catalogs") {
    const { data, error } = await sb.from("pricing_catalogs").select("id, label, last_synced_at, bot_ids").order("id");
    if (error) throw error;
    return data;
  }
  if (name === "pricing_list_platforms") {
    const catalogId = String(args.catalog_id ?? INFI28_PRICING_CATALOG_ID);
    const { data, error } = await sb
      .from("product_pricing")
      .select("platform_key, platform_label, header, sort_order")
      .eq("catalog_id", catalogId)
      .order("sort_order");
    if (error) throw error;
    return data;
  }
  throw new Error(`Unknown tool: ${name}`);
}

function send(msg) {
  process.stdout.write(`${JSON.stringify(msg)}\n`);
}

async function handle(msg) {
  const { id, method, params } = msg;

  if (method === "initialize") {
    send({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "p0020-pricing-catalog", version: "1.0.0" },
      },
    });
    return;
  }

  if (method === "notifications/initialized") return;

  if (method === "tools/list") {
    send({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
    return;
  }

  if (method === "tools/call") {
    try {
      const result = await runTool(params.name, params.arguments ?? {});
      send({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        },
      });
    } catch (e) {
      send({
        jsonrpc: "2.0",
        id,
        result: {
          isError: true,
          content: [{ type: "text", text: String(e?.message ?? e) }],
        },
      });
    }
    return;
  }

  if (id != null) {
    send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
  }
}

let buf = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buf += chunk;
  let idx;
  while ((idx = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    try {
      void handle(JSON.parse(line));
    } catch (e) {
      process.stderr.write(`pricing-mcp parse error: ${e.message}\n`);
    }
  }
});
