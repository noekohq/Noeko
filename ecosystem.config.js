module.exports = {
  apps: [
    {
      name: "qwest-prod", // The name of your application in PM2
      script: "bun", // The executable to run
      args: "run server", // Arguments passed to the executable
      cwd: "./", // Current working directory for the script (usually your project root)
      instances: 1, // Number of instances to run (1 for a single server)
      autorestart: true, // Automatically restart if it crashes
      watch: false, // Set to true if you want PM2 to watch for file changes and restart (usually false for production)
      max_memory_restart: "1G", // Restart if memory usage exceeds 1GB
      env: {
        NODE_ENV: "production", // Environment variables
        // Add any other production environment variables here
      },
      env_production: {
        NODE_ENV: "production",
        // Specific production variables if different
      },
    },
  ],
};
