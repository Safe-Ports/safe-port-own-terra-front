import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/*.test.{js,jsx}"],
    clearMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/services/**", "src/errors/**", "src/hooks/**", "src/components/**", "src/pages/**"],
      exclude: ["src/services/api.js"],
    },
    env: {
      VITE_API_URL: "http://127.0.0.1:8000/api/v1",
    },
  },
});
