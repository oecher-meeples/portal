import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

type LicensePackage = {
  name: string;
  versions: string[];
  license: string;
  author?: string;
  homepage?: string;
};

type LicenseReport = Record<string, LicensePackage[]>;

const OUTPUT_PATH = path.join(process.cwd(), "THIRD-PARTY-LICENSES.md");
/** Served statically at /THIRD-PARTY-LICENSES.md so /rechtliches can link to it without duplicating the 500+ entries as legal-doc content. */
const PUBLIC_OUTPUT_PATH = path.join(
  process.cwd(),
  "public",
  "THIRD-PARTY-LICENSES.md",
);

/** Licenses that require attribution beyond the permissive MIT/BSD/ISC norm — see docs/compliance findings M-1/M-3. */
const ATTRIBUTION_REQUIRED_PATTERN = /MPL|LGPL|CC-BY/i;

function loadReport(): LicenseReport {
  const raw = execSync("pnpm licenses list --prod --json", {
    encoding: "utf-8",
  });
  return JSON.parse(raw);
}

function formatPackageLine(pkg: LicensePackage) {
  const version = pkg.versions.join(", ");
  const link = pkg.homepage ? ` — ${pkg.homepage}` : "";
  return `- \`${pkg.name}@${version}\`${link}`;
}

function renderSection(license: string, packages: LicensePackage[]) {
  const lines = [...packages]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(formatPackageLine);
  return [`### ${license}`, "", ...lines].join("\n");
}

function render(report: LicenseReport) {
  const entries = Object.entries(report);
  const flagged = entries.filter(([license]) =>
    ATTRIBUTION_REQUIRED_PATTERN.test(license),
  );
  const rest = entries.filter(
    ([license]) => !ATTRIBUTION_REQUIRED_PATTERN.test(license),
  );
  const totalPackages = entries.reduce(
    (sum, [, packages]) => sum + packages.length,
    0,
  );

  const header = [
    "# Third-Party Licenses",
    "",
    `Automatisch erzeugt aus \`pnpm licenses list --prod\` (${totalPackages} Production-Pakete). Nicht von Hand bearbeiten — mit \`pnpm run licenses:generate\` neu erzeugen, wenn sich die Dependencies ändern.`,
    "",
  ].join("\n");

  const flaggedSection = [
    "## Prüfpflichtige Lizenzen",
    "",
    "Diese Lizenzen verlangen mehr als die reine Namensnennung, die MIT/BSD/ISC ohnehin mit sich bringen — MPL-2.0 und LGPL verlangen bei Weitergabe des (ggf. veränderten) Codes die Quelloffenlegung dieser Bibliothek, CC-BY verlangt ausdrückliche Urhebernennung. Diese Anwendung nutzt die betroffenen Pakete unverändert (MPL/LGPL) bzw. nennt den Urheber hier (CC-BY).",
    "",
    ...flagged.map(([license, packages]) => renderSection(license, packages)),
  ].join("\n\n");

  const restSection = [
    "## Übrige Lizenzen",
    "",
    ...rest.map(([license, packages]) => renderSection(license, packages)),
  ].join("\n\n");

  return [header, flaggedSection, restSection, ""].join("\n\n");
}

const report = loadReport();
const markdown = render(report);
fs.writeFileSync(OUTPUT_PATH, markdown);
fs.writeFileSync(PUBLIC_OUTPUT_PATH, markdown);
execSync(
  `npx prettier --write ${JSON.stringify(OUTPUT_PATH)} ${JSON.stringify(PUBLIC_OUTPUT_PATH)}`,
  { stdio: "ignore" },
);
console.log(`THIRD-PARTY-LICENSES.md aktualisiert (${OUTPUT_PATH}).`);
