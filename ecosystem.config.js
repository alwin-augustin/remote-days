module.exports = {
  apps: [
    {
      name: "tracker-api",
      script: "./dist/apps/api/src/server.js",
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
