import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const srcAlias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

export default defineConfig({
  resolve: { alias: srcAlias },
  test: {
    passWithNoTests: true,
    restoreMocks: true,
    // The first case in a file opens a fresh SQLite database and migrates it.
    testTimeout: 20_000,
    projects: [
      {
        resolve: { alias: srcAlias },
        test: {
          name: "server",
          environment: "node",
          include: ["src/server/**/*.test.ts"],
        },
      },
      {
        plugins: [react()],
        resolve: { alias: srcAlias },
        test: {
          name: "frontend",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["./src/vitest.setup.ts"],
        },
      },
    ],
  },
});
