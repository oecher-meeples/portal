import { PrivateCollectionImportStatus } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { runBggCollectionImport } from "@/lib/ludothek/private-collection-import";

/** Ein `RUNNING`-Job ohne Abschluss nach dieser Zeit gilt als abgestürzt
 * (Neustart mitten im Import) und wird erneut eingereiht. */
const STALE_RUNNING_MS = 30 * 60 * 1000;
/** Obergrenze pro Worker-Lauf, damit ein Cron-Request nicht ewig hängt. */
const MAX_JOBS_PER_RUN = 5;

const ACTIVE_STATUSES = [
  PrivateCollectionImportStatus.PENDING,
  PrivateCollectionImportStatus.RUNNING,
];

/** Reiht einen Import ein (#632). Läuft für das Meeple schon einer, wird kein
 * zweiter angelegt — `created: false`. */
export async function enqueuePrivateCollectionImport(meepleId: string) {
  const active = await prisma.privateCollectionImportJob.findFirst({
    where: { meepleId, status: { in: ACTIVE_STATUSES } },
    select: { id: true },
  });
  if (active) return { created: false as const, jobId: active.id };
  const job = await prisma.privateCollectionImportJob.create({
    data: { meepleId },
    select: { id: true },
  });
  return { created: true as const, jobId: job.id };
}

/** Jüngster Job eines Meeples — speist die Statusanzeige auf dem Profil. */
export function getLatestPrivateCollectionImportJob(meepleId: string) {
  return prisma.privateCollectionImportJob.findFirst({
    where: { meepleId },
    orderBy: { requestedAt: "desc" },
    select: {
      status: true,
      importedCount: true,
      error: true,
      requestedAt: true,
      finishedAt: true,
    },
  });
}

async function requeueStaleJobs() {
  await prisma.privateCollectionImportJob.updateMany({
    where: {
      status: PrivateCollectionImportStatus.RUNNING,
      startedAt: { lt: new Date(Date.now() - STALE_RUNNING_MS) },
    },
    data: { status: PrivateCollectionImportStatus.PENDING, startedAt: null },
  });
}

/** Holt den ältesten wartenden Job und markiert ihn atomar als `RUNNING` —
 * `updateMany` mit Status-Bedingung, damit `after()` und Cron nie denselben
 * Job doppelt bearbeiten. */
async function claimNextJob(): Promise<{
  id: string;
  meeple: { id: string; bggUsername: string | null };
} | null> {
  const candidate = await prisma.privateCollectionImportJob.findFirst({
    where: { status: PrivateCollectionImportStatus.PENDING },
    orderBy: { requestedAt: "asc" },
    select: { id: true, meeple: { select: { id: true, bggUsername: true } } },
  });
  if (!candidate) return null;
  const { count } = await prisma.privateCollectionImportJob.updateMany({
    where: { id: candidate.id, status: PrivateCollectionImportStatus.PENDING },
    data: {
      status: PrivateCollectionImportStatus.RUNNING,
      startedAt: new Date(),
    },
  });
  return count === 1 ? candidate : claimNextJob();
}

async function finishJob(
  id: string,
  outcome: { importedCount: number } | { error: string },
) {
  await prisma.privateCollectionImportJob.update({
    where: { id },
    data: {
      finishedAt: new Date(),
      ...("error" in outcome
        ? { status: PrivateCollectionImportStatus.FAILED, error: outcome.error }
        : {
            status: PrivateCollectionImportStatus.DONE,
            importedCount: outcome.importedCount,
            error: null,
          }),
    },
  });
}

/** Arbeitet wartende Importe nacheinander ab. Aufrufer: `after()` direkt nach
 * dem Klick und der minütliche Cron als Fallback. Wirft nie — ein Fehler
 * wird am Job vermerkt, nicht an den Aufrufer weitergereicht. */
export async function processPrivateCollectionImportQueue() {
  await requeueStaleJobs();
  let processed = 0;
  while (processed < MAX_JOBS_PER_RUN) {
    const job = await claimNextJob();
    if (!job) break;
    processed += 1;
    if (!job.meeple.bggUsername) {
      await finishJob(job.id, { error: "Kein BGG-Benutzername hinterlegt." });
      continue;
    }
    try {
      const result = await runBggCollectionImport({
        id: job.meeple.id,
        bggUsername: job.meeple.bggUsername,
      });
      await finishJob(
        job.id,
        "error" in result
          ? { error: result.error }
          : { importedCount: result.imported },
      );
    } catch (error) {
      console.error("[private-collection-import]", error);
      await finishJob(job.id, { error: "Import fehlgeschlagen." });
    }
  }
  return { processed };
}
