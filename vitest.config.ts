import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    // *.live.test.ts hits real third-party APIs and needs credentials — it is
    // not part of the deterministic suite. Run it explicitly: `npm run test:live`
    // (sets VITEST_LIVE=1, which lifts this exclusion below).
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      // Isolated git worktrees the Agent tool creates under .claude/worktrees/
      // for parallel subagent work — each has its own node_modules, whose
      // version drift breaks tests when Vitest's default glob picks them up.
      "**/.claude/worktrees/**",
      ...(process.env.VITEST_LIVE ? [] : ["**/*.live.test.ts"]),
    ],
    coverage: {
      provider: "v8",
      // Scope per docs/project-structure.md: the domain layer and server
      // actions carry the business rules worth guarding with a threshold.
      // Everything else (UI components, routes) is deliberately excluded —
      // that is a scope decision, not a gap.
      include: ["src/lib/**", "src/components/**/actions.ts"],
      exclude: [
        "src/lib/__mocks__/**",
        "**/*.d.ts",
        "src/lib/utils/nav-config.ts",
        "src/lib/utils/cn.ts",
      ],
      // Derived from the measured baseline (see #38): Statements 86.71,
      // Branches 83.39, Functions 88.33, Lines 87.02 — rounded down to the
      // nearest ten, so today's suite passes and a real regression trips it.
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Vitest runs in plain Node, so it never sets the "react-server" export
      // condition Next.js's RSC bundler uses to resolve `server-only` to a
      // no-op. Without this alias it resolves to the throwing default export
      // instead, breaking every test that transitively imports a
      // server-only-marked module.
      "server-only": path.resolve(
        __dirname,
        "node_modules/server-only/empty.js",
      ),
    },
  },
});
