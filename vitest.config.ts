import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    // *.live.test.ts hits real third-party APIs and needs credentials — it is
    // not part of the deterministic suite. Run it explicitly: `npm run test:live`.
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.live.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
