import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MEEPLE_RELATED_MODELS } from "@/lib/members/data-export";

/**
 * Guards the Art.-15 export against silent incompleteness: the export is not
 * covered by a normal unit test, because adding a new meeple-related model
 * leaves every existing test green while the export quietly stops being
 * complete. Only a check against the schema itself catches that.
 */
const SCHEMA = fs.readFileSync(
  path.join(process.cwd(), "prisma", "schema.prisma"),
  "utf-8",
);

type ParsedModel = { name: string; body: string };

function parseModels(schema: string): ParsedModel[] {
  const models: ParsedModel[] = [];
  const pattern = /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
  for (const match of schema.matchAll(pattern)) {
    models.push({ name: match[1], body: match[2] });
  }
  return models;
}

/** A model stores data about a Meeple if it relates to one or carries a meeple foreign key. */
function referencesMeeple({ name, body }: ParsedModel) {
  if (name === "Meeple") return true;
  const hasMeepleRelation = /^\s*\w+\s+Meeple(\?|\[\])?\s/m.test(body);
  const hasMeepleForeignKey = /^\s*\w*[Mm]eepleId\s/m.test(body);
  return hasMeepleRelation || hasMeepleForeignKey;
}

const models = parseModels(SCHEMA);
const meepleRelatedInSchema = models
  .filter(referencesMeeple)
  .map((model) => model.name);

describe("data export schema coverage", () => {
  it("parses the schema at all — guards the regex, not the export", () => {
    expect(models.length).toBeGreaterThan(20);
    expect(models.map((m) => m.name)).toContain("Meeple");
  });

  it("recognises meeple references via relation and via foreign key", () => {
    // LfgParticipant has both; Post has neither.
    expect(meepleRelatedInSchema).toContain("LfgParticipant");
    expect(meepleRelatedInSchema).not.toContain("Post");
  });

  it("covers every meeple-related model in the schema", () => {
    const missing = meepleRelatedInSchema.filter(
      (model) => !(MEEPLE_RELATED_MODELS as readonly string[]).includes(model),
    );

    expect(
      missing,
      `Diese Modelle speichern Daten zu einem Meeple, fehlen aber im Datenexport (src/lib/members/data-export.ts): ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("lists no model that the schema does not know", () => {
    const schemaModelNames = models.map((model) => model.name);
    const unknown = MEEPLE_RELATED_MODELS.filter(
      (model) => !schemaModelNames.includes(model),
    );

    expect(unknown).toEqual([]);
  });
});
