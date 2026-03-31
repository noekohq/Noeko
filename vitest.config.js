import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@core": path.resolve(__dirname, "./src/core"),
      "@infrastructure": path.resolve(__dirname, "./src/infrastructure"),
      "@domains": path.resolve(__dirname, "./src/domains"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.client.ts"],
    include: ["src/**/*.{test,spec}.{js,ts,jsx,tsx}"],
    env: {
      NODE_ENV: "test",
    },
    envFile: ".env.test",
  },
});
