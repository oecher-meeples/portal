import fs from "node:fs";
import path from "node:path";
import {
  GameCopyCheckResult,
  GameInventoryStatus,
  HoldingOrigin,
  RuleBookLanguage,
  StorageUnitKind,
} from "@prisma/client";
import { prisma } from "../src/lib/utils/prisma";
import { slugify } from "../src/lib/utils/slug";
import { nextUnitCode } from "../src/lib/inventory/codes";
import { findOrCreateBoardGameTitle } from "../src/lib/ludothek/board-game-title-lookup";
import { statusAfterCheck } from "../src/lib/ludothek/game-copy-checks";
import {
  formatDefectCondition,
  GAME_ISSUE_LABELS,
  type GameIssueKind,
} from "../src/lib/ludothek/game-issue";
import {
  locationKind,
  parseReleaseInventory,
  type ReleaseCheckResult,
  type ReleaseInventoryRow,
} from "./seed-data/release-inventory";
import { ensureUnsortiertUnit } from "./seed-shared";

export const SEED_PROFILES = ["develop", "release"] as const;
export type SeedProfile = (typeof SEED_PROFILES)[number];

/** `SEED_PROFILE` → Profil; ungesetzt = `develop`. Ein Tippfehler bricht ab,
 * statt still Demo-Daten in eine Vereinsinstanz zu schreiben. */
export function resolveSeedProfile(value: string | undefined): SeedProfile {
  const profile = value?.trim() || "develop";
  if (!(SEED_PROFILES as readonly string[]).includes(profile)) {
    throw new Error(
      `Unbekanntes SEED_PROFILE "${profile}" — erlaubt: ${SEED_PROFILES.join(", ")}.`,
    );
  }
  return profile as SeedProfile;
}

/** Relativ zum Arbeitsverzeichnis — lokal das Repo, im Container `/app/db`
 * (das Dockerfile legt die CSV dort unter demselben Pfad ab). */
const DEFAULT_CSV = "prisma/seed-data/release-inventory.csv";

const DEFECT_KIND: Partial<Record<ReleaseCheckResult, GameIssueKind>> = {
  INCOMPLETE: "unvollstaendig",
  UNPLAYABLE: "nicht_spielbar",
};

/** `condition` wie nach einer Kontrolle im Prüfbogen: Mängel mit dem
 * Präfix aus `game-issue.ts`, „Vollständig" nur mit der Notiz. */
export function releaseCondition(
  result: ReleaseCheckResult | null,
  note: string | null,
): string | null {
  const kind = result ? DEFECT_KIND[result] : undefined;
  if (!kind) return note;
  return note ? formatDefectCondition(kind, note) : GAME_ISSUE_LABELS[kind];
}

export function releaseCopySlug(
  row: Pick<ReleaseInventoryRow, "title" | "inventoryNumber">,
) {
  const base = slugify(row.title) || "spiel";
  return row.inventoryNumber === null ? base : `${base}-${row.inventoryNumber}`;
}

/** Zählung zur Mittagszeit (UTC), damit der Tag in `Europe/Berlin` stimmt. */
function checkedAtFor(day: string) {
  return new Date(`${day}T12:00:00.000Z`);
}

/** Ein `StorageUnit` je Standort-Label — vorhandene (nicht ausgemusterte)
 * werden wiederverwendet, neue bekommen den nächsten freien Code. */
async function ensureLocationUnits(labels: string[], keeperMeepleId: string) {
  const idByLabel = new Map<string, string>();
  for (const label of [...new Set(labels)].sort((a, b) =>
    a.localeCompare(b, "de", { numeric: true }),
  )) {
    const kind = StorageUnitKind[locationKind(label)];
    const existing = await prisma.storageUnit.findFirst({
      where: { label, kind, retiredAt: null },
      select: { id: true },
    });
    if (existing) {
      idByLabel.set(label, existing.id);
      continue;
    }
    const codes = await prisma.storageUnit.findMany({
      where: { kind },
      select: { code: true },
    });
    const created = await prisma.storageUnit.create({
      data: {
        code: nextUnitCode(
          kind,
          codes.map((c) => c.code),
        ),
        kind,
        label,
        keeperMeepleId,
      },
    });
    idByLabel.set(label, created.id);
  }
  return idByLabel;
}

/**
 * Release-Seed (#603): legt den echten Vereinsbestand aus
 * `release-inventory.csv` an — Titel, Exemplar, Standort und pro Exemplar
 * genau eine Kontrolle (letzte Zählung), Status über die Regel aus #599.
 * Kontrolleur und Keeper ist das Admin-Meeple.
 *
 * Idempotent über den Exemplar-Slug: vorhandene Exemplare werden
 * übersprungen, nicht aktualisiert — ein zweiter Lauf ändert nichts an
 * bereits erfassten (und evtl. inzwischen kontrollierten) Exemplaren.
 */
export async function seedReleaseInventory(adminMeepleId: string) {
  const csvPath = path.resolve(
    process.env.RELEASE_INVENTORY_CSV ?? DEFAULT_CSV,
  );
  const rows = parseReleaseInventory(fs.readFileSync(csvPath, "utf-8"));

  const unsortiert = await ensureUnsortiertUnit(adminMeepleId);
  const unitIdByLabel = await ensureLocationUnits(
    rows.flatMap((r) => (r.location ? [r.location] : [])),
    adminMeepleId,
  );

  const boardGameIdByKey = new Map<string, string>();
  async function boardGameIdFor(row: ReleaseInventoryRow) {
    const key = row.bggId ? `bgg:${row.bggId}` : `title:${row.title}`;
    const cached = boardGameIdByKey.get(key);
    if (cached) return cached;
    const existing = row.bggId
      ? null
      : await prisma.boardGame.findFirst({
          where: { title: row.title, bggId: null },
          select: { id: true },
        });
    const id =
      existing?.id ??
      (
        await findOrCreateBoardGameTitle({
          title: row.title,
          bggId: row.bggId ?? undefined,
        })
      ).id;
    boardGameIdByKey.set(key, id);
    return id;
  }

  let created = 0;
  let checks = 0;
  for (const row of rows) {
    const slug = releaseCopySlug(row);
    if (await prisma.gameCopy.findUnique({ where: { slug } })) continue;

    const boardGameId = await boardGameIdFor(row);
    const checkedAt = row.lastCheckedOn
      ? checkedAtFor(row.lastCheckedOn)
      : null;
    const result = row.result ? GameCopyCheckResult[row.result] : null;
    const condition = releaseCondition(row.result, row.note);
    const status = row.deinventarised
      ? GameInventoryStatus.DEINVENTARISED
      : result
        ? statusAfterCheck(result, GameInventoryStatus.ACTIVE)
        : GameInventoryStatus.ACTIVE;

    await prisma.$transaction(async (tx) => {
      const copy = await tx.gameCopy.create({
        data: {
          slug,
          boardGameId,
          inventoryNumber: row.inventoryNumber,
          condition,
          ruleBookLanguages: row.englishRules ? [RuleBookLanguage.EN] : [],
          lastCheckedAt: result ? checkedAt : null,
          status,
          ...(row.deinventarised
            ? {
                archivedAt: checkedAt ?? new Date(),
                archivedReason: "Laut Inventar-Tabelle deinventarisiert.",
              }
            : {}),
        },
      });
      await tx.gameHolding.create({
        data: {
          gameCopyId: copy.id,
          unitId: row.location
            ? (unitIdByLabel.get(row.location) ?? unsortiert.id)
            : unsortiert.id,
          origin: HoldingOrigin.INITIAL,
          confirmedAt: new Date(),
          recordedByMeepleId: adminMeepleId,
        },
      });
      if (result && checkedAt) {
        await tx.gameCopyCheck.create({
          data: {
            gameCopyId: copy.id,
            checkedByMeepleId: adminMeepleId,
            checkedAt,
            result,
            note: condition,
          },
        });
        checks += 1;
      }
    });
    created += 1;
  }

  console.log(
    `Release-Bestand: ${created} Exemplare angelegt (${checks} Kontrollen, ${boardGameIdByKey.size} Titel), ${rows.length - created} bereits vorhanden übersprungen.`,
  );
}
