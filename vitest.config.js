import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  // Mismo define que vite.config.js: este archivo no lo hereda, y sin él cualquier
  // componente que muestre la versión rompe en tests con "__APP_VERSION__ is not defined".
  define: { __APP_VERSION__: JSON.stringify("test") },
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
