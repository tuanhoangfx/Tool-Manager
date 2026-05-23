const { spawn } = require("node:child_process");
const path = require("node:path");
const http = require("node:http");

const root = path.resolve(__dirname, "..");
const launcherScript = path.join(__dirname, "local-tool-launcher.cjs");
const LAUNCHER_PORT = 5190;
const VITE_PORT = 5177;
const VITE_URL = `http://127.0.0.1:${VITE_PORT}/`;

function probe(url, timeoutMs = 800) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode != null && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function waitForHealth(maxMs = 12000) {
  const started = Date.now();
  return new Promise((resolve) => {
    const tick = async () => {
      if (await probe(`http://127.0.0.1:${LAUNCHER_PORT}/health`)) return resolve(true);
      if (Date.now() - started > maxMs) return resolve(false);
      setTimeout(tick, 400);
    };
    tick();
  });
}

async function main() {
  const alreadyUp = await probe(VITE_URL);
  if (alreadyUp) {
    console.log(`\n  P0020 Hub đã chạy → ${VITE_URL}`);
    console.log("  (Không khởi động thêm Vite — tránh trùng cổng.)\n");
    console.log("  Dừng server cũ: tìm terminal đang chạy dev và nhấn Ctrl+C.\n");
    process.stdin.resume();
    process.on("SIGINT", () => process.exit(0));
    return;
  }

  console.log("\n  P0020 Tool Manager — launcher + Vite");
  console.log(`  UI: ${VITE_URL}`);
  console.log("  (Giống P0008: dùng Cursor Launch / Run → p0020-dev để tích hợp Simple Browser.)\n");

  const launcher = spawn(process.execPath, [launcherScript], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    detached: process.platform === "win32",
  });

  if (process.platform === "win32") {
    launcher.unref();
  }

  const ready = await waitForHealth();
  if (ready) {
    console.log(`  Launcher ready → http://127.0.0.1:${LAUNCHER_PORT}/\n`);
  } else {
    console.warn("  Launcher chưa phản hồi — vẫn chạy Vite.\n");
  }

  const vite = spawn(
    "corepack",
    ["pnpm", "exec", "vite", "--host", "127.0.0.1", "--port", String(VITE_PORT)],
    {
      cwd: root,
      stdio: "inherit",
      shell: process.platform === "win32",
      env: process.env,
    },
  );

  const shutdown = () => {
    try {
      vite.kill();
    } catch {
      /* ignore */
    }
    try {
      launcher.kill();
    } catch {
      /* ignore */
    }
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  vite.on("exit", (code) => {
    try {
      launcher.kill();
    } catch {
      /* ignore */
    }
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
