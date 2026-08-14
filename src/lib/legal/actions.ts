"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { prisma } from "@/lib/utils/prisma";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/permissions";
import { normaliseBlobPath } from "@/lib/utils/blob-path";
import { deleteBlobs } from "@/lib/utils/blob-delete";
import { extractPdfText } from "@/lib/legal/pdf-extract";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/** Mirrors `LegalSection` from src/data/legal.ts — the DB column is `Json`, so
 * this is the only place invalid shapes get caught before they reach the DB. */
const legalSectionSchema = z.object({
  id: z.string().min(1),
  heading: z.string().min(1),
  paragraphs: z.array(z.string()),
  links: z
    .array(z.object({ label: z.string().min(1), href: z.string().min(1) }))
    .optional(),
});

const legalSectionsSchema = z.array(legalSectionSchema);

async function requireManagePermission() {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user.id, "legal:manage"))) {
    return { error: "Keine Berechtigung." } as const;
  }
  return null;
}

function revalidateLegalPaths(slug: string) {
  revalidatePath(`/rechtliches/${slug}`);
  revalidatePath(`/rechtliches/${slug}/edit`);
  revalidatePath("/downloads");
}

export async function getLegalUploadToken(pathname: string) {
  const forbidden = await requireManagePermission();
  if (forbidden) throw new Error(forbidden.error);

  return generateClientTokenFromReadWriteToken({
    pathname: normaliseBlobPath(pathname, "legal"),
    allowedContentTypes: ["application/pdf"],
    addRandomSuffix: true,
    maximumSizeInBytes: MAX_UPLOAD_BYTES,
  });
}

/** Returns the raw extracted text for the admin to read and copy-paste into
 * the sections editor — never written to the DB by itself. */
export async function extractLegalPdfText(fileUrl: string) {
  const forbidden = await requireManagePermission();
  if (forbidden) return forbidden;

  const text = await extractPdfText(fileUrl);
  return { success: true as const, text };
}

export async function saveLegalDocument(
  slug: string,
  title: string,
  sections: unknown,
  pdfFileUrl?: string,
) {
  const forbidden = await requireManagePermission();
  if (forbidden) return forbidden;

  const parsedSections = legalSectionsSchema.safeParse(sections);
  if (!parsedSections.success) {
    return { error: "Ungültiges Format der Sections." };
  }

  const existing = await prisma.legalDocument.findUnique({
    where: { slug },
    select: { pdfFileUrl: true },
  });

  await prisma.legalDocument.upsert({
    where: { slug },
    update: { title, sections: parsedSections.data, pdfFileUrl },
    create: { slug, title, sections: parsedSections.data, pdfFileUrl },
  });

  if (existing?.pdfFileUrl && existing.pdfFileUrl !== pdfFileUrl) {
    await deleteBlobs([existing.pdfFileUrl]);
  }

  revalidateLegalPaths(slug);
  return { success: true as const };
}
