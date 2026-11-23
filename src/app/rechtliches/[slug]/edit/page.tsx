import { notFound } from "next/navigation";
import { LEGAL_DOCS } from "@/data/downloads";
import type { LegalSection } from "@/data/legal";
import { requireAdminPermission } from "@/lib/auth/session";
import { getLegalDocument } from "@/lib/legal/legal";
import { LegalDocEditView } from "@/components/feature/rechtliches/legal-doc-edit-view";

export default async function LegalDocEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireAdminPermission("legal:manage");

  const definition = LEGAL_DOCS.find((doc) => doc.slug === slug);
  if (!definition) notFound();

  const existing = await getLegalDocument(slug);

  return (
    <LegalDocEditView
      doc={{
        slug,
        title: existing?.title ?? definition.title,
        sections: (existing?.sections as LegalSection[] | undefined) ?? [],
        pdfFileUrl: existing?.pdfFileUrl ?? null,
      }}
    />
  );
}
