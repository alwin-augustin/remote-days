module.exports = {
  apps: [
    {
      name: "remotedays-api",
      script: "server.js",
      cwd: "/home/ec2-user/remote-days",
      instances: 1, // Or "max" to use all CPUs
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",

      // Logging Configuration
      output: "/home/ec2-user/remote-days/logs/app-out.log",
      error: "/home/ec2-user/remote-days/logs/app-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,

      // Log rotation (requires pm2-logrotate module)
      // Install: pm2 install pm2-logrotate
      // Configure: pm2 set pm2-logrotate:max_size 10M
      //           pm2 set pm2-logrotate:retain 7
      //           pm2 set pm2-logrotate:compress true

      env: {
        NODE_ENV: "production",
        // Env vars will be injected by the server environment or .env file
      },
    },
  ],
};
