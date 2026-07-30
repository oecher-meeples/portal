import { pathToFileURL } from "node:url";
import { HoldingOrigin, StorageUnitKind } from "@prisma/client";
import { prisma } from "../src/lib/utils/prisma";
import { nextUnitCode } from "../src/lib/inventory/codes";
import { ensureUnsortiertUnit } from "../src/lib/ludothek/holdings";

const DRY_RUN = process.argv.includes("--dry-run");

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function findOrCreateSystemMeeple() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@jan-herwig.de";

  const existing = await prisma.meeple.findFirst({
    where: { email: adminEmail },
  });
  if (existing) return existing;

  const [authUser] = await prisma.$queryRaw<{ id: string; name: string }[]>`
    SELECT id, name FROM neon_auth."user" WHERE email = ${adminEmail}
  `;
  if (!authUser) {
    throw new Error(
      `Kein Neon-Auth-Konto für ${adminEmail} gefunden. \`pnpm db:seed\` zuerst ausführen.`,
    );
  }

  return prisma.meeple.upsert({
    where: { neonAuthUserId: authUser.id },
    update: {},
    create: {
      neonAuthUserId: authUser.id,
      displayName: authUser.name || "Admin",
      email: adminEmail,
    },
  });
}

/** One box per distinct legacy location freetext, reusing an existing box if already migrated. */
async function ensureUnitForLocation(
  locationNote: string,
  existingCodes: string[],
) {
  const existing = await prisma.storageUnit.findFirst({
    where: { locationNote, keeperMeepleId: null },
  });
  if (existing) return existing;

  const code = nextUnitCode(StorageUnitKind.BOX, existingCodes);
  existingCodes.push(code);

  return prisma.storageUnit.create({
    data: {
      code,
      kind: StorageUnitKind.BOX,
      label: locationNote,
      locationNote,
    },
  });
}

async function uniqueSlug(base: string, taken: Set<string>) {
  let slug = base;
  let suffix = 2;
  while (
    taken.has(slug) ||
    (await prisma.boardGame.findFirst({ where: { slug } }))
  ) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  taken.add(slug);
  return slug;
}

export async function migrateBoardGamesToHoldings({
  dryRun = DRY_RUN,
}: { dryRun?: boolean } = {}) {
  console.log(dryRun ? "Trockenlauf — es wird nichts geschrieben.\n" : "");

  const games = await prisma.boardGame.findMany({
    include: { _count: { select: { holdings: true } } },
  });

  const alreadyMigrated = games.filter((g) => g._count.holdings > 0);
  const toMigrate = games.filter((g) => g._count.holdings === 0);

  console.log(
    `${games.length} Spiele insgesamt, ${alreadyMigrated.length} bereits migriert, ${toMigrate.length} zu migrieren.`,
  );

  if (toMigrate.length === 0) {
    console.log("Nichts zu tun.");
    return { holdingsCreated: 0, copiesCreated: 0, unitsCreated: 0 };
  }

  if (dryRun) {
    for (const game of toMigrate) {
      const copies = Math.max(game.quantity, 1);
      console.log(
        `${game.title}: ${copies} Datensatz/Datensätze, Standort "${game.location ?? "Unsortiert"}"`,
      );
    }
    return { holdingsCreated: 0, copiesCreated: 0, unitsCreated: 0 };
  }

  const systemMeeple = await findOrCreateSystemMeeple();
  const unsortiert = await ensureUnsortiertUnit();

  const existingBoxCodes = (
    await prisma.storageUnit.findMany({
      where: { kind: StorageUnitKind.BOX },
      select: { code: true },
    })
  ).map((u) => u.code);

  const unitByLocation = new Map<string, string>();
  const takenSlugs = new Set<string>();
  let createdHoldings = 0;
  let createdCopies = 0;

  for (const game of toMigrate) {
    const locationNote = game.location?.trim() || null;

    let unitId = unsortiert.id;
    if (locationNote) {
      if (!unitByLocation.has(locationNote)) {
        const unit = await ensureUnitForLocation(
          locationNote,
          existingBoxCodes,
        );
        unitByLocation.set(locationNote, unit.id);
      }
      unitId = unitByLocation.get(locationNote)!;
    }

    const copies = Math.max(game.quantity, 1);
    const baseSlug = slugify(game.title) || game.slug;

    for (let i = 0; i < copies; i++) {
      const targetGameId =
        i === 0
          ? game.id
          : (
              await prisma.boardGame.create({
                data: {
                  slug: await uniqueSlug(baseSlug, takenSlugs),
                  title: game.title,
                  bggId: game.bggId,
                  ean: game.ean,
                  minPlayers: game.minPlayers,
                  maxPlayers: game.maxPlayers,
                  playTimeMinutes: game.playTimeMinutes,
                  weight: game.weight,
                  imageUrl: game.imageUrl,
                  description: game.description,
                  mechanics: game.mechanics,
                  quantity: 1,
                  condition: game.condition,
                  status: game.status,
                },
              })
            ).id;

      if (i === 0) {
        takenSlugs.add(game.slug);
        await prisma.boardGame.update({
          where: { id: game.id },
          data: { quantity: 1 },
        });
      } else {
        createdCopies += 1;
      }

      await prisma.gameHolding.create({
        data: {
          boardGameId: targetGameId,
          unitId,
          origin: HoldingOrigin.INITIAL,
          confirmedAt: new Date(),
          recordedByMeepleId: systemMeeple.id,
        },
      });
      createdHoldings += 1;
    }
  }

  console.log(
    `${createdHoldings} Aufenthalte angelegt, ${createdCopies} zusätzliche Spiel-Datensätze aus quantity > 1, ${unitByLocation.size} Kartons aus Standort-Freitext.`,
  );

  return {
    holdingsCreated: createdHoldings,
    copiesCreated: createdCopies,
    unitsCreated: unitByLocation.size,
  };
}

const isEntryPoint =
  !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntryPoint) {
  migrateBoardGamesToHoldings()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
