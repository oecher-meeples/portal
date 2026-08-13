import { notFound } from "next/navigation";
import { LEGAL_DOCS } from "@/data/downloads";
import type { LegalSection } from "@/data/legal";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermissionInCurrentView } from "@/lib/auth/session";
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
  const [legalDoc, user] = await Promise.all([
    getLegalDocument(slug),
    getCurrentUser(),
  ]);
  if (!legalDoc) notFound();

  const canManage = user
    ? await hasPermissionInCurrentView(user.id, "legal:manage")
    : false;

  return (
    <LegalDocView
      doc={{ slug: legalDoc.slug, title: legalDoc.title }}
      sections={legalDoc.sections as LegalSection[]}
      pdfFileUrl={legalDoc.pdfFileUrl ?? undefined}
      canManage={canManage}
    />
  );
}
