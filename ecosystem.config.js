module.exports = {
  apps: [
    {
      name: "remotedays-api",
      script: "apps/api/dist/server.js",
      cwd: "/home/ec2-user/remote-days",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      kill_timeout: 35000, // Allow in-flight requests (30s timeout) to finish before kill

      // Logging Configuration
      output: "/home/ec2-user/remote-days/logs/app-out.log",
      error: "/home/ec2-user/remote-days/logs/app-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,

      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
