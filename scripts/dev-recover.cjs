#!/usr/bin/env node
/** Recover P0020 dev server — see Tool/scripts/lib/hub-dev-recover-core.cjs */
const path = require("node:path");
const { recoverHubDevServer } = require("../../scripts/lib/hub-dev-recover-core.cjs");

recoverHubDevServer({
  productCode: "P0020",
  port: 5177,
  root: path.resolve(__dirname, ".."),
  ensureArgs: ["scripts/ensure-dev.cjs", "--recover"],
});
