// PM2 daemon for P0020 Vite dev server (port 5177).
// Start: corepack pnpm daemon:start
// Stop:  corepack pnpm daemon:stop
// Logs:  pm2 logs p0020-dev
module.exports = {
  apps: [
    {
      name: "p0020-dev",
      cwd: __dirname,
      script: "./node_modules/vite/bin/vite.js",
      args: "--host 127.0.0.1 --port 5177 --strictPort",
      interpreter: "node",
      windowsHide: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 2000,
      max_memory_restart: "800M",
      env: { NODE_ENV: "development" },
      out_file: "./pm2-out.log",
      error_file: "./pm2-err.log",
      merge_logs: true,
      time: true,
    },
  ],
};
