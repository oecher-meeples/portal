import { prisma } from "@/lib/utils/prisma";

/** Reihenfolge nach Erstellungsdatum — keine manuelle Sortierung (siehe #110). */
export async function listImportantLinks() {
  return prisma.importantLink.findMany({ orderBy: { createdAt: "asc" } });
}

export type ImportantLinkRow = Awaited<
  ReturnType<typeof listImportantLinks>
>[number];
