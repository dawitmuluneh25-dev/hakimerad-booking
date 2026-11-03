import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Plain Vite: TanStack Start's own plugin handles SSR, server functions and the
// route tree. No platform preset and no hosted build service is involved.
export default defineConfig({
  server: { port: 5173 },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
});
