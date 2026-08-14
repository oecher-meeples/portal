import { prisma } from "@/lib/utils/prisma";
import { LEGAL_DOCS } from "@/data/downloads";

/** Public-facing lookup for /rechtliches/[slug] — `null` for an unknown slug. */
export async function getLegalDocument(slug: string) {
  return prisma.legalDocument.findUnique({ where: { slug } });
}

/**
 * All four Rechtliches documents (e.g. for the Downloads page's Legal
 * table), in the fixed `LEGAL_DOCS` order rather than DB insertion order —
 * the four slugs are fixed (see the plan's Abgrenzung), so the presentation
 * order should be fixed too, not depend on when each row was seeded/upserted.
 */
export async function listAllLegalDocuments() {
  const documents = await prisma.legalDocument.findMany();
  const bySlug = new Map(documents.map((doc) => [doc.slug, doc]));

  return LEGAL_DOCS.map((doc) => bySlug.get(doc.slug)).filter(
    (doc): doc is NonNullable<typeof doc> => doc !== undefined,
  );
}
