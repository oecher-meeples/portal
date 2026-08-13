import { notFound } from "next/navigation";
import { LEGAL_DOCS } from "@/data/downloads";
import type { LegalSection } from "@/data/legal";
import { getLegalDocument } from "@/lib/legal/legal";
import { LegalDocView } from "@/components/feature/rechtliches/legal-doc-view";

export function generateStaticParams() {
  return LEGAL_DOCS.map((doc) => ({ slug: doc.slug }));
}

export default async function LegalDocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const legalDoc = await getLegalDocument(slug);
  if (!legalDoc) notFound();

  return (
    <LegalDocView
      doc={{ slug: legalDoc.slug, title: legalDoc.title }}
      sections={legalDoc.sections as LegalSection[]}
      pdfFileUrl={legalDoc.pdfFileUrl ?? undefined}
    />
  );
}
