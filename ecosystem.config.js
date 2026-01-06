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
      env: {
        NODE_ENV: "production",
        // Env vars will be injected by the server environment or .env file
      },
    },
  ],
};
