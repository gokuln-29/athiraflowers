// PM2 process file. Runs the app as the unprivileged `athira` user from the `current` release symlink.
// Secrets live in /etc/athira/athira.env (root:athira 640) and are passed with Node's --env-file, never through PM2's dashboard.
module.exports = {
  apps: [
    {
      name: "athira",
      cwd: "/srv/athira/current",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 127.0.0.1",
      node_args: "--env-file=/etc/athira/athira.env",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "700M",
      kill_timeout: 10000,
      listen_timeout: 15000,
      out_file: "/var/log/athira/out.log",
      error_file: "/var/log/athira/error.log",
      time: true,
      env: { NODE_ENV: "production", TZ: "UTC" },
    },
  ],
}
