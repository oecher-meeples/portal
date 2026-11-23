// Bündelt prisma/seed.ts (inkl. @prisma/client + generiertem Client,
// better-auth, src/lib-Imports) zu einer einzigen CJS-Datei für das
// Runner-Image — dort gibt es weder tsx noch src/ noch die Dev-node_modules.
// esbuild ist keine direkte Dependency; es wird über tsx aufgelöst (tsx nutzt
// es selbst), damit keine zweite, ungepinnte esbuild-Version ins Spiel kommt.
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const [, , entry, outfile] = process.argv;
if (!entry || !outfile) {
  console.error("usage: node bundle-seed.mjs <entry.ts> <outfile.cjs>");
  process.exit(1);
}

const tsxDir = realpathSync(path.resolve("node_modules/tsx"));
const esbuild = createRequire(path.join(tsxDir, "package.json"))("esbuild");

esbuild.buildSync({
  entryPoints: [entry],
  outfile,
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  logLevel: "warning",
});
console.log(`seed bundle written to ${outfile}`);
