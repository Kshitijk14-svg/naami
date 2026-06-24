// PM2 process config for the OVH VPS (2 vCPU / 4 GB).
// Runs `next start` in cluster mode — one worker per vCPU = real load balancing.
//
//   pm2 start ecosystem.config.js
//   pm2 save && pm2 startup   # survive reboots
//
// Env is read from the shell / a prod env file you source before starting
// (e.g. `set -a; . ./.env.production; set +a; pm2 start ecosystem.config.js`).
module.exports = {
  apps: [
    {
      name: "naami",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: __dirname,
      instances: 2,
      exec_mode: "cluster",
      max_memory_restart: "700M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
