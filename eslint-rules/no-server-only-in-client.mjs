import fs from "node:fs";
import path from "node:path";

const SERVER_ONLY_IMPORT = /^\s*import\s+["']server-only["'];?/m;

function hasUseClientDirective(programNode) {
  return programNode.body.some(
    (node) =>
      node.type === "ExpressionStatement" &&
      node.expression.type === "Literal" &&
      node.expression.value === "use client",
  );
}

/** Resolves relative and `@/`-aliased import sources to a file on disk. Bare
 * package imports (e.g. "react") are left alone — never ours to check. */
function resolveImportPath(sourceValue, currentFilename, projectRoot) {
  let resolved;
  if (sourceValue.startsWith(".")) {
    resolved = path.resolve(path.dirname(currentFilename), sourceValue);
  } else if (sourceValue.startsWith("@/")) {
    resolved = path.resolve(projectRoot, "src", sourceValue.slice(2));
  } else {
    return null;
  }

  const candidates = [
    resolved,
    `${resolved}.ts`,
    `${resolved}.tsx`,
    path.join(resolved, "index.ts"),
    path.join(resolved, "index.tsx"),
  ];
  return (
    candidates.find(
      (candidate) =>
        fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
    ) ?? null
  );
}

/**
 * Catches the exact bug behind admin/mitglieder's "Fehlende Umgebungsvariable"
 * runtime crash (2026-08-17): a "use client" component imported a pure helper
 * from a domain module that also top-level-imported server-only code (Prisma,
 * @/lib/auth/server). Turbopack bundled the whole module — env access and all
 * — into the browser, which threw at runtime instead of failing the build.
 *
 * Only checks direct imports, one level deep. Deeper transitive chains are
 * still caught by Next.js's own build-time handling of the `server-only`
 * package — this rule exists to surface the mistake at edit time instead.
 */
/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        'Verhindert, dass "use client"-Dateien direkt aus einem mit `import "server-only"` markierten Modul importieren.',
    },
    schema: [],
    messages: {
      serverOnlyInClient:
        '"{{source}}" ist mit `import "server-only"` markiert und darf nicht aus einer "use client"-Datei importiert werden. Client-taugliche Exports (reine Funktionen, Typen) in ein eigenes Modul ohne server-only-Guard auslagern (siehe src/lib/members/membership-state.ts als Vorbild).',
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    let isClientFile = false;

    return {
      Program(node) {
        isClientFile = hasUseClientDirective(node);
      },
      ImportDeclaration(node) {
        if (!isClientFile) return;
        // `import type { X }` (and `import { type X }` for every specifier) is
        // erased before bundling — it can never pull server-only code into the
        // client bundle, so it's exempt.
        if (node.importKind === "type") return;
        if (
          node.specifiers.length > 0 &&
          node.specifiers.every((specifier) => specifier.importKind === "type")
        ) {
          return;
        }

        const sourceValue = node.source.value;
        const resolved = resolveImportPath(
          sourceValue,
          filename,
          process.cwd(),
        );
        if (!resolved) return;

        let contents;
        try {
          contents = fs.readFileSync(resolved, "utf8");
        } catch {
          return;
        }

        if (SERVER_ONLY_IMPORT.test(contents)) {
          context.report({
            node,
            messageId: "serverOnlyInClient",
            data: { source: sourceValue },
          });
        }
      },
    };
  },
};

export default rule;
