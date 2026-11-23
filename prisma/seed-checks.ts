import { GameInventoryStatus } from "@prisma/client";
import { prisma } from "../src/lib/utils/prisma";
import { statusAfterCheck } from "../src/lib/ludothek/game-copy-checks";
import { planDemoChecks, type DemoCheck } from "./seed-data/demo-checks";

/**
 * Demo-Kontrollen (#599, siehe `seed-data/demo-checks.ts`), alle vom
 * Demo-Spielewart. Idempotent: die Kontrollen des Demo-Spielewarts werden
 * vor dem Anlegen gelöscht — er ist ein reines Demo-Konto, reale Kontrollen
 * hängen nie an ihm. `GameCopy.status`/`condition`/`lastCheckedAt` folgen
 * der jeweils neuesten Kontrolle, nach derselben Regel wie die App.
 */
export async function seedDemoChecks(spielewartMeepleId: string) {
  // Nur Exemplare im Lager — ein ausgeliehenes Exemplar in „Wartung" wäre
  // ein unplausibler Demo-Zustand.
  const copies = await prisma.gameCopy.findMany({
    where: {
      status: { not: GameInventoryStatus.DEINVENTARISED },
      holdings: { some: { endedAt: null, unitId: { not: null } } },
    },
    orderBy: { slug: "asc" },
    select: { id: true, status: true },
  });
  const checks = planDemoChecks(
    copies.map((copy) => copy.id),
    new Date(),
  );

  const latestByCopy = new Map<string, DemoCheck>();
  for (const check of checks) latestByCopy.set(check.gameCopyId, check);

  await prisma.$transaction([
    prisma.gameCopyCheck.deleteMany({
      where: { checkedByMeepleId: spielewartMeepleId },
    }),
    prisma.gameCopyCheck.createMany({
      data: checks.map((check) => ({
        ...check,
        checkedByMeepleId: spielewartMeepleId,
      })),
    }),
    ...copies
      .filter((copy) => latestByCopy.has(copy.id))
      .map((copy) => {
        const latest = latestByCopy.get(copy.id)!;
        return prisma.gameCopy.update({
          where: { id: copy.id },
          data: {
            condition: latest.note,
            lastCheckedAt: latest.checkedAt,
            needsCompletenessCheck: false,
            // Ausgangsstatus `ACTIVE`: ein früherer Seed-Lauf hat das
            // Exemplar evtl. schon in `MAINTENANCE` gesetzt.
            status: statusAfterCheck(latest.result, GameInventoryStatus.ACTIVE),
          },
        });
      }),
  ]);

  console.log(
    `${checks.length} Demo-Kontrollen für ${latestByCopy.size} Exemplare angelegt.`,
  );
}
