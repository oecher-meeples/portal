import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";
import noServerOnlyInClient from "./eslint-rules/no-server-only-in-client.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dirsIn = (relativePath) =>
  fs
    .readdirSync(path.join(__dirname, relativePath), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

/**
 * Layer order, lowest first. A layer may only import from layers *below* it,
 * never sideways or upwards — see docs/project-structure.md.
 */
const LAYERS = ["ui", "entities", "widgets", "feature", "layout"];

const layerZones = LAYERS.flatMap((layer, index) => {
  const forbidden = LAYERS.slice(index + 1);
  if (forbidden.length === 0) return [];
  return [
    {
      target: `./src/components/${layer}/**/*`,
      from: forbidden.map((other) => `./src/components/${other}/**/*`),
      message: `Schichtverstoß: components/${layer} darf nicht aus ${forbidden
        .map((f) => `components/${f}`)
        .join(", ")} importieren. Erlaubt ist nur die Richtung ${LAYERS.join(
        " → ",
      )} (siehe docs/project-structure.md).`,
    },
  ];
});

// One zone per feature folder: features are siblings and must not know each
// other. Generated from the filesystem so new features are covered automatically.
const featureFolders = dirsIn("src/components/feature");
const featureIsolationZones = featureFolders.map((folder) => ({
  target: `./src/components/feature/${folder}/**/*`,
  from: featureFolders
    .filter((other) => other !== folder)
    .map((other) => `./src/components/feature/${other}/**/*`),
  message:
    "Features dürfen nicht direkt aus anderen Feature-Ordnern importieren. Geteilter Code gehört nach components/widgets, components/entities, components/ui oder src/lib (siehe docs/project-structure.md).",
}));

// src/lib/utils is the one fachfrei (domain-blind) lib folder — cn(), format(),
// nav-config — and stays importable from components/ui. Every other
// src/lib/<domain> folder is the DDD domain layer and is off-limits there.
const libDomainFolders = dirsIn("src/lib").filter((name) => name !== "utils");

const eslintConfig = defineConfig([
  ...nextCoreWebVitals,
  ...nextTypescript,
  eslintConfigPrettier,
  {
    plugins: {
      local: { rules: { "no-server-only-in-client": noServerOnlyInClient } },
    },
    rules: {
      "local/no-server-only-in-client": "error",
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            ...layerZones,
            ...featureIsolationZones,
            {
              target: "./src/components/ui/**/*",
              from: libDomainFolders.map(
                (folder) => `./src/lib/${folder}/**/*`,
              ),
              message:
                "components/ui muss fachlich blind bleiben: keine Domänenlogik aus src/lib/<domäne> (siehe docs/project-structure.md).",
            },
            {
              target: "./src/lib/**/*",
              from: ["./src/components/**/*"],
              message:
                "src/lib ist der Domain-Layer und darf nichts aus der UI-Schicht importieren (siehe docs/project-structure.md).",
            },
          ],
        },
      ],
      // Wartungsregel 3 aus docs/project-structure.md. Blank lines und
      // Kommentare zählen nicht mit, damit gute Dokumentation nicht bestraft wird.
      "max-lines": [
        "error",
        { max: 400, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    // #41: `vercel build`/`vercel dev` legen hier generierte Function-Bundles
    // ab (u. a. eine Kopie von `.next/server` je Route) — ohne diesen Eintrag
    // zieht ESLints Standard-Glob sie mit ein und landet außerhalb jedes
    // `files:`-Blocks, in dem das `import`-Plugin registriert ist.
    ".vercel/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
