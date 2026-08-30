import { hashPassword } from "better-auth/crypto";
import {
  BoardGameKind,
  HoldingOrigin,
  InstagramStatus,
  StorageUnitKind,
} from "@prisma/client";
import { prisma } from "../src/lib/utils/prisma";
import { slugify } from "../src/lib/utils/slug";
import { UNSORTIERT_CODE } from "../src/lib/inventory/codes";
import {
  findOrCreateBoardGameTitle,
  uniqueBoardGameSlug,
} from "../src/lib/ludothek/board-game-title-lookup";
import { DEMO_GAMES } from "./seed-data/demo-games";
import { DEMO_EXPANSIONS } from "./seed-data/demo-expansions";
import { DEMO_PRIVATE_COLLECTION_POOL } from "./seed-data/demo-private-collection";
import { DEMO_DOWNLOADS } from "./seed-data/demo-downloads";
import { DEMO_LEGAL_DOCUMENTS } from "./seed-data/demo-legal-documents";
import { DEMO_POSTS } from "./seed-data/demo-posts";
import { seedPermissions, seedRoles, assignRole } from "./seed-roles";
import { ANONYMER_MEEPLE_NAME } from "../src/lib/ludothek/anonymer-meeple";

/** Gets a second `GameCopy` in the seed, so the multi-exemplar EAN-scan flow is
 * manually testable without a real second purchase. */
const DEMO_SECOND_COPY_TITLES = ["Catan"];

const ADMIN_USER = {
  email: process.env.SEED_ADMIN_EMAIL ?? "admin@jan-herwig.de",
  password: process.env.SEED_ADMIN_PASSWORD ?? "admin",
  name: "Admin",
};

const DEMO_MEEPLE_1 = {
  email: process.env.SEED_DEMO_MEEPLE_1_EMAIL ?? "demo1@jan-herwig.de",
  password: process.env.SEED_DEMO_PASSWORD ?? "demo1234",
  name: "Lea Demo",
};

const DEMO_MEEPLE_2 = {
  email: process.env.SEED_DEMO_MEEPLE_2_EMAIL ?? "demo2@jan-herwig.de",
  password: process.env.SEED_DEMO_MEEPLE_2_PASSWORD ?? "demo1234",
  name: "Tobias Demo",
};

/**
 * Ein Demo-Account je Vereinsamt, damit sich jede Rolle ohne Rechte-Rätselraten
 * durchklicken lässt — Name ist zugleich der Rollenname (siehe seed-roles.ts).
 */
const DEMO_ROLE_ACCOUNTS = [
  "Vorstand",
  "Kassenwart",
  "Spielewart",
  "Redakteur",
].map((name) => ({
  name,
  role: name,
  email: `${name.toLowerCase()}@oecher-meeples.org`,
  password: process.env.SEED_DEMO_PASSWORD ?? "demo1234",
}));

async function upsertNeonAuthUser({
  email,
  password,
  name,
}: {
  email: string;
  password: string;
  name: string;
}) {
  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM neon_auth."user" WHERE email = ${email}
  `;
  if (existing.length > 0) {
    console.log(`Neon-Auth-User "${email}" existiert bereits, überspringe.`);
    return existing[0].id;
  }

  const hashedPassword = await hashPassword(password);

  const [user] = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO neon_auth."user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), ${name}, ${email}, true, now(), now())
    RETURNING id
  `;

  await prisma.$executeRaw`
    INSERT INTO neon_auth."account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), ${user.id}, 'credential', ${user.id}::uuid, ${hashedPassword}, now(), now())
  `;

  console.log(`Neon-Auth-Test-User "${email}" angelegt (id: ${user.id}).`);
  return user.id;
}

async function ensureAdminMeeple(neonAuthUserId: string) {
  return prisma.meeple.upsert({
    where: { neonAuthUserId },
    update: {},
    create: { neonAuthUserId, displayName: ADMIN_USER.name },
  });
}

async function ensureMeeple(neonAuthUserId: string, displayName: string) {
  return prisma.meeple.upsert({
    where: { neonAuthUserId },
    update: {},
    create: { neonAuthUserId, displayName },
  });
}

/** Kein Unique-Feld erlaubt hier ein Upsert: `neonAuthUserId` ist `null` (kein
 * Login), und mehrere `NULL`-Zeilen sind in Postgres zulässig — also
 * find-or-create über den Displaynamen, statt (fälschlich) auf `neonAuthUserId`
 * zu upserten und dabei bei jedem Lauf eine weitere Zeile anzulegen. */
/**
 * Dauerhaftes Sammelkonto "Anonymer Meeple" (#333) — Ziel jeder "an extern
 * weitergegeben"-Aktion, deren Empfänger:in kein eigenes Vereinsmitglied ist.
 * Kein Login (`neonAuthUserId: null`), keine echten Personendaten. Bekommt
 * trotzdem eine begleitende `Member`-Zeile (bewusste Modellierungs-
 * entscheidung, siehe Kommentar in `holdings.ts` bei `handOverToExternal()`):
 * `GameHolding.vereinsmitgliedId` ist nicht nullable-für-Freitext gebaut,
 * daher braucht auch dieses Sammelkonto ein `Member`-Ziel — ohne
 * `firstName`/`lastName`/Adresse, nur zum Halten der Fremdschlüssel-Referenz.
 */
async function ensureAnonymerMeeple() {
  const meeple =
    (await prisma.meeple.findFirst({
      where: { displayName: ANONYMER_MEEPLE_NAME, neonAuthUserId: null },
    })) ??
    (await prisma.meeple.create({
      data: { displayName: ANONYMER_MEEPLE_NAME },
    }));

  const existingMember = await prisma.member.findUnique({
    where: { meepleId: meeple.id },
  });
  if (existingMember) return { meeple, member: existingMember };

  const highestNumber = await prisma.member.aggregate({
    _max: { memberNumber: true },
  });
  const member = await prisma.member.create({
    data: {
      memberNumber: (highestNumber._max.memberNumber ?? 0) + 1,
      email: "anonymer-meeple@oecher-meeples.invalid",
      meepleId: meeple.id,
    },
  });

  return { meeple, member };
}

/**
 * Steht für den BGG-Import ein, solange der aus dieser Umgebung nicht erreichbar ist
 * (401/403 auf jede Anfrage an boardgamegeek.com). Titel, Spielerzahlen und Coverbilder
 * sind reale, per Wikipedia verifizierte Daten — kein BGG-Import, aber echte Spiele.
 */
async function createDemoGameCopy(
  boardGameId: string,
  title: string,
  unitId: string,
  adminMeepleId: string,
  usedSlugs: Set<string>,
) {
  const base = slugify(title);
  let slug = base;
  let suffix = 2;
  while (usedSlugs.has(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  usedSlugs.add(slug);

  const copy = await prisma.gameCopy.create({ data: { slug, boardGameId } });

  await prisma.gameHolding.create({
    data: {
      gameCopyId: copy.id,
      unitId,
      origin: HoldingOrigin.INITIAL,
      confirmedAt: new Date(),
      recordedByMeepleId: adminMeepleId,
    },
  });

  return copy;
}

async function seedDemoGames(adminMeepleId: string, keeperMeepleId: string) {
  const unsortiert = await prisma.storageUnit.upsert({
    where: { code: UNSORTIERT_CODE },
    update: { keeperMeepleId },
    create: {
      code: UNSORTIERT_CODE,
      kind: StorageUnitKind.BOX,
      label: "Unsortiert",
      keeperMeepleId,
    },
  });

  const existingTitles = await prisma.boardGame.findMany({
    where: { title: { in: DEMO_GAMES.map((g) => g.title) } },
    select: { id: true, title: true },
  });
  const existingIdByTitle = new Map(existingTitles.map((g) => [g.title, g.id]));
  const usedSlugs = new Set(
    (await prisma.gameCopy.findMany({ select: { slug: true } })).map(
      (c) => c.slug,
    ),
  );
  const expansionTitles = new Set(DEMO_EXPANSIONS.map((e) => e.expansion));
  const gameIdByTitle = new Map<string, string>(existingIdByTitle);

  let createdTitleCount = 0;
  let createdCopyCount = 0;

  for (const game of DEMO_GAMES) {
    // `gameIdByTitle` (unlike `existingIdByTitle`) also picks up titles
    // created earlier in *this* loop — guards against an accidental
    // duplicate title within `DEMO_GAMES` itself, not just against titles
    // already in the DB from a previous run (see #183 follow-up: two
    // separate "Catan" entries silently created two separate titles).
    if (gameIdByTitle.has(game.title)) continue;

    const slug = await uniqueBoardGameSlug(prisma, game.title);
    const created = await prisma.boardGame.create({
      data: {
        title: game.title,
        slug,
        imageUrl: game.imageUrl,
        minPlayers: game.minPlayers,
        maxPlayers: game.maxPlayers,
        playTimeMinutes: game.playTimeMinutes,
        weight: game.weight,
        description: game.description,
        mechanics: game.mechanics,
        kind: expansionTitles.has(game.title)
          ? BoardGameKind.BOARDGAME_EXPANSION
          : BoardGameKind.BOARDGAME,
      },
    });
    gameIdByTitle.set(game.title, created.id);
    createdTitleCount += 1;

    const copiesToCreate = DEMO_SECOND_COPY_TITLES.includes(game.title) ? 2 : 1;
    for (let i = 0; i < copiesToCreate; i += 1) {
      await createDemoGameCopy(
        created.id,
        game.title,
        unsortiert.id,
        adminMeepleId,
        usedSlugs,
      );
      createdCopyCount += 1;
    }
  }

  console.log(
    `${createdTitleCount} Demo-Titel angelegt (${createdCopyCount} Exemplare), ${DEMO_GAMES.length - createdTitleCount} Titel bereits vorhanden übersprungen.`,
  );

  for (const { baseGame, expansion } of DEMO_EXPANSIONS) {
    const baseGameId = gameIdByTitle.get(baseGame);
    const expansionId = gameIdByTitle.get(expansion);
    if (!baseGameId || !expansionId) {
      console.warn(
        `Überspringe GameCollection "${expansion}" → "${baseGame}": Titel nicht gefunden.`,
      );
      continue;
    }
    await prisma.gameCollection.upsert({
      where: { baseGameId_expansionId: { baseGameId, expansionId } },
      update: {},
      create: { baseGameId, expansionId },
    });
  }

  console.log(`${DEMO_EXPANSIONS.length} Erweiterungs-Zuordnungen angelegt.`);
}

/**
 * Seeds two demo meeples with 30 entries each from `DEMO_PRIVATE_COLLECTION_POOL`,
 * standing in for a real BGG collection sync (blocked in this environment, see
 * the comment above `seedDemoGames`). Upserts on `[meepleId, bggId]`, so re-running
 * the seed is idempotent.
 */
async function seedPrivateGameCollection(
  meepleId: string,
  pool: typeof DEMO_PRIVATE_COLLECTION_POOL,
) {
  for (const game of pool) {
    // Same title find-or-create (by bggId) as the club Ludothek — a private
    // entry and a club copy of the same BGG title share one BoardGame row.
    const title = await findOrCreateBoardGameTitle({
      title: game.title,
      bggId: game.bggId,
      imageUrl: game.imageUrl,
      minPlayers: game.minPlayers,
      maxPlayers: game.maxPlayers,
      playTimeMinutes: game.playTimeMinutes,
    });

    await prisma.privateGameCollectionEntry.upsert({
      where: {
        meepleId_boardGameId: { meepleId, boardGameId: title.id },
      },
      update: { syncedAt: new Date() },
      create: { meepleId, boardGameId: title.id, syncedAt: new Date() },
    });
  }

  console.log(
    `${pool.length} private Sammlungseinträge für Meeple ${meepleId} angelegt.`,
  );
}

async function seedDemoMeeples() {
  const [user1Id, user2Id] = await Promise.all([
    upsertNeonAuthUser(DEMO_MEEPLE_1),
    upsertNeonAuthUser(DEMO_MEEPLE_2),
  ]);
  await Promise.all([
    assignRole(user1Id, "Meeple"),
    assignRole(user2Id, "Meeple"),
  ]);

  const [meeple1, meeple2] = await Promise.all([
    ensureMeeple(user1Id, DEMO_MEEPLE_1.name),
    ensureMeeple(user2Id, DEMO_MEEPLE_2.name),
  ]);

  await seedPrivateGameCollection(
    meeple1.id,
    DEMO_PRIVATE_COLLECTION_POOL.slice(0, 30),
  );
  await seedPrivateGameCollection(
    meeple2.id,
    DEMO_PRIVATE_COLLECTION_POOL.slice(30, 60),
  );
}

/**
 * Ein Account je Vereinsamt (DEMO_ROLE_ACCOUNTS) — Login zum Durchklicken jeder Rolle.
 * Gibt die Meeple-Id je Rolle zurück, z. B. damit `seedDemoGames` die
 * Unsortiert-Einheit dem Kassenwart als Keeper zuweisen kann.
 */
async function seedDemoRoleAccounts() {
  const meepleIdByRole = new Map<string, string>();

  for (const account of DEMO_ROLE_ACCOUNTS) {
    const userId = await upsertNeonAuthUser(account);
    await assignRole(userId, account.role);
    const meeple = await ensureMeeple(userId, account.name);
    meepleIdByRole.set(account.role, meeple.id);
  }

  console.log(
    `${DEMO_ROLE_ACCOUNTS.length} Rollen-Demo-Accounts angelegt/übersprungen.`,
  );

  return meepleIdByRole;
}

/** Upsertet auf `slug`, damit ein Re-Seed die Demo-Beiträge nicht dupliziert. */
async function seedDemoPosts() {
  for (const post of DEMO_POSTS) {
    await prisma.post.upsert({
      where: { slug: post.slug },
      update: {},
      create: {
        slug: post.slug,
        type: post.type,
        title: post.title,
        excerpt: post.excerpt,
        body: post.body,
        date: new Date(post.date),
        author: post.author,
        location: post.location,
        internal: post.internal,
        instagram: post.instagram,
        coverImageUrl: post.coverImageUrl,
        instagramStatus: post.instagram ? InstagramStatus.PENDING : null,
      },
    });
  }

  console.log(`${DEMO_POSTS.length} Demo-Beiträge angelegt/übersprungen.`);
}

/** Upsertet auf `fileUrl`, damit ein Re-Seed die migrierten Bestandsdateien nicht dupliziert. */
async function seedDemoDownloads() {
  for (const download of DEMO_DOWNLOADS) {
    await prisma.download.upsert({
      where: { fileUrl: download.fileUrl },
      update: {},
      create: download,
    });
  }

  console.log(`${DEMO_DOWNLOADS.length} Downloads angelegt/übersprungen.`);
}

/** Upsertet auf `slug`, damit ein Re-Seed die migrierten Rechtliches-Inhalte nicht dupliziert. */
async function seedDemoLegalDocuments() {
  for (const doc of DEMO_LEGAL_DOCUMENTS) {
    await prisma.legalDocument.upsert({
      where: { slug: doc.slug },
      update: {},
      create: doc,
    });
  }

  console.log(
    `${DEMO_LEGAL_DOCUMENTS.length} Rechtliches-Dokumente angelegt/übersprungen.`,
  );
}

async function main() {
  const adminUserId = await upsertNeonAuthUser(ADMIN_USER);
  await seedPermissions();
  await seedRoles();
  await assignRole(adminUserId, "sysadmin");

  const adminMeeple = await ensureAdminMeeple(adminUserId);
  const meepleIdByRole = await seedDemoRoleAccounts();
  const spielewartMeepleId = meepleIdByRole.get("Spielewart");
  if (!spielewartMeepleId) {
    throw new Error("Spielewart-Demo-Account wurde nicht angelegt.");
  }
  await seedDemoGames(adminMeeple.id, spielewartMeepleId);
  await seedDemoMeeples();
  await ensureAnonymerMeeple();
  await seedDemoPosts();
  await seedDemoDownloads();
  await seedDemoLegalDocuments();

  console.log("Seed abgeschlossen.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
